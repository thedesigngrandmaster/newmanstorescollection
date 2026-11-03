import { useSimpleStats } from "@/lib/simple-admin/useSimpleStats";
import { formatBase } from "@/lib/currency";
import { Icon } from "@/components/site/Icon";

/** Accounts app for the simplified dashboard: money that has come in. */
export function SimpleAccounts() {
  const { data: stats, isLoading, isError, isPlaceholderData } = useSimpleStats();

  if (isError && !stats) {
    return (
      <div className="border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        We can't load the money total right now. If you're offline, connect to the internet once so
        this phone can save the latest total. If you're online, ask the site admin for Accounts
        access.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
          <Icon name="cash-outline" size={16} /> Money that has come in
        </div>
        <div className="mt-3 font-display text-4xl sm:text-5xl font-bold break-words">
          {isLoading ? "…" : formatBase(stats?.revenueCents ?? 0)}
        </div>
        <p className="mt-2 text-sm opacity-80">
          Total sales from paid, processing, shipped and delivered orders.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border bg-card p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Waiting orders
          </div>
          <div className="mt-1 font-display text-2xl font-bold">{stats?.pendingOrders ?? 0}</div>
        </div>
        <div className="border border-border bg-card p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Products listed
          </div>
          <div className="mt-1 font-display text-2xl font-bold">{stats?.productCount ?? 0}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {isPlaceholderData
          ? "Offline — showing the last total saved on this device. It will refresh when internet returns."
          : "This updates every time you open this page while connected to the internet."}
      </p>
    </div>
  );
}
