import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSiteSettings } from "@/lib/settings";

type Currency = { symbol: string; code: string };
type Ctx = {
  base: Currency;
  display: Currency;
  rate: number; // 1 base = rate display
  format: (cents: number) => string;
};

const DEFAULT_BASE: Currency = { symbol: "₦", code: "NGN" };

const SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  ZAR: "R",
  GHS: "₵",
  KES: "KSh",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  AED: "AED",
  SAR: "﷼",
  BRL: "R$",
  MXN: "MX$",
  CHF: "CHF",
};

const CurrencyCtx = createContext<Ctx | null>(null);

function fmt(cents: number, symbol: string, code: string, rate: number) {
  const amount = ((cents ?? 0) / 100) * (rate || 1);
  const minor = code === "JPY" || code === "NGN" ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "decimal",
      minimumFractionDigits: minor,
      maximumFractionDigits: minor,
    })
      .format(amount)
      .replace(/^/, symbol);
  } catch {
    return `${symbol}${amount.toFixed(minor)}`;
  }
}

async function detectDisplayCurrency(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem("nsc_visitor_currency");
    const cachedAt = Number(localStorage.getItem("nsc_visitor_currency_at") ?? 0);
    if (cached && Date.now() - cachedAt < 7 * 864e5) return cached;
    const res = await fetch("https://ipapi.co/currency/", { cache: "no-store" });
    if (!res.ok) return null;
    const code = (await res.text()).trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) {
      localStorage.setItem("nsc_visitor_currency", code);
      localStorage.setItem("nsc_visitor_currency_at", String(Date.now()));
      return code;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchRate(base: string, target: string): Promise<number | null> {
  if (base === target) return 1;
  try {
    const key = `nsc_fx_${base}_${target}`;
    const cached = localStorage.getItem(key);
    const cachedAt = Number(localStorage.getItem(key + "_at") ?? 0);
    if (cached && Date.now() - cachedAt < 6 * 3600 * 1000) return Number(cached);
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const j = await res.json();
    const rate = j?.rates?.[target];
    if (typeof rate === "number") {
      localStorage.setItem(key, String(rate));
      localStorage.setItem(key + "_at", String(Date.now()));
      return rate;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: s } = useSiteSettings();
  const base: Currency = (s?.currency as Currency | undefined) ?? DEFAULT_BASE;
  const [display, setDisplay] = useState<Currency>(base);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = await detectDisplayCurrency();
      if (!code || code === base.code) {
        if (!cancelled) {
          setDisplay(base);
          setRate(1);
        }
        return;
      }
      const r = await fetchRate(base.code, code);
      if (cancelled) return;
      if (r) {
        setDisplay({ code, symbol: SYMBOLS[code] ?? code + " " });
        setRate(r);
      } else {
        setDisplay(base);
        setRate(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base.code, base.symbol]);

  const value = useMemo<Ctx>(
    () => ({
      base,
      display,
      rate,
      format: (cents: number) => fmt(cents, display.symbol, display.code, rate),
    }),
    [base, display, rate],
  );

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useMoney() {
  const c = useContext(CurrencyCtx);
  if (c) return c;
  return {
    base: DEFAULT_BASE,
    display: DEFAULT_BASE,
    rate: 1,
    format: (cents: number) => fmt(cents, DEFAULT_BASE.symbol, DEFAULT_BASE.code, 1),
  } satisfies Ctx;
}

export function formatBase(cents: number, base?: Currency) {
  const c = base ?? DEFAULT_BASE;
  return fmt(cents, c.symbol, c.code, 1);
}
