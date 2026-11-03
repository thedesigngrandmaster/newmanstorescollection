import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/settings";
import { useMoney } from "@/lib/currency";
import { PageShell } from "@/components/site/PageShell";
import { Icon } from "@/components/site/Icon";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { PaystackButton } from "@/components/checkout/PaystackButton";

// ============================================================
// 🔧 EASY TOGGLE — Change this to true when Paystack is ready
// ============================================================
const PAYSTACK_ENABLED = true;
// ============================================================

const search = z.object({
  order: z.string().optional(),
  total: z.coerce.number().default(0),
});

export const Route = createFileRoute("/thank-you")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Thank you — Newman Stores Collections" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYou,
});

function ThankYou() {
  const { order, total } = Route.useSearch();
  const { data: s } = useSiteSettings();
  const money = useMoney();
  const p = s?.payment;
  const digits = (p?.whatsappNumber ?? "").replace(/[^0-9]/g, "");
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Load Paystack script only when enabled
  useEffect(() => {
    if (!PAYSTACK_ENABLED) return;
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return;

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Fetch customer details (for when Paystack becomes active)
  useEffect(() => {
    if (!order) return;

    async function loadOrder() {
      const { data } = await supabase.rpc("track_order_public", {
        _order_id: order as string,
      });
      const row = data?.[0] as { customer?: { email?: string; name?: string } } | undefined;
      if (row) {
        setCustomerEmail(row.customer?.email || "");
        setCustomerName(row.customer?.name || "");
      }
    }
    loadOrder();
  }, [order]);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(null), 1500);
      return () => clearTimeout(t);
    }
  }, [copied]);

  function copy(label: string, value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(label);
  }

  async function uploadReceipt(file: File | null) {
    if (!file || !order) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, "receipts");
      const { data, error } = await supabase.rpc("upload_receipt_public", {
        _order_id: order,
        _receipt_url: url,
      });
      if (error) throw error;
      if (!data) throw new Error("Order not found");
      toast.success("Receipt uploaded");
      if (digits) {
        const message = `Hi ${s?.brand ?? "Newman Stores Collections"}! I just uploaded my receipt for order ${order} (${money.format(total)}). Receipt: ${url}`;
        window.open(
          `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Receipt upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Fallback when someone visits /thank-you without an order ID
  if (!order) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-black uppercase">No order found</h1>
          <p className="mt-3 text-muted-foreground">
            This page is only available after placing an order.
          </p>
          <Link to="/shop" className="mt-8 inline-block text-sm text-primary hover:underline">
            Continue shopping
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center"
      >
        <div className="mx-auto h-16 w-16 border-2 border-primary text-primary grid place-items-center">
          <Icon name="checkmark-outline" size={32} />
        </div>

        <div className="mt-6 text-xs uppercase tracking-[0.3em] text-primary font-bold">
          // Order received
        </div>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl font-black uppercase">Thank You</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <span className="font-mono font-bold text-foreground">{order}</span> is pending
          payment.
        </p>

        {/* Order summary */}
        <div className="mt-8 border border-border p-6 text-left space-y-3">
          <Row
            label="Order ID"
            value={order}
            onCopy={() => copy("order", order)}
            copied={copied === "order"}
          />
          <Row label="Amount" value={money.format(total)} />
        </div>

        {/* Warning about personal account */}
        {/* <div className="mt-6 rounded-xl border border-amber-500/60 bg-amber-500/15 p-4 text-left">
  <p className="font-semibold text-amber-400">
    Temporary payment arrangement
  </p>
  <p className="mt-1.5 text-sm leading-relaxed text-amber-100/90">
    We are currently finalizing our official business bank account.
    Payments are temporarily received into the founder’s personal account.
    Your order is fully protected and we will update the account details as soon as the business account is ready.
  </p>
  <p className="mt-1.5 text-sm leading-relaxed text-amber-100/90">
    After making the transfer, take a screenshot of your transaction or save the receipt as a PDF or image.
    Then click on the upload button below to send your receipt to our Customer Representative.
  </p>
</div> */}

        {/* Bank transfer details */}
        <div className="mt-6 border border-border p-6 text-left space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
            Bank Transfer Details
          </div>

          {p?.bankName && <Row label="Bank" value={p.bankName} />}
          {p?.accountName && <Row label="Account name" value={p.accountName} />}
          {p?.accountNumber && (
            <Row
              label="Account number"
              value={
                p.accountNumber.length > 3 ? `${p.accountNumber.slice(0, 3)}*****` : p.accountNumber
              }
              onCopy={() => copy("acct", p.accountNumber)} // full number goes to clipboard
              copied={copied === "acct"}
            />
          )}

          <div className="pt-3 mt-2 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Important:</span> Please use your{" "}
              <span className="font-mono font-bold text-foreground">{order}</span> as the payment
              reference when making the transfer.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once your payment is confirmed, we will always send you an official receipt for your
              order.
            </p>
          </div>
        </div>

        {/* Receipt upload */}
        {digits && (
          <motion.label
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
            className="mt-6 w-full inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-4 text-white font-black uppercase text-base sm:text-lg tracking-widest shadow-lg active:scale-[0.98] transition-transform"
            style={{ backgroundColor: "#25D366" }}
          >
            {uploading ? "Uploading receipt…" : "Upload your receipt after payment"}
            <span className="text-xl leading-none">→</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              className="hidden"
              onChange={(e) => uploadReceipt(e.target.files?.[0] ?? null)}
            />
          </motion.label>
        )}

        {/* Paystack section */}
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-sm font-medium">Pay with Paystack</span>
            {!PAYSTACK_ENABLED && (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Not active yet
              </span>
            )}
          </div>

          {PAYSTACK_ENABLED ? (
            <PaystackButton
              orderId={order}
              amount={total / 100}
              email={customerEmail || "customer@newmanstorescollections.com"}
              customerName={customerName || "Customer"}
              onSuccess={(reference) => {
                toast.success("Payment successful! We will confirm shortly.");
                console.log("Paystack reference:", reference);
              }}
            />
          ) : (
            <button
              disabled
              className="w-full bg-muted text-muted-foreground font-bold uppercase tracking-wider py-4 rounded-none cursor-not-allowed opacity-60"
            >
              Paystack coming soon
            </button>
          )}
        </div>

        <div className="mt-8 flex gap-3 justify-center">
          <Link
            to="/track-order"
            search={{ id: order }}
            className="text-sm text-primary hover:underline"
          >
            Track this order
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground">
            Continue shopping
          </Link>
        </div>
      </motion.div>
    </PageShell>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-sm font-bold truncate">{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="text-muted-foreground hover:text-primary shrink-0"
            aria-label="Copy"
          >
            <Icon name={copied ? "checkmark-outline" : "copy-outline"} size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
