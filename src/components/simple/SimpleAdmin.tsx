import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listQueue, type QueuedProduct } from "@/lib/simple-admin/offlineQueue";
import { syncQueue } from "@/lib/simple-admin/syncQueue";
import { useSimpleStats } from "@/lib/simple-admin/useSimpleStats";
import { formatBase } from "@/lib/currency";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/settings";
import { Icon } from "@/components/site/Icon";
import { SubscriptionBanner } from "@/components/simple/SubscriptionBanner";
import { SimpleProducts } from "@/components/simple/SimpleProducts";
import { SimpleAccounts } from "@/components/simple/SimpleAccounts";

type Screen = "home" | "products" | "accounts";

/**
 * Simplified, mobile-first dashboard for non-technical users: an app grid
 * (Overview / Products / Accounts / Logout — no Staffs), an offline-first
 * WhatsApp-style product flow, and the revenue-based subscription reminder.
 */
export function SimpleAdmin({ onSwitchToFull }: { onSwitchToFull?: () => void }) {
  const { role, signOut } = useAuth();
  const { data: settings } = useSiteSettings();
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>("home");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const { data: stats, isPlaceholderData } = useSimpleStats();

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const refreshPending = useCallback(async () => {
    const q: QueuedProduct[] = await listQueue();
    setPending(q.filter((i) => i.status !== "synced").length);
  }, []);

  useEffect(() => {
    void refreshPending();
    const t = setInterval(() => void refreshPending(), 30_000);
    return () => clearInterval(t);
  }, [refreshPending]);

  // Keep the queue draining even if the user never opens the Add Product chat
  // again: sync when internet returns and every minute while online.
  const drainQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const items = await syncQueue();
    if (items.some((i) => i.status === "synced")) {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["simple-stats"] });
    }
    await refreshPending();
  }, [queryClient, refreshPending]);

  useEffect(() => {
    const onOnline = () => void drainQueue();
    window.addEventListener("online", onOnline);
    const t = setInterval(() => {
      if (navigator.onLine) void drainQueue();
    }, 60_000);
    if (navigator.onLine) void drainQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
  }, [drainQueue]);

  const tiles: {
    id: string;
    label: string;
    hint: string;
    icon: string;
    onClick: () => void;
    highlight?: boolean;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      hint: "Today's snapshot",
      icon: "home-outline",
      onClick: () => setScreen("home"),
      highlight: screen === "home",
    },
    {
      id: "products",
      label: "Products",
      hint: "Add, view, change, remove",
      icon: "cube-outline",
      onClick: () => setScreen("products"),
    },
    {
      id: "accounts",
      label: "Accounts",
      hint: "Money that has come in",
      icon: "cash-outline",
      onClick: () => setScreen("accounts"),
    },
    {
      id: "logout",
      label: "Logout",
      hint: "Sign out of this device",
      icon: "log-out-outline",
      onClick: () => void signOut(),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden border border-border bg-card">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings?.brand ?? "Newman Stores Collections"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center font-display font-bold">
                {(settings?.brand ?? "Newman Stores Collections").charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold truncate">
              {settings?.brand ?? "Newman Stores Collections"} — Store Manager
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {role ?? "staff"} · {online ? "online" : "offline"}
            </div>
          </div>
          {onSwitchToFull && (
            <button
              onClick={onSwitchToFull}
              className="border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-foreground/5"
            >
              Full view
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4 pb-16">
        <SubscriptionBanner />

        {/* Offline / pending status */}
        {pending > 0 && (
          <div className="flex items-center gap-2 border border-border bg-card px-4 py-3 text-sm">
            <Icon name={online ? "cloud-outline" : "cloud-offline-outline"} size={16} />
            <span className="flex-1">
              {pending} product{pending === 1 ? "" : "s"} waiting to send
              {online ? " — sending automatically…" : " — will send when internet returns"}
            </span>
            {online && (
              <button
                onClick={() => void drainQueue()}
                className="bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground"
              >
                Send now
              </button>
            )}
          </div>
        )}

        {!online && (
          <div className="flex items-center gap-2 border border-border bg-card px-4 py-3 text-sm">
            <Icon name="cloud-offline-outline" size={16} />
            <span className="flex-1">
              You're offline. You can still add products — they will be saved on this phone.
            </span>
          </div>
        )}

        {screen === "home" && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Money that has come in"
                value={stats ? formatBase(stats.revenueCents) : "…"}
              />
              <StatCard label="Orders waiting" value={stats ? String(stats.pendingOrders) : "…"} />
              <StatCard label="Products listed" value={stats ? String(stats.productCount) : "…"} />
            </div>

            {/* App grid */}
            <div className="grid grid-cols-2 gap-3">
              {tiles.map((t) => (
                <button
                  key={t.id}
                  onClick={t.onClick}
                  className={`flex min-h-[120px] flex-col items-start justify-between gap-2 border p-5 text-left transition-colors ${
                    t.highlight
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-foreground/5"
                  }`}
                >
                  <Icon name={t.icon} size={30} />
                  <span>
                    <span className="block font-display text-lg font-bold">{t.label}</span>
                    <span
                      className={`text-xs ${t.highlight ? "opacity-80" : "text-muted-foreground"}`}
                    >
                      {t.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {isPlaceholderData
                ? "Offline — these are the last numbers saved on this phone. They update when internet returns."
                : 'Tip: you can add products even without internet — open Products, then "Add Product".'}
            </p>
          </>
        )}

        {screen === "products" && (
          <div>
            <button
              onClick={() => setScreen("home")}
              className="mb-4 inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-foreground/5"
            >
              <Icon name="arrow-back-outline" size={16} /> Home
            </button>
            <SimpleProducts />
          </div>
        )}

        {screen === "accounts" && (
          <div>
            <button
              onClick={() => setScreen("home")}
              className="mb-4 inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-foreground/5"
            >
              <Icon name="arrow-back-outline" size={16} /> Home
            </button>
            <SimpleAccounts />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-display text-xl font-bold" title={value}>
        {value}
      </div>
    </div>
  );
}
