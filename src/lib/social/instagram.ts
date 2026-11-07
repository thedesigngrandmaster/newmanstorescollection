import { formatBase } from "@/lib/currency";

export type ShareProduct = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  description?: string | null;
  sizes?: string[] | null;
  colors?: string[] | null;
  images?: string[] | null;
};

export function productShareUrl(slug: string): string {
  if (typeof window === "undefined") return `/products/${slug}`;
  return `${window.location.origin}/products/${slug}`;
}

export function shopShareUrl(): string {
  if (typeof window === "undefined") return "/shop";
  return `${window.location.origin}/shop`;
}

function hashTag(value: string): string {
  const tag = value.replace(/[^a-z0-9]/gi, "");
  return tag ? `#${tag.toLowerCase()}` : "#newmanstorescollections";
}

/** Builds an editable Instagram caption that is ready to use as an ad. */
export function buildShareCaption(
  products: ShareProduct[],
  brand: string,
  tagline?: string | null,
): string {
  const tags = [
    hashTag(brand),
    "#sneakers",
    "#footwear",
    "#style",
    "#lagos",
    "#abuja",
    "#ibadan",
    "#shopnow",
    "#ad",
  ].join(" ");

  if (products.length === 1) {
    const p = products[0];
    const detail = [
      `Price: ${formatBase(p.price_cents)}`,
      p.sizes && p.sizes.length > 0 ? `Sizes: ${p.sizes.join(", ")}` : "",
      p.colors && p.colors.length > 0 ? `Colours: ${p.colors.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const description = (p.description ?? "").replace(/\s+/g, " ").trim();
    return [
      `${brand} — ${p.name}`,
      tagline ? tagline : "",
      detail,
      description ? description.slice(0, 180) : "",
      `Shop now 👉 ${productShareUrl(p.slug)}`,
      "DM to order or tap the link.",
      tags,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const lines = products.map(
    (p, i) => `${i + 1}. ${p.name} — ${formatBase(p.price_cents)}\n${productShareUrl(p.slug)}`,
  );
  return [
    `NEW DROP — ${brand}`,
    tagline ? tagline : "",
    lines.join("\n\n"),
    `Shop the collection 👉 ${shopShareUrl()}`,
    "DM to order.",
    tags,
  ]
    .filter(Boolean)
    .join("\n\n");
}
