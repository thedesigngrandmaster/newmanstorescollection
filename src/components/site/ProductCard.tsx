import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { padImages } from "@/lib/format";
import { useMoney } from "@/lib/currency";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price_cents: number;
  images: string[];
  stock: number;
  sold_out: boolean;
  has_other_colors?: boolean;
  colors?: string[];
};

export function ProductCard({ p, index = 0 }: { p: ProductRow; index?: number }) {
  const img = padImages(p.images)[0];
  const soldOut = p.sold_out || p.stock <= 0;
  const money = useMoney();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: (index % 8) * 0.04 }}
    >
      <Link
        to="/product/$slug"
        params={{ slug: p.slug }}
        className="group block bg-card overflow-hidden border border-border hover:border-primary transition-colors"
      >
        <div className="relative aspect-square bg-muted/50 overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={p.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-muted-foreground">
              No image
            </div>
          )}
          {soldOut && (
            <div className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-destructive text-destructive-foreground">
              Sold Out
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border">
          {p.brand && (
            <div className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
              {p.brand}
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <h3 className="font-display font-bold text-base truncate uppercase">{p.name}</h3>
            <span className="font-mono font-bold shrink-0">{money.format(p.price_cents)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}