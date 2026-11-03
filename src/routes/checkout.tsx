import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { generateOrderId } from "@/lib/format";
import { useMoney } from "@/lib/currency";
import { useSiteSettings } from "@/lib/settings";
import { PageShell } from "@/components/site/PageShell";
import { Icon } from "@/components/site/Icon";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  phone2: "",
  houseNumber: "",
  streetName: "",
  landmark: "",
  zipCode: "",
  lagos: true,
};

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(5).max(30),
  phone2: z.string().trim().max(30).optional().or(z.literal("")),
  houseNumber: z.string().trim().min(1).max(80),
  streetName: z.string().trim().min(2).max(160),
  landmark: z.string().trim().min(2).max(160),
  zipCode: z.string().trim().max(20).optional().or(z.literal("")),
  lagos: z.boolean(),
});

function getCheckoutError(form: typeof initialForm) {
  const missing = [];
  if (form.name.trim().length < 2) missing.push("name");
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) missing.push("email");
  if (form.phone.trim().length < 5) missing.push("phone number");
  if (!form.houseNumber.trim()) missing.push("house number");
  if (form.streetName.trim().length < 2) missing.push("street name");
  if (form.landmark.trim().length < 2) missing.push("popular landmark/bustop");
  if (!missing.length) return null;
  return `Please, fill in your ${missing.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Newman Stores Collections" }] }),
  component: Checkout,
});

function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const money = useMoney();
  const { data: settings } = useSiteSettings();
  const [form, setForm] = useState(initialForm);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deliveryLagos = settings?.payment?.deliveryLagosCents ?? 200000; // ₦2,000
  const deliveryOutside = settings?.payment?.deliveryOutsideCents ?? 0;
  const deliveryFee = form.lagos ? deliveryLagos : deliveryOutside;
  const grandTotal = cart.totalCents + deliveryFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success)
      return setErr(getCheckoutError(form) ?? "Please check your checkout details.");
    if (cart.items.length === 0) return setErr("Your cart is empty.");
    setSubmitting(true);
    try {
      const orderId = generateOrderId();
      const items = cart.items.map((i) => ({
        product_id: i.productId,
        name: i.name,
        image: i.image,
        size: i.size ?? null,
        color: i.color ?? null,
        qty: i.qty,
        price_cents: i.price_cents,
      }));
      const total = grandTotal;
      const address = [
        `House number: ${parsed.data.houseNumber}`,
        `Street: ${parsed.data.streetName}`,
        `Landmark/Bustop: ${parsed.data.landmark}`,
        parsed.data.zipCode ? `Zip code: ${parsed.data.zipCode}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const { data, error } = await supabase.rpc("create_order_public", {
        _order_id: orderId,
        _customer: {
          ...parsed.data,
          address,
          delivery_zone: form.lagos ? "lagos" : "outside",
          delivery_fee_cents: deliveryFee,
          subtotal_cents: cart.totalCents,
        },
        _items: items,
        _total_cents: total,
      });
      if (error) throw error;
      if (!data) throw new Error("Unable to create order");
      cart.clear();
      navigate({ to: "/thank-you", search: { order: orderId, total } });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <PageShell title="Checkout" eyebrow="// Almost there">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center border border-dashed border-border">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link to="/shop" className="btn-primary mt-6 inline-flex">
            Browse Our Collection <Icon name="arrow-forward-outline" size={18} />
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Checkout" eyebrow="// Order info">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 lg:grid-cols-[1fr_360px]"
      >
        <form onSubmit={submit} className="border border-border p-6 space-y-4">
          <h2 className="font-display uppercase font-bold text-xl">Delivery Details</h2>
          {(
            [
              { k: "name", label: "Full name *", type: "text" },
              { k: "email", label: "Email *", type: "email" },
              { k: "phone", label: "Phone *", type: "tel" },
              { k: "phone2", label: "Secondary phone (optional)", type: "tel" },
            ] as const
          ).map((f) => (
            <div key={f.k}>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                {f.label}
              </label>
              <input
                type={f.type}
                value={form[f.k]}
                onChange={(e) => setForm((s) => ({ ...s, [f.k]: e.target.value }))}
                className="mt-1 w-full border border-border bg-card px-3 py-2 outline-none focus:border-primary"
              />
            </div>
          ))}
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                { k: "houseNumber", label: "House number *" },
                { k: "streetName", label: "Street name *" },
                { k: "landmark", label: "Popular landmark/bustop *" },
                { k: "zipCode", label: "Zip code (optional)" },
              ] as const
            ).map((f) => (
              <div key={f.k}>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {f.label}
                </label>
                <input
                  value={form[f.k]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.k]: e.target.value }))}
                  className="mt-1 w-full border border-border bg-card px-3 py-2 outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
          {/* <div className="border border-border p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Delivery zone</div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" checked={form.lagos} onChange={() => setForm((s) => ({ ...s, lagos: true }))} />
              <span>Within Lagos <span className="text-muted-foreground">({money.format(deliveryLagos)})</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" checked={!form.lagos} onChange={() => setForm((s) => ({ ...s, lagos: false }))} />
              <span>Outside Lagos <span className="text-muted-foreground">({deliveryOutside > 0 ? money.format(deliveryOutside) : "we'll contact you"})</span></span>
            </label>
          </div> */}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {submitting ? "Placing order…" : "Place order"}{" "}
            <Icon name="arrow-forward-outline" size={18} />
          </button>
        </form>
        <aside className="border border-border p-6 h-fit space-y-3">
          <h3 className="font-display uppercase font-bold text-lg">Summary</h3>
          <ul className="text-sm space-y-2">
            {cart.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-2">
                <span className="truncate">
                  {i.qty}× {i.name}
                  {i.size ? ` (${i.size})` : ""}
                  {i.color ? ` · ${i.color}` : ""}
                </span>
                <span className="font-mono">{money.format(i.price_cents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-border text-sm flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{money.format(cart.totalCents)}</span>
          </div>
          <div className="text-sm flex justify-between">
            <span className="text-muted-foreground">
              Delivery {form.lagos ? "(Lagos)" : "(Outside)"}
            </span>
            <span className="font-mono">{deliveryFee > 0 ? money.format(deliveryFee) : "—"}</span>
          </div>
          <div className="pt-3 border-t border-border flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="font-mono">{money.format(grandTotal)}</span>
          </div>
        </aside>
      </motion.div>
    </PageShell>
  );
}
