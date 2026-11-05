import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/site/Icon";
import { compressImage } from "@/lib/simple-admin/compressImage";
import { parseProductFromText, type ParsedProduct } from "@/lib/simple-admin/parseProduct";
import {
  deleteQueued,
  listQueue,
  newQueueId,
  putQueued,
  type QueuedProduct,
  type QueueStatus,
} from "@/lib/simple-admin/offlineQueue";
import { syncQueue } from "@/lib/simple-admin/syncQueue";

type DraftStatus = "draft" | QueueStatus;

type Draft = {
  id: string;
  files: File[];
  urls: string[];
  name: string;
  price: string;
  stock: string;
  sizes: string;
  colors: string;
  description: string;
  status: DraftStatus;
  queueId?: string;
  link?: string;
  error?: string;
};

const MAX_PRODUCTS = 50;
const MAX_PHOTOS = 4;

function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isUsefulName(name?: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.replace(/[^a-z]/gi, "").length < 3) return false;
  return !/^(img|image|photo|dsc|pxl|screenshot|whatsapp image|whatsapp photo|product|item|untitled)\b/i.test(
    trimmed,
  );
}

/**
 * Filenames often contain model numbers and years (e.g. `jordan-4-2024`).
 * Only treat an unmarked number as a price when it is clearly in price range.
 */
function priceFromFileName(base: string): number | undefined {
  const parsed = parseProductFromText(base).priceNaira;
  if (parsed === undefined) return undefined;
  const explicit = /(?:₦|NGN|\bN(?=\s*\d))|\b\d+(?:\.\d+)?\s*k\b/i.test(base);
  if (explicit || parsed >= 10_000) return parsed;
  return undefined;
}

/** Turn a file name like `nike-air-max-45k.jpg` into a prefilled draft. */
function draftFromFile(file: File): Draft {
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parsed = parseProductFromText(base);
  const price = priceFromFileName(base);

  return {
    id: newDraftId(),
    files: [file],
    urls: [URL.createObjectURL(file)],
    name: isUsefulName(parsed.name) ? (parsed.name ?? "") : "",
    price: price ? String(price) : "",
    stock: parsed.stock !== undefined ? String(parsed.stock) : "1",
    sizes: parsed.sizes.join(", "),
    colors: parsed.colors.join(", "),
    description: parsed.description || "",
    status: "draft",
  };
}

function parsePriceInput(value: string): number | undefined {
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  let cleaned = raw.replace(/[₦,\s]/g, "");
  cleaned = cleaned.replace(/^ngn/i, "").replace(/^n(?=\d)/i, "");
  const hasK = /k$/.test(cleaned);
  cleaned = cleaned.replace(/k$/, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(hasK ? n * 1000 : n);
}

function parseStockInput(value: string): number | undefined {
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function parseSizesInput(value: string): string[] {
  const out: string[] = [];
  for (const part of value
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const range = /^(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3})$/i.exec(part);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (to >= from && to - from <= 40) {
        for (let n = from; n <= to; n++) out.push(String(n));
        continue;
      }
    }
    out.push(part);
  }
  return [...new Set(out)];
}

function parseColorsInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,/&]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

function statusText(draft: Draft): string | null {
  switch (draft.status) {
    case "queued":
      return "Saved — waiting to send…";
    case "syncing":
      return "Sending…";
    case "synced":
      return "Published";
    case "failed":
      return `${draft.error || "Could not send this product."} Tap Publish all to retry.`;
    default:
      return null;
  }
}

