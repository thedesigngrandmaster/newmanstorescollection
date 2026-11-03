import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSimpleStats } from "@/lib/simple-admin/simple.functions";

export { getSimpleStats };

/**
 * Creates a product on behalf of the simplified dashboard's offline sync.
 * The offline layer can't rely on the browser session being fresh, so this
 * mirrors saveAdminProduct's permission check with a tolerant input shape.
 */
export const createSyncedProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(1),
        slug: z.string().trim().min(1),
        price_cents: z.number().int().min(0),
        description: z.string().nullable(),
        sizes: z.array(z.string()),
        colors: z.array(z.string()).max(24),
        stock: z.number().int().min(0),
        images: z.array(z.string()).max(4),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permission: "products",
    });
    if (!allowed) throw new Error("You do not have permission to add products.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      slug: data.slug,
      brand: null,
      category_id: null,
      subcategory_id: null,
      price_cents: data.price_cents,
      description: data.description,
      sizes: data.sizes,
      stock: data.stock,
      sold_out: data.stock <= 0,
      images: data.images,
      featured: false,
      cc: null,
      has_other_colors: data.colors.length > 0,
      colors: data.colors,
    };
    const { data: created, error } = await supabaseAdmin.from("products").insert(payload).select("id, slug").single();
    if (error) throw error;
    return { slug: created.slug as string };
  });
