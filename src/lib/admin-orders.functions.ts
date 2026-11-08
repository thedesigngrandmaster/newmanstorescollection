import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReceiptOrder } from "@/lib/receipts/generateReceipt";

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
  .validator((data) =>
    z
      .object({
        id: z.string().min(1), // now accepts order_id
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.id,
    );

    // Look the order up first instead of using an `id.eq.<order_id>` OR filter:
    // comparing a non-UUID order_id against the UUID id column makes Postgres
    // throw `invalid input syntax for type uuid`.
    let existing: { id: string } | null = null;
    const byOrderId = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_id", data.id)
      .maybeSingle();
    if (byOrderId.error) throw byOrderId.error;
    existing = byOrderId.data;

    if (!existing && isUuid) {
      const byId = await supabaseAdmin.from("orders").select("*").eq("id", data.id).maybeSingle();
      if (byId.error) throw byId.error;
      existing = byId.data;
    }

    if (!existing) throw new Error("Order not found.");

    const { data: updatedOrder, error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;

    // Generating the receipt must never block the status change: the order is
    // already updated, so surface a warning instead of reporting failure.
    let receiptError: string | undefined;
    let receiptUrl: string | undefined;
    if (data.status === "paid" && updatedOrder) {
      try {
        const { generateAndUploadReceipt } = await import("@/lib/receipts/generateReceipt");
        receiptUrl = await generateAndUploadReceipt(updatedOrder);

        // The deployed database stores receipt links inside the customer JSON
        // (the public upload RPC does the same). Do not rely on a top-level
        // receipt_url column that may not exist yet.
        const currentCustomer =
          updatedOrder.customer &&
          typeof updatedOrder.customer === "object" &&
          !Array.isArray(updatedOrder.customer)
            ? updatedOrder.customer
            : {};
        const receiptUpdate = await supabaseAdmin
          .from("orders")
          .update({
            customer: {
              ...currentCustomer,
              receipt_url: receiptUrl,
              receipt_generated_at: new Date().toISOString(),
            },
          })
          .eq("id", updatedOrder.id);
        if (receiptUpdate.error) throw receiptUpdate.error;
      } catch (err) {
        console.error("Receipt generation failed:", err);
        receiptError = err instanceof Error ? err.message : String(err);
      }
    }

    return { ok: true, receiptError, receiptUrl };
  });

/**
 * Generate (or regenerate) a receipt for an existing order. This lets admins
 * fix older paid orders that were created before receipt generation worked.
 */
export const generateAdminOrderReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permission: "orders",
    });
    if (permissionError) throw permissionError;
    if (!allowed) throw new Error("You do not have permission to manage orders.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.id,
    );

    let existing: (ReceiptOrder & { id: string }) | null = null;
    const byOrderId = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_id", data.id)
      .maybeSingle();
    if (byOrderId.error) throw byOrderId.error;
    existing = byOrderId.data;

    if (!existing && isUuid) {
      const byId = await supabaseAdmin.from("orders").select("*").eq("id", data.id).maybeSingle();
      if (byId.error) throw byId.error;
      existing = byId.data;
    }

    if (!existing) throw new Error("Order not found.");

    const { generateAndUploadReceipt } = await import("@/lib/receipts/generateReceipt");
    const receiptUrl = await generateAndUploadReceipt(existing);

    const currentCustomer =
      existing.customer && typeof existing.customer === "object" && !Array.isArray(existing.customer)
        ? existing.customer
        : {};
    const update = await supabaseAdmin
      .from("orders")
      .update({
        customer: {
          ...currentCustomer,
          receipt_url: receiptUrl,
          receipt_generated_at: new Date().toISOString(),
        },
      })
      .eq("id", existing.id);
    if (update.error) throw update.error;

    return { ok: true, receiptUrl };
  });

export const deleteAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().min(1) }).parse(data))
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

    const { error } = await supabaseAdmin.from("orders").delete().eq("order_id", data.id);

    if (error) throw error;
    return { ok: true };
  });
