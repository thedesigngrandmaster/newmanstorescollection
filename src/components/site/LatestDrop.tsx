import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMoney } from "@/lib/currency";
import { Icon } from "./Icon";

type Row = {
  id: string; name: string; slug: string; price_cents: number;
  images: string[]; sold_out: boolean; stock: number;
  category_id: string | null; created_at: string;
};
type Cat = { id: string; slug: string; name: string };

async function fetchLatestByCategory() {
  const [{ data: products, error: pe }, { data: cats, error: ce }] = await Promise.all([
    supabase.from("products").select("id,name,slug,price_cents,images,sold_out,stock,category_id,created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("categories").select("id,slug,name").order("sort"),
  ]);
  if (pe) throw pe;
  if (ce) throw ce;
  const latestByCat = new Map<string, Row>();
  for (const p of (products ?? []) as Row[]) {
    if (p.category_id && !latestByCat.has(p.category_id)) latestByCat.set(p.category_id, p);
  }
  const items = (cats ?? []).map((c) => ({ cat: c as Cat, product: latestByCat.get(c.id) })).filter((x) => x.product);
  return items as { cat: Cat; product: Row }[];
}

export function LatestDrop() {
  const money = useMoney();
  const { data, isLoading } = useQuery({ queryKey: ["latest-drop"], queryFn: fetchLatestByCategory });

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="relative py-16 sm:py-20 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-primary font-bold">// Just In</div>
            <h2 className="mt-2 font-display text-3xl sm:text-5xl font-black uppercase">The Latest Drop</h2>
            <p className="mt-2 text-muted-foreground max-w-lg text-sm">Freshest pair from every category, hot off the shelf.</p>
          </div>
          <Link to="/shop" className="text-xs uppercase tracking-widest font-bold hover:text-primary inline-flex items-center gap-1">
            See everything <Icon name="arrow-forward-outline" size={14} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />)
            : data!.map(({ cat, product: p }, i) => {
                const img = p.images?.[0];
                const soldOut = p.sold_out || p.stock <= 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="group block">
                      <div className="relative aspect-[4/5] bg-card overflow-hidden">
                        {img ? (
                          <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-muted-foreground"><Icon name="image-outline" size={32} /></div>
                        )}
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1">
                          {cat.name}
                        </div>
                        {soldOut && (
                          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1">Sold Out</div>
                        )}
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-tight truncate">{p.name}</h3>
                        <span className="font-mono text-sm font-bold shrink-0">{money.format(p.price_cents)}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
        </div>
      </div>
    </section>
  );
}