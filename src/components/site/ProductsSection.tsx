import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductRow } from "./ProductCard";
import { motion } from "framer-motion";
import { Icon } from "./Icon";

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,brand,price_cents,images,stock,sold_out,category_id,subcategory_id,has_other_colors,colors")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as (ProductRow & { category_id: string | null; subcategory_id: string | null })[];
}

async function fetchTaxonomy() {
  const [c, s] = await Promise.all([
    supabase.from("categories").select("id,slug,name").order("sort"),
    supabase.from("subcategories").select("id,slug,name,category_id,kind"),
  ]);
  return { cats: c.data ?? [], subs: s.data ?? [] };
}

export function ProductsSection({
  categorySlug,
  subSlug,
  title = "Featured Products",
  eyebrow = "// Featured",
}: {
  categorySlug?: string;
  subSlug?: string;
  title?: string;
  eyebrow?: string;
}) {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: tax } = useQuery({ queryKey: ["taxonomy"], queryFn: fetchTaxonomy });
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | undefined>(categorySlug);

  useEffect(() => setActiveCat(categorySlug), [categorySlug]);

  useEffect(() => {
    const ch = supabase
      .channel("products-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => qc.invalidateQueries({ queryKey: ["products"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (activeCat && tax) {
      const cat = tax.cats.find((c) => c.slug === activeCat);
      if (cat) list = list.filter((p) => p.category_id === cat.id);
    }
    if (subSlug && tax) {
      const sub = tax.subs.find((s) => s.slug === subSlug);
      if (sub) list = list.filter((p) => p.subcategory_id === sub.id);
    }
    if (tab === "sold-out") list = list.filter((p) => p.sold_out || p.stock <= 0);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, tax, activeCat, subSlug, tab, query]);

  return (
    <section id="shop" className="relative py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-5 mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-primary font-bold">{eyebrow}</div>
              <h2 className="mt-2 font-display text-3xl sm:text-5xl font-black uppercase">{title}</h2>
            </div>
            <div className="flex items-stretch gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Icon name="search-outline" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sneakers, brands…"
                  className="w-full pl-9 pr-3 py-2.5 bg-card border border-border focus:border-primary outline-none text-sm"
                />
              </div>
              <div className="inline-flex border border-border bg-card">
                {[
                  { id: "all", label: "All" },
                  { id: "sold-out", label: "Sold Out" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                      tab === t.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {(tax?.cats?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCat(undefined)}
                className={`px-3 py-1.5 text-xs uppercase tracking-widest font-bold border transition-colors ${
                  !activeCat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary"
                }`}
              >
                All Categories
              </button>
              {tax?.cats?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.slug)}
                  className={`px-3 py-1.5 text-xs uppercase tracking-widest font-bold border transition-colors ${
                    activeCat === c.slug
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border">
            No products match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}