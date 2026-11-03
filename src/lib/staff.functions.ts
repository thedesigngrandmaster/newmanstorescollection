import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const permissionSchema = z.enum(["content", "products", "orders", "staffs", "accounts", "notifications"]);

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; role: "admin" | "staff"; permissions?: string[] }) =>
    z.object({ email: z.string().email(), password: z.string().min(6), role: z.enum(["admin", "staff"]), permissions: z.array(permissionSchema).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can add staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    const uid = created.data.user?.id;
    if (!uid) throw new Error("No user id returned");
    const permissions = data.role === "admin"
      ? ["content", "products", "orders", "staffs", "accounts", "notifications"]
      : (data.permissions?.length ? data.permissions : ["products", "orders", "notifications"]);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role, permissions });
    if (error) throw error;
    const generated = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    return { ok: true, userId: uid, loginLink: generated.data?.properties?.action_link ?? null, temporaryPassword: data.password };
  });

export const updateStaffPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "staff"; permissions: string[] }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "staff"]), permissions: z.array(permissionSchema) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can update staff permissions");
    if (data.userId === context.userId && data.role !== "admin") throw new Error("You can't demote yourself");
    const permissions = data.role === "admin"
      ? ["content", "products", "orders", "staffs", "accounts", "notifications"]
      : data.permissions;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role, permissions });
    if (error) throw error;
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can remove staff");
    if (data.userId === context.userId) throw new Error("You can't remove yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff_or_admin", { _user_id: context.userId });
    if (!isStaff) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const roles = await supabaseAdmin.from("user_roles").select("user_id, role, created_at");
    if (roles.error) throw roles.error;
    const list = await supabaseAdmin.auth.admin.listUsers();
    if (list.error) throw list.error;
    return ((roles.data ?? []) as Array<{ user_id: string; role: "admin" | "staff"; permissions?: string[]; created_at: string }>).map((r) => {
      const u = list.data.users.find((x) => x.id === r.user_id);
      return {
        userId: r.user_id,
        email: u?.email ?? "(unknown)",
        role: r.role as "admin" | "staff",
        permissions: (r.permissions ?? []) as string[],
        createdAt: r.created_at,
      };
    });
  });