/** Bulk product creation for the simplified dashboard. */
export function BulkAddProducts() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const draftsRef = useRef<Draft[]>([]);
  draftsRef.current = drafts;

  const applyQueueStatuses = useCallback((updated: QueuedProduct[]) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (!draft.queueId) return draft;
        const item = updated.find((q) => q.id === draft.queueId);
        return item
          ? {
              ...draft,
              status: item.status,
              link: item.link,
              error: item.error,
            }
          : draft;
      }),
    );
  }, []);

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

  // Release preview URLs when the screen is left.
  useEffect(() => {
    return () => {
      for (const draft of draftsRef.current) {
        for (const url of draft.urls) URL.revokeObjectURL(url);
      }
    };
  }, []);

  // While a batch is sending, poll the queue so each card shows live progress.
  useEffect(() => {
    if (!publishing) return;
    const timer = setInterval(async () => {
      const queue = await listQueue();
      setDrafts((prev) =>
        prev.map((draft) => {
          if (!draft.queueId) return draft;
          const item = queue.find((q) => q.id === draft.queueId);
          return item
            ? {
                ...draft,
                status: item.status,
                link: item.link,
                error: item.error,
              }
            : draft;
        }),
      );
    }, 800);
    return () => clearInterval(timer);
  }, [publishing]);

  // If products were saved while offline, send them as soon as the connection
  // returns — even if the admin stays on this screen.
  const hasQueued = drafts.some((d) => d.status === "queued" || d.status === "syncing");
  const autoSyncRef = useRef(false);
  useEffect(() => {
    if (!online || publishing || !hasQueued) {
      autoSyncRef.current = false;
      return;
    }
    if (autoSyncRef.current) return;
    autoSyncRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const updated = await syncQueue();
        if (cancelled) return;
        const queuedIds = new Set(
          draftsRef.current
            .filter((draft) => draft.status === "queued" || draft.status === "syncing")
            .map((draft) => draft.queueId)
            .filter((id): id is string => Boolean(id)),
        );
        const mine = updated.filter((item) => queuedIds.has(item.id));
        const synced = mine.filter((item) => item.status === "synced").length;
        const failed = mine.filter((item) => item.status === "failed").length;
        applyQueueStatuses(updated);
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        queryClient.invalidateQueries({ queryKey: ["simple-stats"] });
        if (synced > 0 || failed > 0) {
          setMessage(
            failed > 0
              ? `${synced} published. ${failed} could not be sent — still saved on this phone. Tap Publish all to retry.`
              : `${synced} product${synced === 1 ? "" : "s"} published successfully.`,
          );
        }
      } finally {
        autoSyncRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online, publishing, hasQueued, applyQueueStatuses, queryClient]);

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDraft = (id: string) => {
    const target = drafts.find((d) => d.id === id);
    if (!target) return;
    if (target.queueId && target.status !== "synced") {
      void deleteQueued(target.queueId);
    }
    for (const url of target.urls) URL.revokeObjectURL(url);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const pickMany = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    const room = MAX_PRODUCTS - drafts.length;
    if (room <= 0) {
      setError(
        `You can add up to ${MAX_PRODUCTS} products in one batch. Publish this batch first, then add more.`,
      );
      return;
    }

    const files = picked.slice(0, room);
    setPreparing(true);
    setError(null);
    setMessage(null);

    try {
      // Compress in small parallel chunks so large selections stay responsive.
      const compressed: File[] = [];
      for (let i = 0; i < files.length; i += 4) {
        const chunk = await Promise.all(files.slice(i, i + 4).map(compressImage));
        compressed.push(...chunk);
      }
      setDrafts((prev) => [...prev, ...compressed.map(draftFromFile)]);
      if (picked.length > room) {
        setMessage(
          `Added the first ${room} photos. Publish this batch, then add the remaining ${picked.length - room}.`,
        );
      }
    } finally {
      setPreparing(false);
    }
  };

  const addPhotos = async (id: string, files: File[]) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft || files.length === 0) return;

    const room = MAX_PHOTOS - draft.files.length;
    if (room <= 0) return;

    setPreparing(true);
    try {
      const compressed = await Promise.all(files.slice(0, room).map(compressImage));
      const newUrls = compressed.map((file) => URL.createObjectURL(file));
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                files: [...d.files, ...compressed].slice(0, MAX_PHOTOS),
                urls: [...d.urls, ...newUrls].slice(0, MAX_PHOTOS),
              }
            : d,
        ),
      );
    } finally {
      setPreparing(false);
    }
  };

  const removePhoto = (id: string, url: string) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft || draft.urls.length <= 1) return;

    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const index = d.urls.indexOf(url);
        if (index < 0) return d;
        return {
          ...d,
          files: d.files.filter((_, i) => i !== index),
          urls: d.urls.filter((u) => u !== url),
        };
      }),
    );
    URL.revokeObjectURL(url);
  };

  const publishAll = async () => {
    if (publishing || preparing) return;

    const pending = drafts.filter((d) => d.status !== "synced");
    const invalid = pending.filter(
      (d) => !d.name.trim() || parsePriceInput(d.price) === undefined || d.files.length === 0,
    );
    if (invalid.length > 0) {
      setError(
        `Please add a product name and price for ${invalid.length} product${
          invalid.length === 1 ? "" : "s"
        }.`,
      );
      return;
    }

    setPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const queueIds: string[] = [];

      for (const draft of pending) {
        const queueId = draft.queueId ?? newQueueId();
        const priceNaira = parsePriceInput(draft.price);
        if (priceNaira === undefined) continue;

        const parsed: ParsedProduct = {
          name: draft.name.trim(),
          description: draft.description.trim(),
          priceNaira,
          sizes: parseSizesInput(draft.sizes),
          colors: parseColorsInput(draft.colors),
          stock: parseStockInput(draft.stock),
        };

        await putQueued({
          id: queueId,
          text: `${parsed.name}\n${parsed.priceNaira}`,
          images: draft.files,
          createdAt: Date.now(),
          status: "pending",
          parsed,
        });

        queueIds.push(queueId);
        updateDraft(draft.id, {
          queueId,
          status: "queued",
          error: undefined,
        });
      }

      if (!navigator.onLine) {
        setMessage(
          `Saved ${queueIds.length} product${
            queueIds.length === 1 ? "" : "s"
          } on this phone. They will send automatically when internet returns.`,
        );
        return;
      }

      const updated = await syncQueue();
      applyQueueStatuses(updated);

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["simple-stats"] });

      const mine = updated.filter((item) => queueIds.includes(item.id));
      const synced = mine.filter((item) => item.status === "synced").length;
      const failed = mine.filter((item) => item.status === "failed").length;

      if (failed > 0) {
        setMessage(
          `${synced} published. ${failed} could not be sent — still saved on this phone. Tap Publish all to retry.`,
        );
      } else {
        setMessage(`${synced} product${synced === 1 ? "" : "s"} published successfully.`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not publish the products. Please try again.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const pendingCount = drafts.filter((d) => d.status !== "synced").length;
  const syncedCount = drafts.filter((d) => d.status === "synced").length;

  return (
    <div className="space-y-4">
      <div className="border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center bg-primary text-primary-foreground">
            <Icon name="images-outline" size={22} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold">Add many products at once</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Select all your product photos together. Each photo becomes a product, and we&apos;ll
              read the name and price from the file name — you can change anything before
              publishing.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            className={`btn-primary inline-flex cursor-pointer items-center gap-2 ${
              preparing || publishing ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Icon name="add-outline" size={18} />
            {preparing ? "Preparing photos…" : "Choose photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={pickMany}
              disabled={preparing || publishing}
            />
          </label>
          <span className="text-sm text-muted-foreground">
            {drafts.length === 0
              ? `Up to ${MAX_PRODUCTS} products per batch`
              : `${drafts.length} product${drafts.length === 1 ? "" : "s"} in this batch`}
          </span>
        </div>

        {!online && (
          <div className="mt-3 flex items-center gap-2 border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <Icon name="cloud-offline-outline" size={14} />
            You&apos;re offline. You can still prepare the batch — it will be saved on this phone.
          </div>
        )}
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="border border-border bg-card p-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-lg font-bold">
              {drafts.length} product{drafts.length === 1 ? "" : "s"} ready
            </div>
            <div className="text-xs text-muted-foreground">
              Edit anything, then publish the whole batch.
            </div>
          </div>
          {syncedCount > 0 && (
            <div className="text-xs font-semibold text-primary">
              {syncedCount} of {drafts.length} published
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <BulkCard
            key={draft.id}
            draft={draft}
            index={index}
            disabled={publishing || (draft.status !== "draft" && draft.status !== "failed")}
            preparing={preparing}
            onChange={updateDraft}
            onAddPhotos={addPhotos}
            onRemovePhoto={removePhoto}
            onRemove={removeDraft}
          />
        ))}
      </div>

      {drafts.length > 0 && (
        <div className="sticky bottom-0 z-20 border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {publishing
                  ? "Publishing your products…"
                  : `${pendingCount} product${pendingCount === 1 ? "" : "s"} waiting to publish`}
              </div>
              <div className="text-xs text-muted-foreground">
                {online
                  ? "Keep this page open while the batch sends."
                  : "Saved on this phone and will send when internet returns."}
              </div>
            </div>
            <button
              onClick={() => void publishAll()}
              disabled={publishing || preparing || pendingCount === 0}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {publishing
                ? "Publishing…"
                : pendingCount === 0
                  ? "All published"
                  : `Publish all (${pendingCount})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkCard({
  draft,
  index,
  disabled,
  preparing,
  onChange,
  onAddPhotos,
  onRemovePhoto,
  onRemove,
}: {
  draft: Draft;
  index: number;
  disabled: boolean;
  preparing: boolean;
  onChange: (id: string, patch: Partial<Draft>) => void;
  onAddPhotos: (id: string, files: File[]) => void;
  onRemovePhoto: (id: string, url: string) => void;
  onRemove: (id: string) => void;
}) {
  const status = statusText(draft);
  const published = draft.status === "synced";

  return (
    <div className={`border bg-card p-4 ${published ? "border-primary/50" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-border bg-muted">
          <img
            src={draft.urls[0]}
            alt={`Product ${index + 1}`}
            className="h-full w-full object-cover"
          />
          {draft.urls.length > 1 && (
            <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              +{draft.urls.length - 1}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Product {index + 1}
            </span>
            <button
              onClick={() => onRemove(draft.id)}
              disabled={disabled}
              aria-label={`Remove product ${index + 1}`}
              className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
            >
              <Icon name="trash-outline" size={16} />
            </button>
          </div>

          <label className="mt-1 block">
            <span className="sr-only">Product name</span>
            <input
              value={draft.name}
              onChange={(e) => onChange(draft.id, { name: e.target.value })}
              disabled={disabled}
              placeholder="Product name"
              className="h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Price (₦)
              </span>
              <input
                value={draft.price}
                onChange={(e) => onChange(draft.id, { price: e.target.value })}
                disabled={disabled}
                inputMode="numeric"
                placeholder="45000"
                className="mt-1 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Stock
              </span>
              <input
                value={draft.stock}
                onChange={(e) => onChange(draft.id, { stock: e.target.value })}
                disabled={disabled}
                inputMode="numeric"
                placeholder="1"
                className="mt-1 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sizes</span>
          <input
            value={draft.sizes}
            onChange={(e) => onChange(draft.id, { sizes: e.target.value })}
            disabled={disabled}
            placeholder="40, 41, 42 or 40-45"
            className="mt-1 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Colours
          </span>
          <input
            value={draft.colors}
            onChange={(e) => onChange(draft.id, { colors: e.target.value })}
            disabled={disabled}
            placeholder="black, white"
            className="mt-1 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
          />
        </label>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
          More details &amp; photos
        </summary>

        <label className="mt-2 block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Description (optional)
          </span>
          <textarea
            value={draft.description}
            onChange={(e) => onChange(draft.id, { description: e.target.value })}
            disabled={disabled}
            rows={2}
            placeholder="Anything customers should know"
            className="mt-1 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary disabled:opacity-60"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {draft.urls.map((url) => (
            <div key={url} className="relative h-16 w-16 border border-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {draft.urls.length > 1 && !disabled && (
                <button
                  onClick={() => onRemovePhoto(draft.id, url)}
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center bg-destructive text-destructive-foreground"
                >
                  <Icon name="close-outline" size={12} />
                </button>
              )}
            </div>
          ))}

          {draft.files.length < MAX_PHOTOS && !disabled && (
            <label
              className={`grid h-16 w-16 cursor-pointer place-items-center border border-dashed border-border text-muted-foreground hover:bg-foreground/5 ${
                preparing ? "pointer-events-none opacity-40" : ""
              }`}
              title={`Add photos (up to ${MAX_PHOTOS})`}
            >
              <Icon name="add-outline" size={18} />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  onAddPhotos(draft.id, files);
                }}
              />
            </label>
          )}
        </div>
      </details>

      {status && (
        <div
          className={`mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs ${
            draft.status === "failed"
              ? "text-destructive"
              : draft.status === "synced"
                ? "text-primary"
                : "text-muted-foreground"
          }`}
        >
          <Icon
            name={
              draft.status === "synced"
                ? "checkmark-circle-outline"
                : draft.status === "failed"
                  ? "warning-outline"
                  : "cloud-outline"
            }
            size={14}
          />
          <span className="min-w-0 flex-1">
            {status}
            {draft.status === "synced" && draft.link && (
              <>
                {" · "}
                <a
                  href={draft.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline underline-offset-4"
                >
                  View product
                </a>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
