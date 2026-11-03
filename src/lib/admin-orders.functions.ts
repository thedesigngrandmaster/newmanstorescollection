import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permission: "orders",
    });
    if (permissionError) throw permissionError;
    if (!allowed) throw new Error("You do not have permission to manage orders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const updateAdminOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
  z
    .object({
      id: z.string().min(1),          // now accepts order_id
      status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]),
    })
    .parse(data),
)
  .handler(async ({ data, context }) => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permission: "orders",
    });
    if (permissionError) throw permissionError;
    if (!allowed) throw new Error("You do not have permission to manage orders.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: updatedOrder, error } = await supabaseAdmin
  .from("orders")
  .update({ status: data.status })
  .or(`id.eq.${data.id},order_id.eq.${data.id}`)
  .select("*")
  .single();

    if (error) throw error;

    // Generate receipt when status becomes "paid"
if (data.status === "paid" && updatedOrder) {
  try {
    const { generateAndUploadReceipt } = await import("@/lib/receipts/generateReceipt");
    const receiptUrl = await generateAndUploadReceipt(updatedOrder);

    await supabaseAdmin
      .from("orders")
      .update({ receipt_url: receiptUrl })
      .eq("order_id", updatedOrder.order_id);   // ← use order_id
  } catch (err: any) {
    console.error("Receipt generation failed:", err);
    throw new Error(`Receipt generation failed: ${err?.message || String(err)}`);
  }
}

    return { ok: true };
  });

export const deleteAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().min(1) }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // Only Admin can delete orders
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (roleError) throw roleError;
    if (roleData?.role !== "admin") {
      throw new Error("Only administrators can delete orders.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("order_id", data.id);

    if (error) throw error;
    return { ok: true };
  });
