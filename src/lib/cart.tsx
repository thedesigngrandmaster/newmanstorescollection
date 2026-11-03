import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price_cents: number;
  image: string;
  size?: string;
  color?: string;
  qty: number;
  maxStock: number;
};

type CartCtx = {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  totalCents: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE = "nsc.cart.v1";

function keyOf(i: { productId: string; size?: string; color?: string }) {
  return `${i.productId}::${i.size ?? ""}::${i.color ?? ""}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Ignore malformed or unavailable local storage.
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
    } catch {
      // Ignore unavailable local storage (private mode, quota, etc.).
    }
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const totalCents = items.reduce((s, i) => s + i.price_cents * i.qty, 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    return {
      items,
      open,
      setOpen,
      totalCents,
      count,
      add: (item) => {
        setItems((prev) => {
          const k = keyOf(item);
          const existing = prev.find((p) => keyOf(p) === k);
          if (existing) {
            return prev.map((p) =>
              keyOf(p) === k ? { ...p, qty: Math.min(p.qty + item.qty, item.maxStock) } : p,
            );
          }
          return [...prev, item];
        });
        setOpen(true);
      },
      remove: (k) => setItems((p) => p.filter((i) => keyOf(i) !== k)),
      setQty: (k, qty) =>
        setItems((p) =>
          p.map((i) =>
            keyOf(i) === k ? { ...i, qty: Math.max(1, Math.min(qty, i.maxStock)) } : i,
          ),
        ),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}

export { keyOf as cartKey };
