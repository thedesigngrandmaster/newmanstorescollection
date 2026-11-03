import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "staff" | null;
export type StaffPermission =
  | "content"
  | "products"
  | "orders"
  | "staffs"
  | "accounts"
  | "notifications";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: Role;
  permissions: StaffPermission[];
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) void loadRole(s.user.id);
      else {
        setRole(null);
        setPermissions([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadRole(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();

    async function loadRole(userId: string) {
      const cacheKey = `nsc_role_${userId}`;

      const restoreCachedRole = () => {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (!raw) return false;
          const cached = JSON.parse(raw) as {
            role?: "admin" | "staff";
            permissions?: StaffPermission[];
          };
          if (cached.role !== "admin" && cached.role !== "staff") return false;
          setRole(cached.role);
          setPermissions(Array.isArray(cached.permissions) ? cached.permissions : []);
          return true;
        } catch {
          return false;
        }
      };

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, permissions")
          .eq("user_id", userId)
          .order("role", { ascending: true });

        // Network unavailable: keep the dashboard usable with the role this
        // device last saw. Real permissions are still enforced server-side.
        if (error) {
          restoreCachedRole();
          return;
        }

        if (data && data.length > 0) {
          const roleRows = data as unknown as Array<{
            role: "admin" | "staff";
            permissions?: StaffPermission[];
          }>;
          const roles = roleRows.map((r) => r.role);
          const resolvedRole: "admin" | "staff" = roles.includes("admin") ? "admin" : "staff";
          const all: StaffPermission[] = [
            "content",
            "products",
            "orders",
            "staffs",
            "accounts",
            "notifications",
          ];
          const resolvedPermissions =
            resolvedRole === "admin"
              ? all
              : Array.from(new Set(roleRows.flatMap((r) => r.permissions ?? [])));
          setRole(resolvedRole);
          setPermissions(resolvedPermissions);
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ role: resolvedRole, permissions: resolvedPermissions }),
            );
          } catch {
            // ignore
          }
        } else {
          setRole(null);
          setPermissions([]);
          try {
            localStorage.removeItem(cacheKey);
          } catch {
            // ignore
          }
        }
      } catch {
        restoreCachedRole();
      }
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        permissions,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
