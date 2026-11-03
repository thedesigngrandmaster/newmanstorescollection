import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { generateOrderId } from "@/lib/format";
import { useMoney } from "@/lib/currency";
import { Icon } from "./Icon";
import { PaymentModal } from "./PaymentModal";

const schema = z.object({
  name: z.string().trim().min(2, "name").max(80),
  email: z.string().trim().email("email").max(200),
  phone: z.string().trim().min(5, "phone number").max(30),
  address: z.string().trim().min(5, "delivery location").max(500),
});

function checkoutError(form: { name: string; email: string; phone: string; address: string }) {
  const missing = [];
  if (form.name.trim().length < 2) missing.push("name");
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) missing.push("email");
  if (form.phone.trim().length < 5) missing.push("phone number");
  if (form.address.trim().length < 5) missing.push("delivery location");
  return missing.length ? `Please, fill in your ${missing.join(", ").replace(/, ([^,]*)$/, ", and $1")}.` : null;
}

export function CheckoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cart = useCart();
  const money = useMoney();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErr(checkoutError(form) ?? "Please check your checkout details.");
      return;
    }
    setSubmitting(true);
    try {
      const orderId = generateOrderId();
      const items = cart.items.map((i) => ({
        product_id: i.productId,
        name: i.name,
        image: i.image,
        size: i.size ?? null,
        qty: i.qty,
        price_cents: i.price_cents,
      }));
      const { error } = await supabase.from("orders").insert({
        order_id: orderId,
        customer: parsed.data,
        items,
        total_cents: cart.totalCents,
        status: "pending",
      });
      if (error) throw error;
      // Decrement stock per line item (RPC handles sold_out)
      await Promise.all(
        cart.items.map((i) =>
          supabase.rpc("decrement_stock", { _product_id: i.productId, _qty: i.qty }),
        ),
      );
      setPaidOrderId(orderId);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentClose() {
    setPaidOrderId(null);
    cart.clear();
    cart.setOpen(false);
    onClose();
  }

  return (
    <>
      <AnimatePresence>
        {open && !paidOrderId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed inset-x-3 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] max-h-[90vh] overflow-y-auto z-[90] bg-background rounded-3xl p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-semibold">Checkout</h3>
                <button
                  aria-label="Close"
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5"
                >
                  <Icon name="close-outline" size={22} />
                </button>
              </div>
              <form onSubmit={submit} className="space-y-3">
                {(["name", "email", "phone", "address"] as const).map((k) => (
                  <div key={k}>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {k === "address" ? "Location" : k} <span className="text-primary">*</span>
                    </label>
                    {k === "address" ? (
                      <textarea
                        rows={2}
                        value={form[k]}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 ring-primary/30"
                      />
                    ) : (
                      <input
                        type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                        value={form[k]}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:ring-2 ring-primary/30"
                      />
                    )}
                  </div>
                ))}
                {err && <p className="text-sm text-destructive">{err}</p>}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-xl font-bold">
                    {money.format(cart.totalCents)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || cart.items.length === 0}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {submitting ? "Placing order…" : "Place order & pay"}
                  <Icon name="arrow-forward-outline" size={18} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {paidOrderId && (
        <PaymentModal
          orderId={paidOrderId}
          totalCents={cart.totalCents}
          onClose={handlePaymentClose}
        />
      )}
    </>
  );
}