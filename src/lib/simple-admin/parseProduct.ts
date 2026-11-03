// Client-side, network-free product parser for the WhatsApp-style Add Product
// chat. Works fully offline; runs on every message the admin types.

export type ParsedProduct = {
  name?: string;
  description: string;
  priceNaira?: number;
  sizes: string[];
  colors: string[];
  stock?: number;
};

const COLOR_WORDS = [
  "black",
  "white",
  "off white",
  "red",
  "blue",
  "navy",
  "sky blue",
  "green",
  "olive",
  "grey",
  "gray",
  "brown",
  "tan",
  "cream",
  "beige",
  "bone",
  "gold",
  "silver",
  "pink",
  "purple",
  "orange",
  "yellow",
  "burgundy",
  "wine",
  "multi",
];

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL"];

// Matches money however a shop owner is likely to type it:
// ₦45,000 · N45,000 · NGN 45,000 · 45k · 45000 · 45,000
const MONEY_RE =
  /(?:₦|NGN|\bN(?=\s*\d))\s*\d[\d,]*(?:\.\d+)?\s*k?|\b\d[\d,]*(?:\.\d+)?\s*k\b|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{4,7}\b/gi;

function digitsOnly(v: string): number {
  const n = Number(v.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function amountFrom(raw: string): number | undefined {
  const cleaned = raw
    .replace(/[₦,\s]/gi, "")
    .replace(/^NGN/i, "")
    .replace(/^N/i, "");
  const kSuffix = /k$/i.test(cleaned);
  const n = Number(cleaned.replace(/k$/i, ""));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(kSuffix ? n * 1000 : n);
}

function parsePrice(text: string): number | undefined {
  // 1. Explicit currency: ₦45,000 / N45,000 / NGN 45,000 / N45k.
  for (const m of text.matchAll(/(?:₦|NGN|\bN(?=\s*\d))\s*\d[\d,]*(?:\.\d+)?\s*k?/gi)) {
    const n = amountFrom(m[0]);
    if (n !== undefined && n >= 100) return n;
  }
  // 2. Labelled price: "price: 45,000", "cost 45000", "amount N45k".
  for (const m of text.matchAll(
    /(?:price|cost|amount)\s*[:=-]?\s*(?:₦|NGN|N)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/gi,
  )) {
    const n = amountFrom(`${m[1]}${m[2] ?? ""}`);
    if (n !== undefined && n >= 100) return n;
  }
  // 3. k-suffix without currency: "45k".
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\s*k\b/gi)) {
    const n = amountFrom(`${m[1]}k`);
    if (n !== undefined && n >= 500) return n;
  }
  // 4. Bare number: "45,000" or "45000". Ignore small numbers (sizes, stock).
  for (const m of text.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{4,7})\b/g)) {
    const n = digitsOnly(m[1]);
    if (n >= 500) return Math.round(n);
  }
  return undefined;
}

/** Remove money amounts so size parsing doesn't mistake "45,000" for size 45. */
function stripMoney(text: string): string {
  return text.replace(MONEY_RE, " ");
}

function parseSizes(text: string): string[] {
  const sizes = new Set<string>();
  const clean = stripMoney(text);
  // Ranges first: "sizes 40-45", "40 to 45", "40 – 45".
  const ranges = clean.matchAll(/\b(3[5-9]|4[0-8])\s*(?:-|–|to)\s*(3[5-9]|4[0-8])\b/gi);
  for (const m of ranges) {
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (to >= from && to - from <= 20) {
      for (let n = from; n <= to; n++) sizes.add(String(n));
    }
  }
  const numeric = clean.matchAll(/(?:^|[\s,(])(3[5-9]|4[0-8])(?=[\s,)|.]|$)/g);
  for (const m of numeric) sizes.add(m[1]);
  for (const ls of LETTER_SIZES) {
    if (new RegExp(`(?:^|[\\s,(])${ls}(?=[\\s,)|.]|$)`, "i").test(clean)) {
      sizes.add(ls === "2XL" || ls === "XXL" ? "XXL" : ls);
    }
  }
  return [...sizes];
}

