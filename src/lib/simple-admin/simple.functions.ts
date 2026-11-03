import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SimpleStats = {
  revenueCents: number;
  pendingOrders: number;
  productCount: number;
};

/**
 * Snapshot for the simplified dashboard (Overview + Accounts + the
 * subscription reminder). Available to any signed-in user that has a role
 * (admin or staff) — returns aggregate numbers only, never private rows.
 */
export const getSimpleStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SimpleStats> => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw roleError;
    if (!roles || roles.length === 0) throw new Error("You do not have admin access.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [paidRes, pendingRes, productRes] = await Promise.all([
      supabaseAdmin.from("orders").select("total_cents").in("status", ["paid", "processing", "shipped", "delivered"]),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
    ]);

    if (paidRes.error) throw paidRes.error;

    const revenueCents = (paidRes.data ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0);
    return {
      revenueCents,
      pendingOrders: pendingRes.count ?? 0,
      productCount: productRes.count ?? 0,
    };
  });
