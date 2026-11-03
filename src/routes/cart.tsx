import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { useCart, cartKey } from "@/lib/cart";
import { useMoney } from "@/lib/currency";
import { Icon } from "@/components/site/Icon";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Newman Stores Collections" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const money = useMoney();
  return (
    <PageShell title="Your Cart" eyebrow="// Bag">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {cart.items.length === 0 ? (
            <div className="border border-dashed border-border py-20 text-center">
              <Icon name="bag-outline" size={36} className="mx-auto text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
              <Link to="/shop" className="btn-primary mt-6 inline-flex">
                Shop now <Icon name="arrow-forward-outline" size={18} />
              </Link>
            </div>
          ) : (
            <ul className="border border-border divide-y divide-border">
              {cart.items.map((i) => {
                const k = cartKey(i);
                return (
                  <li key={k} className="flex gap-4 p-4">
                    <img src={i.image} alt={i.name} className="h-24 w-24 object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display font-bold uppercase">{i.name}</p>
                          {i.size && (
                            <p className="text-xs text-muted-foreground mt-0.5">Size {i.size}</p>
                          )}
                          {i.color && (
                            <p className="text-xs text-muted-foreground mt-0.5">Color {i.color}</p>
                          )}
                        </div>
                        <button
                          onClick={() => cart.remove(k)}
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Icon name="trash-outline" size={18} />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex border border-border">
                          <button
                            onClick={() => cart.setQty(k, i.qty - 1)}
                            className="h-9 w-9 grid place-items-center hover:bg-muted"
                          >
                            <Icon name="remove-outline" size={16} />
                          </button>
                          <span className="w-10 text-center text-sm self-center font-mono">
                            {i.qty}
                          </span>
                          <button
                            onClick={() => cart.setQty(k, i.qty + 1)}
                            className="h-9 w-9 grid place-items-center hover:bg-muted"
                          >
                            <Icon name="add-outline" size={16} />
                          </button>
                        </div>
                        <span className="font-mono font-bold">
                          {money.format(i.price_cents * i.qty)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="border border-border p-5 h-fit space-y-4">
          <h3 className="font-display uppercase font-bold text-lg">Order Summary</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono font-bold">{money.format(cart.totalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-muted-foreground">Calculated at checkout</span>
          </div>
          <Link
            to="/checkout"
            aria-disabled={cart.items.length === 0}
            className={`btn-primary w-full justify-center ${cart.items.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
          >
            Checkout <Icon name="arrow-forward-outline" size={18} />
          </Link>
          <Link
            to="/shop"
            className="block text-center text-sm text-muted-foreground hover:text-primary"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
