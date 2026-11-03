import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMoney } from "@/lib/currency";
import { PageShell } from "@/components/site/PageShell";
import { Icon } from "@/components/site/Icon";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/track-order")({
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Track Order — Newman Stores Collections" }] }),
  component: Track,
});

type OrderRow = {
  order_id: string;
  status: string;
  total_cents: number;
  created_at: string;
  items: { name: string; qty: number; size?: string | null }[];
};

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"] as const;

function Track() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(id ?? "");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const money = useMoney();

  async function lookup(orderId: string) {
    setErr(null);
    setOrder(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("track_order_public", {
        _order_id: orderId.trim(),
      });
      if (error) throw error;
      const found = data?.[0];
      if (!found) setErr("No order found with that ID.");
      else setOrder(found as unknown as OrderRow);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (id) lookup(id);
  }, [id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/track-order", search: { id: input.trim() } });
    lookup(input);
  }

  const stepIndex = order
    ? Math.max(0, STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]))
    : -1;

  return (
    <PageShell title="Track Order" eyebrow="// Where is my order?">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <form onSubmit={submit} className="flex gap-2 border border-border p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter Tracking Number: NSC-XXXXX"
            className="flex-1 bg-transparent px-3 py-3 outline-none uppercase font-mono"
          />
          <button className="btn-primary" disabled={busy || !input.trim()}>
            {busy ? "Looking…" : "Track"}
          </button>
        </form>

        {err && <p className="text-destructive text-sm">{err}</p>}

        {order && (
          <div className="border border-border p-6 space-y-5">
            <div className="flex flex-wrap items-baseline gap-3 justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Order
                </div>
                <div className="font-display text-2xl font-black uppercase">{order.order_id}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Total
                </div>
                <div className="font-mono font-bold">{money.format(order.total_cents)}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
                Status
              </div>
              <ol className="grid grid-cols-5 gap-1">
                {STATUS_STEPS.map((s, i) => {
                  const done = i <= stepIndex;
                  return (
                    <li key={s} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`h-8 w-8 grid place-items-center border-2 ${done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                      >
                        {done ? <Icon name="checkmark-outline" size={14} /> : i + 1}
                      </div>
                      <div
                        className={`text-[10px] uppercase tracking-widest text-center ${done ? "text-primary font-bold" : "text-muted-foreground"}`}
                      >
                        {s}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                Items
              </div>
              <ul className="text-sm divide-y divide-border border border-border">
                {order.items.map((it, i) => (
                  <li key={i} className="p-3 flex justify-between gap-2">
                    <span>
                      {it.qty}× {it.name}
                      {it.size ? ` (${it.size})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
