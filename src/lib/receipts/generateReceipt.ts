import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type ReceiptItem = {
  name: string;
  qty: number;
  price_cents: number;
  size?: string | null;
  color?: string | null;
};

type ReceiptOrder = {
  order_id?: string | null;
  created_at?: string | null;
  total_cents?: number | null;
  items?: unknown;
  customer?: unknown;
};

type ReceiptCustomer = {
  name?: string | null;
  delivery_fee_cents?: number | null;
};

function money(cents: number) {
  return `NGN ${(cents / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Standard PDF fonts only support WinAnsi; strip anything else so we never throw.
function safe(text: string) {
  return (text ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "").trim();
}

export async function generateAndUploadReceipt(order: ReceiptOrder) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items: ReceiptItem[] = rawItems.map((raw) => {
    const item = (raw ?? {}) as Partial<ReceiptItem>;
    return {
      name: String(item.name ?? ""),
      qty: Number(item.qty ?? 0),
      price_cents: Number(item.price_cents ?? 0),
      size: item.size ?? null,
      color: item.color ?? null,
    };
  });

  const customer = (order.customer ?? {}) as ReceiptCustomer;
  const subtotal = items.reduce((sum, i) => sum + i.price_cents * i.qty, 0);
  const deliveryFee = customer.delivery_fee_cents || 0;
  const total = order.total_cents ?? subtotal + deliveryFee;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const M = 40;
  const W = 595.28;
  const dark = rgb(0.1, 0.1, 0.1);
  const grey = rgb(0.4, 0.4, 0.4);
  const line = rgb(0.9, 0.9, 0.9);

  let y = 841.89 - M;

  const text = (s: string, x: number, yy: number, size = 10, b = false, color = dark) =>
    page.drawText(safe(s), { x, y: yy, size, font: b ? bold : regular, color });

  const right = (s: string, xEnd: number, yy: number, size = 10, b = false, color = dark) => {
    const str = safe(s);
    const font = b ? bold : regular;
    page.drawText(str, {
      x: xEnd - font.widthOfTextAtSize(str, size),
      y: yy,
      size,
      font,
      color,
    });
  };

  // Header
  text("RECEIPT", M, y - 22, 26, true, rgb(0.33, 0.33, 0.33));
  text("Newman Stores Collections", M, y - 38, 10, false, grey);

  // Logo (optional)
  try {
    const logoUrl =
      process.env.BRAND_LOGO_URL ||
      (process.env.SUPABASE_URL
        ? `${process.env.SUPABASE_URL}/storage/v1/object/public/brand/newman-stores-receipt-logo.png`
        : "https://newmanstorescollection.vercel.app/newman-stores-receipt-logo.png");
    const res = await fetch(logoUrl);
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      const img = await pdf.embedPng(bytes);
      page.drawImage(img, { x: W - M - 52, y: y - 52, width: 52, height: 52 });
    }
  } catch {
    // logo is decorative — never fail the receipt for it
  }

  y -= 76;

  // Meta box
  const boxH = 62;
  page.drawRectangle({
    x: M,
    y: y - boxH,
    width: 250,
    height: boxH,
    borderColor: line,
    borderWidth: 1,
  });
  const metas: [string, string][] = [
    ["Order ID:", String(order.order_id ?? "")],
    ["Date & Time:", formatDate(order.created_at || new Date().toISOString())],
    ["Customer:", customer.name || "Customer"],
  ];
  metas.forEach(([label, value], i) => {
    const ly = y - 18 - i * 16;
    text(label, M + 10, ly, 9, true);
    text(value, M + 95, ly, 9);
  });

  y -= boxH + 26;

  text("Order Details", M, y, 13, true);
  y -= 22;

  // Table header
  const colNo = M + 4;
  const colDesc = M + 40;
  const colQty = M + 300;
  const colPriceEnd = M + 400;
  const colTotalEnd = W - M - 4;

  page.drawRectangle({
    x: M,
    y: y - 6,
    width: W - M * 2,
    height: 22,
    color: rgb(0.82, 0.84, 0.86),
  });
  text("No.", colNo, y, 9, true);
  text("Description", colDesc, y, 9, true);
  text("Qty", colQty, y, 9, true);
  right("Unit Price", colPriceEnd, y, 9, true);
  right("Total", colTotalEnd, y, 9, true);
  y -= 22;

  // Rows
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const desc = [it.name, it.size ? `Size ${it.size}` : null, it.color || null]
      .filter(Boolean)
      .join(" - ");
    text(`${i + 1}.`, colNo, y, 9);
    text(desc.length > 45 ? `${desc.slice(0, 45)}...` : desc, colDesc, y, 9);
    text(String(it.qty), colQty, y, 9);
    right(money(it.price_cents), colPriceEnd, y, 9);
    right(money(it.price_cents * it.qty), colTotalEnd, y, 9);
    y -= 12;
    page.drawLine({
      start: { x: M, y },
      end: { x: W - M, y },
      thickness: 1,
      color: line,
    });
    y -= 14;
    if (y < 140) break;
  }

  // Totals
  y -= 14;
  const totalsLeft = W - M - 190;
  text("Sub Total", totalsLeft, y, 10);
  right(money(subtotal), colTotalEnd, y, 10);
  y -= 16;
  text("Delivery", totalsLeft, y, 10);
  right(money(deliveryFee), colTotalEnd, y, 10);
  y -= 30;
  page.drawRectangle({
    x: totalsLeft - 10,
    y: y - 6,
    width: 200,
    height: 26,
    color: rgb(0.07, 0.07, 0.07),
  });
  page.drawText("TOTAL", {
    x: totalsLeft,
    y: y + 1,
    size: 11,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const totalStr = money(total);
  page.drawText(totalStr, {
    x: colTotalEnd - bold.widthOfTextAtSize(totalStr, 11),
    y: y + 1,
    size: 11,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Footer
  const footer = "Thank You For Shopping With Us!";
  page.drawText(footer, {
    x: (W - regular.widthOfTextAtSize(footer, 11)) / 2,
    y: 50,
    size: 11,
    font: regular,
    color: grey,
  });

  const bytes = await pdf.save();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${order.order_id}-${timestamp}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("media")
    .upload(`receipts/${fileName}`, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error("Failed to upload receipt: " + uploadError.message);
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from("media")
    .createSignedUrl(`receipts/${fileName}`, 60 * 60 * 24 * 30);

  if (signError || !signed?.signedUrl) {
    throw new Error("Failed to create signed URL");
  }

  return signed.signedUrl;
}
