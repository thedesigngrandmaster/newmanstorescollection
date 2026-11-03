export function formatMoney(cents: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

export function generateOrderId() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `NSC-${s}`;
}

export function padImages(images: string[]): string[] {
  const arr = (images ?? []).filter(Boolean);
  if (arr.length === 0) return [];
  if (arr.length >= 4) return arr.slice(0, 4);
  const out = [...arr];
  while (out.length < 4) out.push(arr[out.length % arr.length]);
  return out;
}

export function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
