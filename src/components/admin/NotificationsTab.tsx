import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/site/Icon";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

type OrderItem = { name: string; image: string; qty: number; price_cents: number; size?: string | null; product_id: string };
type Order = {
  id: string;
  order_id: string;
  total_cents: number;
  created_at: string;
  status: string;
  customer: { name?: string; email?: string; phone?: string; address?: string };
  items: OrderItem[];
};
type StockRow = { id: string; name: string; slug: string; stock: number; sold_out: boolean; low_stock_threshold: number };

export function NotificationsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const { data: stock, refetch } = useQuery({
    queryKey: ["admin-stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,stock,sold_out,low_stock_threshold")
        .order("stock", { ascending: true });
      if (error) throw error;
      return data as StockRow[];
    },
  });

  const soldOut = (stock ?? []).filter((p) => p.sold_out || p.stock <= 0);
  const lowStock = (stock ?? []).filter((p) => !p.sold_out && p.stock > 0 && p.stock <= (p.low_stock_threshold ?? 3));

  useEffect(() => {
    supabase
      .from("orders")
      .select("id,order_id,total_cents,created_at,customer,items,status")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setOrders((data ?? []) as unknown as Order[]));
    const ch = supabase
      .channel("notify-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
        const o = p.new as unknown as Order;
        setOrders((prev) => [o, ...prev].slice(0, 30));
        toast.success(`New order ${o.order_id} · ${formatMoney(o.total_cents)}`);
      })
      .subscribe();
    const pch = supabase
      .channel("notify-products")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(pch);
    };
  }, [refetch]);

  return (
    <div className="space-y-6">
      {(soldOut.length > 0 || lowStock.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Stock Alerts</h3>
          {soldOut.map((p) => (
            <div key={p.id} className="border border-destructive/40 bg-destructive/5 p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-destructive/15 text-destructive grid place-items-center">
                <Icon name="warning-outline" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">Sold out · {p.name}</div>
                <div className="text-xs text-muted-foreground">Restock or hide from the storefront.</div>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-destructive">0 left</span>
            </div>
          ))}
          {lowStock.map((p) => (
            <div key={p.id} className="border border-primary/40 bg-primary/5 p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/15 text-primary grid place-items-center">
                <Icon name="warning-outline" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">Low stock · {p.name}</div>
                <div className="text-xs text-muted-foreground">Threshold: {p.low_stock_threshold ?? 3}</div>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-primary">{p.stock} left</span>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Orders</h3>
      {orders.length === 0 && (
        <div className="bg-card border border-border p-10 text-center text-muted-foreground">
          You'll see new order alerts here in real time.
        </div>
      )}
      {orders.map((o) => (
        <button
          key={o.id}
          onClick={() => setOpenOrder(o)}
          className="w-full text-left bg-card border border-border p-4 flex items-center gap-3 hover:border-primary transition-colors"
        >
          <div className="h-10 w-10 bg-primary/15 text-primary grid place-items-center">
            <Icon name="cart-outline" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              New order · <span className="font-mono">{o.order_id}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {o.customer?.name ?? "Customer"} · {new Date(o.created_at).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {(o.items ?? []).length} item{(o.items ?? []).length === 1 ? "" : "s"}
              {o.items?.[0]?.name ? ` · ${o.items[0].name}` : ""}
              {o.items && o.items.length > 1 ? ` · +${o.items.length - 1} more` : ""}
            </div>
          </div>
          <div className="font-semibold shrink-0">{formatMoney(o.total_cents)}</div>
        </button>
      ))}
      </section>

      <AnimatePresence>
        {openOrder && <OrderPeek order={openOrder} onClose={() => setOpenOrder(null)} />}
      </AnimatePresence>
    </div>
  );
}

function OrderPeek({ order, onClose }: { order: Order; onClose: () => void }) {
  const productIds = useMemo(
    () => Array.from(new Set((order.items ?? []).map((i) => i.product_id).filter(Boolean))),
    [order],
  );
  const { data: ccMap } = useQuery({
    queryKey: ["notify-order-cc", order.id, productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,cc").in("id", productIds);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((r: { id: string; cc: string | null }) => { map[r.id] = r.cc; });
      return map;
    },
  });
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-50" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        className="fixed inset-x-3 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] max-h-[90vh] overflow-y-auto z-[60] bg-background p-6 shadow-2xl border border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-xl font-bold">Order {order.order_id}</h3>
            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center hover:bg-foreground/5"><Icon name="close-outline" size={22} /></button>
        </div>
        <div className="bg-card border border-border p-4 mb-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Customer</h4>
          <div className="font-medium">{order.customer?.name}</div>
          <div className="text-sm text-muted-foreground">{order.customer?.email}</div>
          <div className="text-sm text-muted-foreground">{order.customer?.phone}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Location</div>
          <div className="text-sm text-muted-foreground whitespace-pre-line">{order.customer?.address}</div>
        </div>
        <div className="bg-card border border-border p-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items</h4>
          <div className="space-y-2">
            {order.items?.map((i, idx) => {
              const cc = ccMap?.[i.product_id];
              return (
                <div key={idx} className="flex items-center gap-3">
                  <img src={i.image} alt="" className="h-12 w-12 object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.size ? `Size ${i.size} · ` : ""}Qty {i.qty}</div>
                    {cc && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/40 px-1.5 py-0.5">
                        CC · {cc}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium">{formatMoney(i.price_cents * i.qty)}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-lg font-bold">{formatMoney(order.total_cents)}</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}