import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import type { StaffPermission } from "@/lib/auth";
import { Icon } from "@/components/site/Icon";
import { SiteContentTab } from "@/components/admin/SiteContentTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { StaffsTab } from "@/components/admin/StaffsTab";
import { AccountsTab } from "@/components/admin/AccountsTab";
import { NotificationsTab } from "@/components/admin/NotificationsTab";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/settings";
import { SimpleAdmin } from "@/components/simple/SimpleAdmin";
import { SubscriptionBanner } from "@/components/simple/SubscriptionBanner";

const VIEW_KEY = "nsc_admin_view";
type ViewMode = "full" | "simple";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type TabId = StaffPermission;

const TABS: { id: TabId; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: "content", label: "Site Content", icon: "color-palette-outline" },
  { id: "products", label: "Products", icon: "cube-outline" },
  { id: "orders", label: "Orders", icon: "receipt-outline" },
  { id: "staffs", label: "Staffs", icon: "people-outline", adminOnly: true },
  { id: "accounts", label: "Accounts", icon: "cash-outline" },
  { id: "notifications", label: "Notifications", icon: "notifications-outline" },
];

function AdminPage() {
  const { session, role, permissions, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useSiteSettings();
  const [tab, setTab] = useState<TabId>("content");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrders, setNewOrders] = useState(0);
  // Admins keep the full dashboard unless they deliberately switch to the
  // simple view; staff always get the simple view.
  const [viewPref, setViewPref] = useState<ViewMode | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(VIEW_KEY) === "simple" ? "simple" : null;
    } catch {
      return null;
    }
  });
  const view: ViewMode = role === "admin" ? (viewPref ?? "full") : "simple";

  const setView = (next: ViewMode) => {
    setViewPref(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("orders-notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        setNewOrders((n) => n + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session]);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => role === "admin" || (!t.adminOnly && permissions.includes(t.id))),
    [permissions, role],
  );

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === tab)) setTab(visibleTabs[0].id);
  }, [tab, visibleTabs]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center">
        Your Admin Dashboard is Loading. . .
      </div>
    );
  }
  if (!role) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">No access</h1>
          <p className="text-muted-foreground mt-2">
            Your account isn't a staff or admin. Ask an admin to add you from the Staffs tab.
          </p>
          <button onClick={signOut} className="btn-primary mt-4">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (view === "simple") {
    return <SimpleAdmin onSwitchToFull={role === "admin" ? () => setView("full") : undefined} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      <aside
        className={`fixed lg:sticky top-0 z-50 h-screen w-72 bg-card border-r border-border transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="p-5 border-b border-border flex items-center gap-2">
          <div className="h-9 w-9 grid place-items-center overflow-hidden">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings?.brand ?? "Newman Stores Collections"}
                className="h-full w-full object-cover"
              />
            ) : (
              (settings?.brand ?? "Newman Stores Collections").charAt(0)
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold truncate">{settings?.brand ?? "Admin"}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {role} panel
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSidebarOpen(false);
                if (t.id === "notifications") setNewOrders(0);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-foreground/5 text-foreground/80"
              }`}
            >
              <Icon name={t.icon} size={18} />
              <span className="flex-1 text-left">{t.label}</span>
              {t.id === "notifications" && newOrders > 0 && (
                <span className="min-w-[20px] h-5 px-1 rounded-full bg-destructive text-white text-[11px] font-semibold grid place-items-center">
                  {newOrders}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground truncate mb-2 px-2">
            {session.user.email}
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-foreground/5 text-sm"
          >
            <Icon name="log-out-outline" size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 lg:pl-0">
        <header className="sticky top-0 z-30 glass-nav px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            aria-label="Menu"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/5"
          >
            <Icon name="menu-outline" size={22} />
          </button>
          <h1 className="font-display text-lg sm:text-xl font-bold truncate">
            {visibleTabs.find((t) => t.id === tab)?.label}
          </h1>
          <button
            onClick={() => setView("simple")}
            className="ml-auto inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-foreground/5"
          >
            <Icon name="grid-outline" size={15} /> Simple view
          </button>
        </header>
        <main className="p-4 sm:p-6 max-w-6xl mx-auto">
          <SubscriptionBanner className="mb-5" />
          {tab === "content" && <SiteContentTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "staffs" && <StaffsTab currentRole={role} />}
          {tab === "accounts" && <AccountsTab />}
          {tab === "notifications" && <NotificationsTab />}
        </main>
      </div>
    </div>
  );
}
