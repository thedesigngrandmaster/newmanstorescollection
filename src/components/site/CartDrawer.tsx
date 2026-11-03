import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useCart, cartKey } from "@/lib/cart";
import { useMoney } from "@/lib/currency";
import { Icon } from "./Icon";

export function CartDrawer() {
  const cart = useCart();
  const money = useMoney();

  return (
    <>
      <AnimatePresence>
        {cart.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => cart.setOpen(false)}
              className="fixed inset-0 bg-black/40 z-[60]"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-background z-[70] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="font-display text-lg font-semibold">Your Cart</h3>
                <button
                  aria-label="Close"
                  onClick={() => cart.setOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5"
                >
                  <Icon name="close-outline" size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.items.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                    <Icon name="bag-outline" size={32} />
                    <p className="mt-2 text-sm">Your cart is empty</p>
                  </div>
                ) : (
                  cart.items.map((i) => {
                    const k = cartKey(i);
                    return (
                      <div key={k} className="flex gap-3">
                        <img src={i.image} alt={i.name} className="h-20 w-20 rounded-xl object-cover bg-muted" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{i.name}</p>
                              {i.size && (
                                <p className="text-xs text-muted-foreground">Size {i.size}</p>
                              )}
                              {i.color && (
                                <p className="text-xs text-muted-foreground">Color {i.color}</p>
                              )}
                            </div>
                            <button
                              aria-label="Remove"
                              onClick={() => cart.remove(k)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Icon name="trash-outline" size={18} />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-border">
                              <button
                                onClick={() => cart.setQty(k, i.qty - 1)}
                                className="h-8 w-8 grid place-items-center"
                              >
                                <Icon name="remove-outline" size={16} />
                              </button>
                              <span className="w-8 text-center text-sm">{i.qty}</span>
                              <button
                                onClick={() => cart.setQty(k, i.qty + 1)}
                                className="h-8 w-8 grid place-items-center"
                              >
                                <Icon name="add-outline" size={16} />
                              </button>
                            </div>
                            <span className="font-semibold">
                              {money.format(i.price_cents * i.qty)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {cart.items.length > 0 && (
                <div className="p-5 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-base">{money.format(cart.totalCents)}</span>
                  </div>
                  <Link
                    to="/checkout"
                    onClick={() => cart.setOpen(false)}
                    className="btn-primary w-full justify-center"
                  >
                    Checkout
                    <Icon name="arrow-forward-outline" size={18} />
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => cart.setOpen(false)}
                    className="block text-center text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    View full cart
                  </Link>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}