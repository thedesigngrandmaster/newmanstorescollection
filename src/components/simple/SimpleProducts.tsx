import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteAdminProduct,
  listAdminProducts,
  saveAdminProduct,
  setAdminProductSoldOut,
} from "@/lib/admin-products.functions";
import { formatBase } from "@/lib/currency";
import { Icon } from "@/components/site/Icon";
import { AddProductChat } from "@/components/simple/AddProductChat";
import { BulkAddProducts } from "@/components/simple/BulkAddProducts";
import { InstagramShareDialog } from "@/components/share/InstagramShareDialog";
import { PRODUCTS_CACHE_KEY, readCache, writeCache } from "@/lib/simple-admin/localCache";
import { uploadMedia } from "@/lib/upload";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  price_cents: number;
  description: string | null;
  sizes: string[] | null;
  stock: number;
  sold_out: boolean;
  images: string[] | null;
  featured: boolean | null;
  cc: string | null;
  has_other_colors: boolean | null;
  colors: string[] | null;
};

type Mode = "menu" | "add" | "bulk" | "view" | "modify" | "delete" | "share";

/** Products app for the simplified dashboard: Add / View / Modify / Delete / Share. */
export function SimpleProducts() {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "add")
    return (
      <Screen title="Add Product" onBack={() => setMode("menu")}>
        <AddProductChat />
      </Screen>
    );
  if (mode === "bulk")
    return (
      <Screen title="Add Many Products" onBack={() => setMode("menu")}>
        <BulkAddProducts />
      </Screen>
    );
  if (mode === "view")
    return <ListScreen title="View Products" onBack={() => setMode("menu")} readOnly />;
  if (mode === "modify")
    return <ListScreen title="Modify Products" onBack={() => setMode("menu")} onEdit />;
  if (mode === "delete")
    return <ListScreen title="Delete Products" onBack={() => setMode("menu")} onDelete />;
  if (mode === "share")
    return (
      <Screen title="Share to Instagram" onBack={() => setMode("menu")}>
        <ShareProductsScreen />
      </Screen>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ActionTile
        icon="images-outline"
        label="Add Many Products"
        hint="Upload a whole batch at once"
        onClick={() => setMode("bulk")}
        highlight
      />
      <ActionTile
        icon="add-outline"
        label="Add One Product"
        hint="Chat it in — even offline"
        onClick={() => setMode("add")}
      />
      <ActionTile
        icon="eye-outline"
        label="View Products"
        hint="See everything you sell"
        onClick={() => setMode("view")}
      />
      <ActionTile
        icon="logo-instagram"
        label="Share to Instagram"
        hint="Pick 1–3 products for an ad post"
        onClick={() => setMode("share")}
      />
      <ActionTile
        icon="create-outline"
        label="Modify Products"
        hint="Change price, stock or details"
        onClick={() => setMode("modify")}
      />
      <ActionTile
        icon="trash-outline"
        label="Delete Products"
        hint="Remove a product for good"
        onClick={() => setMode("delete")}
      />
    </div>
  );
}

