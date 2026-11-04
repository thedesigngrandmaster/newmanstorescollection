import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductView } from "@/routes/product.$slug";

/**
 * Public product URL used by the simplified admin confirmations:
 *   https://[site-domain]/products/[product-slug]
 * The original /product/[slug] route remains available too.
 */
export const Route = createFileRoute("/products/$slug")({
  component: ProductsSlugPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Couldn't load product</h1>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <Link to="/" className="mt-4 inline-block underline">
          Back to shop
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Product not found</h1>
        <Link to="/" className="mt-4 inline-block underline">
          Back to shop
        </Link>
      </div>
    </div>
  ),
});

function ProductsSlugPage() {
  const { slug } = Route.useParams();
  return <ProductView slug={slug} />;
}
