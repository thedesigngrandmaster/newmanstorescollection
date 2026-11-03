import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc("has_permission", { _user_id: context.userId, _permission: "products" });
    if (!allowed) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.union([   z.string().uuid(),   z.literal(""),   z.null(),   z.undefined() ]).optional(),
        name: z.string().trim().min(1),
        slug: z.string().trim().min(1),
        brand: z.string().nullable(),
        category_id: z.string().uuid().nullable(),
        subcategory_id: z.string().uuid().nullable(),
        price_cents: z.number().int().min(0),
        description: z.string().nullable(),
        sizes: z.array(z.string()),
        stock: z.number().int().min(0),
        sold_out: z.boolean(),
        images: z.array(z.string()).max(4),
        featured: z.boolean(),
        cc: z.string().nullable(),
        has_other_colors: z.boolean(),
        colors: z.array(z.string()).max(24),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_permission", { _user_id: context.userId, _permission: "products" });
    if (!allowed) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      slug: data.slug,
      brand: data.brand,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      price_cents: data.price_cents,
      description: data.description,
      sizes: data.sizes,
      stock: data.stock,
      sold_out: data.sold_out,
      images: data.images,
      featured: data.featured,
      cc: data.cc,
      has_other_colors: data.has_other_colors,
      colors: data.colors,
    };
    const result = data.id
      ? await supabaseAdmin.from("products").update(payload).eq("id", data.id)
      : await supabaseAdmin.from("products").insert(payload);
    if (result.error) throw result.error;
    return { ok: true };
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid("Invalid product ID"),
      })
      .parse(data)
  )
   .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_permission", { _user_id: context.userId, _permission: "products" });
    if (!allowed) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