function ActionTile({
  icon,
  label,
  hint,
  onClick,
  highlight,
}: {
  icon: string;
  label: string;
  hint: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-2 border p-5 text-left transition-colors ${
        highlight
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border hover:bg-foreground/5"
      }`}
    >
      <Icon name={icon} size={26} />
      <span className="font-display text-lg font-bold">{label}</span>
      <span className={`text-xs ${highlight ? "opacity-80" : "text-muted-foreground"}`}>
        {hint}
      </span>
    </button>
  );
}

function Screen({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <BackBar title={title} onBack={onBack} />
      {children}
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mb-4 inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-foreground/5"
    >
      <Icon name="arrow-back-outline" size={16} /> {title}
    </button>
  );
}

function ListScreen({
  title,
  onBack,
  readOnly,
  onEdit,
  onDelete,
}: {
  title: string;
  onBack: () => void;
  readOnly?: boolean;
  onEdit?: boolean;
  onDelete?: boolean;
}) {
  const listProducts = useServerFn(listAdminProducts);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [sharing, setSharing] = useState<AdminProduct | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await listProducts()) as unknown as AdminProduct[],
    placeholderData: () => readCache<AdminProduct[]>(PRODUCTS_CACHE_KEY),
  });
  useEffect(() => {
    if (products) writeCache(PRODUCTS_CACHE_KEY, products);
  }, [products]);

  if (editing) {
    return (
      <Screen title={title} onBack={() => setEditing(null)}>
        <EditProduct
          row={editing}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-products"] });
          }}
        />
      </Screen>
    );
  }

  return (
    <div>
      <BackBar title={title} onBack={onBack} />
      {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading your products…</div>}
      {isError && !products && (
        <div className="border border-border bg-card p-6 text-sm text-muted-foreground">
          We can't load products right now. If you're offline, connect once so this phone can save
          your product list. If you're online, ask the site admin for Products access.
        </div>
      )}
      {!online && (
        <div className="mb-3 flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <Icon name="cloud-offline-outline" size={14} /> Offline — you can add products, but
          changing or deleting needs internet.
        </div>
      )}
      {!isLoading && !isError && (products ?? []).length === 0 && (
        <div className="border border-border bg-card p-6 text-sm text-muted-foreground">
          No products yet. Tap Back, then "Add Product" to add your first one.
        </div>
      )}
      <div className="space-y-3">
        {(products ?? []).map((p) => (
          <div key={p.id} className="flex items-center gap-3 border border-border bg-card p-3">
            <img
              src={p.images?.[0] || "/favicon.png"}
              alt={p.name}
              className="h-16 w-16 shrink-0 object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.name}</div>
              <div className="text-sm">{formatBase(p.price_cents)}</div>
              <div className="text-xs text-muted-foreground">
                {p.sold_out || (p.stock ?? 0) <= 0 ? "Sold out" : `${p.stock} in stock`}
                {p.colors && p.colors.length > 0 ? ` · ${p.colors.join(", ")}` : ""}
              </div>
            </div>
            <button
              onClick={() => setSharing(p)}
              className="grid h-11 w-11 shrink-0 place-items-center border border-border hover:bg-foreground/5"
              aria-label={`Share ${p.name} to Instagram`}
              title="Share to Instagram"
            >
              <Icon name="logo-instagram" size={18} />
            </button>
            {onEdit && (
              <button
                onClick={() => setEditing(p)}
                disabled={!online}
                className="grid h-11 w-11 shrink-0 place-items-center border border-border hover:bg-foreground/5 disabled:opacity-40"
                aria-label={`Modify ${p.name}`}
              >
                <Icon name="create-outline" size={18} />
              </button>
            )}
            {onDelete && <DeleteButton id={p.id} name={p.name} disabled={!online} />}
          </div>
        ))}
      </div>
      {sharing && (
        <InstagramShareDialog products={[sharing]} onClose={() => setSharing(null)} />
      )}
    </div>
  );
}

/**
 * Pick one to three products and turn them into an Instagram ad post: product
 * photo(s), a ready-to-edit caption and the shop/product link.
 */
function ShareProductsScreen() {
  const listProducts = useServerFn(listAdminProducts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await listProducts()) as unknown as AdminProduct[],
    placeholderData: () => readCache<AdminProduct[]>(PRODUCTS_CACHE_KEY),
  });
  useEffect(() => {
    if (products) writeCache(PRODUCTS_CACHE_KEY, products);
  }, [products]);

  const selected = (products ?? []).filter((p) => selectedIds.includes(p.id));

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= 3 ? prev : [...prev, id];
    });
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Choose 1–3 products. We&apos;ll prepare the photos, a caption and your shop link so you can
        post or boost them on Instagram.
      </p>
      {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading your products…</div>}
      {isError && !products && (
        <div className="border border-border bg-card p-6 text-sm text-muted-foreground">
          We can&apos;t load products right now. Connect once so this phone can save your product
          list, then try again.
        </div>
      )}
      <div className="space-y-3">
        {(products ?? []).map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const isFull = selectedIds.length >= 3 && !isSelected;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={isFull}
              className={`flex w-full items-center gap-3 border p-3 text-left transition-colors disabled:opacity-40 ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-foreground/5"
              }`}
            >
              <img
                src={p.images?.[0] || "/favicon.png"}
                alt={p.name}
                className="h-16 w-16 shrink-0 object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="text-sm">{formatBase(p.price_cents)}</div>
                <div className="text-xs text-muted-foreground">
                  {p.sizes && p.sizes.length > 0 ? `Sizes ${p.sizes.join(", ")}` : "No sizes listed"}
                </div>
              </div>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center border ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background"
                }`}
                aria-hidden
              >
                {isSelected && <Icon name="checkmark-outline" size={16} />}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setSharing(true)}
        disabled={selected.length === 0}
        className="btn-primary mt-4 w-full disabled:opacity-50"
      >
        <Icon name="logo-instagram" size={18} /> Create ad post ({selected.length}/3)
      </button>
      {sharing && selected.length > 0 && (
        <InstagramShareDialog products={selected} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}

function DeleteButton({ id, name, disabled }: { id: string; name: string; disabled?: boolean }) {
  const deleteProduct = useServerFn(deleteAdminProduct);
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className="grid h-11 w-11 shrink-0 place-items-center border border-border hover:bg-foreground/5 disabled:opacity-40"
        aria-label={`Delete ${name}`}
      >
        <Icon name="trash-outline" size={18} />
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          disabled={busy || disabled}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await deleteProduct({ data: { id } });
              qc.invalidateQueries({ queryKey: ["admin-products"] });
              qc.invalidateQueries({ queryKey: ["simple-stats"] });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not delete. Try again.");
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
          className="bg-destructive px-3 py-2 text-xs font-bold uppercase text-destructive-foreground disabled:opacity-50"
        >
          {busy ? "…" : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="border border-border px-3 py-2 text-xs font-bold uppercase"
        >
          Keep
        </button>
      </div>
      {error && (
        <div className="max-w-[220px] text-right text-[11px] text-destructive">{error}</div>
      )}
    </div>
  );
}

function EditProduct({ row, onDone }: { row: AdminProduct; onDone: () => void }) {
  const saveProduct = useServerFn(saveAdminProduct);
  const updateSoldOut = useServerFn(setAdminProductSoldOut);
  const qc = useQueryClient();
  const [name, setName] = useState(row.name);
  const [priceNaira, setPriceNaira] = useState(String(Math.round((row.price_cents ?? 0) / 100)));
  const [stock, setStock] = useState(String(row.stock ?? 0));
  const [soldOut, setSoldOut] = useState(!!row.sold_out);
  const [soldOutBusy, setSoldOutBusy] = useState(false);
  const [soldOutNote, setSoldOutNote] = useState("");
  const [description, setDescription] = useState(row.description ?? "");
  const [images, setImages] = useState(() => (row.images ?? []).filter(Boolean).slice(0, 4));
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggleSoldOut = async (next: boolean) => {
    setSoldOut(next);
    setSoldOutBusy(true);
    setSoldOutNote("");
    setError("");
    try {
      await updateSoldOut({ data: { id: row.id, sold_out: next } });
      setSoldOutNote(next ? "Marked as sold out." : "Made available again.");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["simple-stats"] });
    } catch (e) {
      setSoldOut(!next);
      setError(e instanceof Error ? e.message : "Could not update sold-out status. Try again.");
    } finally {
      setSoldOutBusy(false);
    }
  };

  const uploadPhoto = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingIndex(index);
    setError("");
    try {
      const url = await uploadMedia(file, "products");
      setImages((prev) => {
        const next = [...prev];
        next[index] = url;
        return next.filter(Boolean).slice(0, 4);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload that photo. Try again.");
    } finally {
      setUploadingIndex(null);
    }
  };

  const removePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (uploadingIndex !== null) return;
    setBusy(true);
    setError("");
    try {
      await saveProduct({
        data: {
          id: row.id,
          name: name.trim(),
          slug: row.slug,
          brand: row.brand,
          category_id: row.category_id,
          subcategory_id: row.subcategory_id,
          price_cents: Math.max(
            0,
            Math.round(Number(priceNaira.replace(/[^\d.]/g, "")) || 0) * 100,
          ),
          description: description || null,
          sizes: row.sizes ?? [],
          stock: Math.max(0, Math.round(Number(stock.replace(/\D/g, "")) || 0)),
          sold_out: soldOut,
          images: images.filter(Boolean).slice(0, 4),
          featured: !!row.featured,
          cc: row.cc,
          has_other_colors: !!row.has_other_colors,
          colors: row.colors ?? [],
        },
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 border border-border bg-card p-4">
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          Product photos
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => {
            const src = images[i];
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden border border-border bg-muted/40"
              >
                {src ? (
                  <>
                    <img
                      src={src}
                      alt={`${row.name} photo ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      disabled={busy || uploadingIndex !== null}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white disabled:opacity-50"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <Icon name="close-outline" size={14} />
                    </button>
                    <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/65 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy || uploadingIndex !== null}
                        onChange={(e) => {
                          void uploadPhoto(i, e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <label className="absolute inset-0 grid cursor-pointer place-items-center text-center text-muted-foreground hover:bg-foreground/5">
                    <span>
                      <Icon name="cloud-upload-outline" size={20} />
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide">
                        {i === 0 ? "Main photo" : "Add photo"}
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy || uploadingIndex !== null}
                      onChange={(e) => {
                        void uploadPhoto(i, e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                {uploadingIndex === i && (
                  <div className="absolute inset-0 grid place-items-center bg-black/60 text-[10px] font-bold uppercase tracking-wide text-white">
                    Uploading…
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Upload up to 4 photos. The first photo is the main one shown to customers. Tap Save changes
          when you&apos;re done.
        </p>
      </div>
      <Field label="Product name" value={name} onChange={setName} />
      <Field label="Price (₦)" value={priceNaira} onChange={setPriceNaira} inputMode="numeric" />
      <Field label="Stock (number)" value={stock} onChange={setStock} inputMode="numeric" />
      <div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={soldOut}
            disabled={soldOutBusy}
            onChange={(e) => void toggleSoldOut(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          {soldOutBusy
            ? "Updating sold-out status…"
            : "Mark as sold out (customers will see a \"Sold out\" tag)"}
        </label>
        {soldOutNote && <div className="mt-1 text-xs text-emerald-700">{soldOutNote}</div>}
        <div className="mt-1 text-[11px] text-muted-foreground">
          This saves immediately — you do not need to tap Save changes for it.
        </div>
      </div>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          Description
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary"
        />
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <button
        onClick={() => void save()}
        disabled={busy || uploadingIndex !== null || soldOutBusy}
        className="btn-primary w-full disabled:opacity-60"
      >
        {uploadingIndex !== null ? "Uploading photo…" : busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