function parseColors(text: string): string[] {
  const found: string[] = [];
  const push = (w: string) => {
    const norm = w.toLowerCase().trim();
    if (norm && !found.includes(norm)) found.push(norm);
  };
  const labeled = text.matchAll(/colo?u?rs?\s*[:-]\s*([^\n]+)/gi);
  for (const m of labeled) {
    m[1].split(/[,/&]|\band\b/i).forEach((c) => {
      const cleaned = c.trim().replace(/\.$/, "");
      if (cleaned.length <= 20) push(cleaned);
    });
  }
  if (found.length === 0) {
    for (const w of COLOR_WORDS) {
      if (new RegExp(`(?:^|[^a-z])${w}(?:[^a-z]|$)`, "i").test(text)) push(w);
    }
  }
  return found;
}

function parseStock(text: string): number | undefined {
  const labeled = text.match(/stock\s*[:-]?\s*(\d{1,3})/i);
  if (labeled) return Number(labeled[1]);
  const count = text.match(/(\d{1,3})\s*(?:pcs|pieces|pairs?)\s+(?:available|left|in stock)/i);
  if (count) return Number(count[1]);
  return undefined;
}

function cleanName(line: string): string {
  let name = stripMoney(line)
    .replace(/(?:price|cost|amount)\s*[:=-]?\s*/gi, " ")
    .replace(/^(?:product\s*)?name\s*[:-]\s*/i, " ")
    .replace(/(?:^|[\s,(])(3[5-9]|4[0-8])(?=[\s,)|.]|$)/g, " ")
    .replace(/\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL)\b/gi, " ")
    .replace(/\b(?:colou?rs?|sizes?)\b\s*(?:[:-]\s*)?[^\n]*/gi, " ")
    .replace(/stock\s*[:-]?\s*\d{1,3}/gi, " ")
    .replace(/\s*[-–|]\s*$/g, "")
    .replace(/[\s,;:]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (name.length > 60) name = name.slice(0, 60).trim();
  return name;
}

function looksLikeMetadata(line: string): boolean {
  return /^(?:price|cost|amount|sizes?|colours?|colors?|stock|available\s+(?:sizes|colours|colors))\b\s*[:-]?/i.test(
    line,
  );
}

/** True when a line is only a price/number, e.g. "₦45,000", "N45,000", "45k". */
function isPriceOnly(line: string): boolean {
  return stripMoney(line).replace(/[\s,;:.-]/g, "").length === 0;
}

export function parseProductFromText(rawText: string): ParsedProduct {
  const text = rawText.trim();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const priceNaira = parsePrice(text);
  const sizes = parseSizes(text);
  const colors = parseColors(text);
  const stock = parseStock(text);

  let name: string | undefined;
  let nameLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (looksLikeMetadata(line)) continue;
    const candidate = cleanName(line);
    // A usable name has letters and isn't just numbers/sizes.
    if (candidate && /[a-z]/i.test(candidate) && candidate.replace(/[^a-z]/gi, "").length >= 2) {
      name = candidate;
      nameLineIndex = i;
      break;
    }
  }

  const description = lines
    .filter((_, i) => i !== nameLineIndex)
    .filter((l) => !looksLikeMetadata(l))
    .filter((l) => !isPriceOnly(l))
    .join("\n")
    .slice(0, 2000);

  return { name, description, priceNaira, sizes, colors, stock };
}

/**
 * Merge a follow-up message into what the shop owner already told us.
 * The Add Product chat sends each message separately, so "Test GPT Product"
 * followed by "₦45,000" must combine into one product.
 */
export function mergeParsedProducts(
  previous: ParsedProduct | undefined,
  next: ParsedProduct,
): ParsedProduct {
  if (!previous) return next;
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  return {
    name: next.name || previous.name,
    description: [previous.description, next.description].filter(Boolean).join("\n").slice(0, 2000),
    priceNaira: next.priceNaira ?? previous.priceNaira,
    sizes: union(previous.sizes, next.sizes),
    colors: union(previous.colors, next.colors),
    stock: next.stock ?? previous.stock,
  };
}

export function missingFields(p: ParsedProduct, imageCount: number): string[] {
  const missing: string[] = [];
  if (!p.name) missing.push("the product name");
  if (!p.priceNaira) missing.push("the price (e.g. ₦45,000)");
  if (imageCount < 1) missing.push("at least 1 photo");
  return missing;
}
