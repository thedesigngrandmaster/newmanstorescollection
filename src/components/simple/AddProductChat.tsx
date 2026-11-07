import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/site/Icon";
import {
  mergeParsedProducts,
  missingFields,
  parseProductFromText,
  type ParsedProduct,
} from "@/lib/simple-admin/parseProduct";
import {
  getQueued,
  listQueue,
  newQueueId,
  putQueued,
  type QueuedProduct,
} from "@/lib/simple-admin/offlineQueue";
import { syncQueue, syncQueuedItem } from "@/lib/simple-admin/syncQueue";

type ChatEntry = {
  id: string;
  role: "bot" | "user";
  text?: string;
  urls?: string[];
  status?: QueuedProduct["status"];
  link?: string;
  error?: string;
};

type Attachment = { file: File; url: string };

const WELCOME =
  "Hello! 👋 Add a product by typing its details — the name, price (like ₦45,000), sizes and colours — then attach 1 to 4 photos. This works even without internet: anything you add is saved on this phone and sent automatically when internet returns.";

const MAX_PHOTOS = 4;

function naira(n: number): string {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

/** Rich WhatsApp-style confirmation: what we understood + the live link. */
function summaryText(parsed?: ParsedProduct): string {
  if (!parsed) return "";
  const lines: string[] = [];
  if (parsed.name) {
    lines.push(`${parsed.name}${parsed.priceNaira ? ` — ${naira(parsed.priceNaira)}` : ""}`);
  } else if (parsed.priceNaira) {
    lines.push(naira(parsed.priceNaira));
  }
  if (parsed.sizes.length > 0) lines.push(`Sizes: ${parsed.sizes.join(", ")}`);
  if (parsed.colors.length > 0) lines.push(`Colours: ${parsed.colors.join(", ")}`);
  return lines.join("\n");
}

function successText(parsed?: ParsedProduct): string {
  return [
    "✅ Your product is live!",
    summaryText(parsed),
    "Tap the button below to see it on your website.",
  ]
    .filter(Boolean)
    .join("\n");
}

function itemToEntries(item: QueuedProduct): ChatEntry[] {
  const urls = item.images.map((b) => URL.createObjectURL(b));
  const out: ChatEntry[] = [
    {
      id: item.id,
      role: "user",
      text: item.text,
      urls,
      status: item.status,
      link: item.link,
      error: item.error,
    },
  ];
  if (item.status === "synced" && item.link) {
    out.push({
      id: `${item.id}:bot`,
      role: "bot",
      text: successText(item.parsed),
      link: item.link,
    });
  } else if (item.status === "failed") {
    out.push({
      id: `${item.id}:bot`,
      role: "bot",
      text: "⚠️ This product could not be sent yet — it is still saved on this phone.",
      error: item.error,
    });
  }
  return out;
}

function chipFor(status?: QueuedProduct["status"]): { label: string; cls: string } | null {
  switch (status) {
    case "pending":
      return { label: "Saved — will send when online", cls: "bg-muted text-muted-foreground" };
    case "syncing":
      return { label: "Sending…", cls: "bg-muted text-muted-foreground" };
    case "synced":
      return { label: "✓ Sent", cls: "bg-primary text-primary-foreground" };
    case "failed":
      return { label: "Not sent — tap Retry", cls: "bg-destructive text-destructive-foreground" };
    default:
      return null;
  }
}

/** WhatsApp-chat-style product creation for the simplified dashboard (offline-first). */
export function AddProductChat() {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<ChatEntry[]>([
    { id: "welcome", role: "bot", text: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  // Details gathered across several messages (name first, then price, etc.).
  const draftRef = useRef<ParsedProduct | undefined>(undefined);

  const refreshFromQueue = useCallback(async () => {
    const q = await listQueue();
    setPendingCount(q.filter((i) => i.status !== "synced").length);
    return q;
  }, []);

  // Load anything queued previously (e.g. added while offline yesterday).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = await refreshFromQueue();
      if (cancelled) return;
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...q.flatMap(itemToEntries).filter((e) => !seen.has(e.id))];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFromQueue]);

  const runSync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const updated = await syncQueue();
    await refreshFromQueue();
    setEntries((prev) => {
      const next = prev.map((e) => {
        if (e.role !== "user") return e;
        const item = updated.find((u) => u.id === e.id);
        if (!item) return e;
        return { ...e, status: item.status, link: item.link, error: item.error };
      });
      // Confirmation bubbles for items that were queued earlier (e.g. added
      // offline yesterday) and have now finished syncing.
      for (const item of updated) {
        const botId = `${item.id}:bot`;
        const idx = next.findIndex((e) => e.id === botId);
        if (item.status === "synced" && item.link) {
          const bot: ChatEntry = {
            id: botId,
            role: "bot",
            text: successText(item.parsed),
            link: item.link,
          };
          if (idx >= 0) next[idx] = bot;
          else next.push(bot);
        } else if (item.status === "failed") {
          const text =
            "⚠️ This product could not be sent yet — it is still saved on this phone. Tap Retry on the product, or check your internet.";
          const bot: ChatEntry = { id: botId, role: "bot", text, error: item.error };
          if (idx >= 0) next[idx] = bot;
          else next.push(bot);
        }
      }
      return next;
    });
    if (updated.some((u) => u.status === "synced")) {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["simple-stats"] });
    }
  }, [queryClient, refreshFromQueue]);

  // Sync on open, when connectivity returns, and every minute while online.
  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      void runSync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = setInterval(() => {
      if (navigator.onLine) void runSync();
    }, 60_000);
    if (navigator.onLine) void runSync();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timer);
    };
  }, [runSync]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  // Let the composer grow with multi-line details, up to a comfortable height.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const pickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setAttachments((prev) =>
      [...prev, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(
        0,
        MAX_PHOTOS,
      ),
    );
    e.target.value = "";
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const retry = async (entryId: string) => {
    const item = await getQueued(entryId);
    if (!item) return;
    await putQueued({ ...item, status: "pending", error: undefined });
    setEntries((p) =>
      p.map((e) => (e.id === entryId ? { ...e, status: "syncing" as const, error: undefined } : e)),
    );
    try {
      const done = await syncQueuedItem(entryId);
      if (done.status === "pending") {
        setEntries((p) =>
          p.map((e) => {
            if (e.id === entryId) return { ...e, status: "pending" as const, error: undefined };
            if (e.id === `${entryId}:bot`)
              return {
                id: e.id,
                role: "bot" as const,
                text: "📴 You're offline — this product is saved on your phone and will send automatically when internet returns.",
              };
            return e;
          }),
        );
      } else if (done.status === "synced" && done.link) {
        setEntries((p) => {
          const next = p.map((e) => {
            if (e.id === entryId)
              return { ...e, status: "synced" as const, link: done.link, error: undefined };
            return e;
          });
          const botId = `${entryId}:bot`;
          const bot: ChatEntry = {
            id: botId,
            role: "bot",
            text: successText(done.parsed),
            link: done.link,
          };
          const idx = next.findIndex((e) => e.id === botId);
          if (idx >= 0) next[idx] = bot;
          else next.push(bot);
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        queryClient.invalidateQueries({ queryKey: ["simple-stats"] });
      } else {
        throw new Error(done.error || "Could not send this product");
      }
    } catch (err) {
      const msg = (err as Error)?.message || "Could not send this product";
      const offline = (err as Error)?.name === "OfflineError";
      await putQueued({
        ...item,
        status: offline ? "pending" : "failed",
        error: offline ? undefined : msg,
      });
      setEntries((p) =>
        p.map((e) => {
          if (e.id === entryId)
            return {
              ...e,
              status: (offline ? "pending" : "failed") as QueuedProduct["status"],
              error: offline ? undefined : msg,
            };
          if (e.id === `${entryId}:bot`)
            return {
              id: e.id,
              role: "bot" as const,
              text: offline
                ? "📴 You're offline — this product is still saved on your phone."
                : "⚠️ Still could not send — it is saved on this phone.",
              error: offline ? undefined : msg,
            };
          return e;
        }),
      );
    }
    await refreshFromQueue();
  };

  const send = async () => {
    if (busy) return;
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const next = parseProductFromText(text);
    // Keep details from earlier messages: the shop owner may send the name,
    // then the price, then the sizes in separate messages.
    const parsed = mergeParsedProducts(draftRef.current, next);
    const missing = missingFields(parsed, attachments.length);
    const stamp = Date.now();

    if (missing.length > 0) {
      draftRef.current = parsed;
      setInput("");
      const understood = summaryText(parsed);
      setEntries((p) => [
        ...p,
        {
          id: `u-${stamp}`,
          role: "user",
          text: text || undefined,
          urls: attachments.map((a) => a.url),
        },
        {
          id: `b-${stamp}`,
          role: "bot",
          text: [
            `Almost! I still need ${missing.join(" and ")}.`,
            understood ? `So far I have:\n${understood}` : "",
            "I've kept what you already sent — type the missing detail below and send again. Your photos are still attached.",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ]);
      return;
    }

    draftRef.current = undefined;
    setBusy(true);
    const id = newQueueId();
    const item: QueuedProduct = {
      id,
      text,
      images: attachments.map((a) => a.file),
      createdAt: Date.now(),
      status: "pending",
      parsed,
    };
    await putQueued(item);
    setEntries((p) => [
      ...p,
      { id, role: "user", text, urls: attachments.map((a) => a.url), status: "pending" },
      { id: `${id}:bot`, role: "bot", text: "Adding your product…" },
    ]);
    setInput("");
    setAttachments([]);

    if (!navigator.onLine) {
      setEntries((p) =>
        p.map((e) =>
          e.id === `${id}:bot`
            ? {
                ...e,
                text: `📴 You're offline — this product is saved on your phone and will send automatically when internet returns.${summaryText(parsed) ? `\n${summaryText(parsed)}` : ""}`,
              }
            : e,
        ),
      );
      setPendingCount((c) => c + 1);
      setBusy(false);
      return;
    }

    try {
      const done = await syncQueuedItem(id);
      if (done.status === "synced" && done.link) {
        setEntries((p) =>
          p.map((e) => {
            if (e.id === id)
              return { ...e, status: "synced" as const, link: done.link, error: undefined };
            if (e.id === `${id}:bot`)
              return {
                id: e.id,
                role: "bot" as const,
                text: successText(done.parsed),
                link: done.link,
              };
            return e;
          }),
        );
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        queryClient.invalidateQueries({ queryKey: ["simple-stats"] });
      } else if (done.status === "pending") {
        setEntries((p) =>
          p.map((e) =>
            e.id === `${id}:bot`
              ? {
                  ...e,
                  text: `📴 You're offline — this product is saved on your phone and will send automatically when internet returns.${summaryText(parsed) ? `\n${summaryText(parsed)}` : ""}`,
                }
              : e,
          ),
        );
      } else {
        throw new Error(done.error || "Could not send this product");
      }
    } catch (err) {
      const msg = (err as Error)?.message || "Could not send this product";
      const offline = (err as Error)?.name === "OfflineError";
      setEntries((p) =>
        p.map((e) => {
          if (e.id === id)
            return {
              ...e,
              status: (offline ? "pending" : "failed") as QueuedProduct["status"],
              error: offline ? undefined : msg,
            };
          if (e.id === `${id}:bot`)
            return {
              id: e.id,
              role: "bot" as const,
              text: offline
                ? "📴 You're offline — this product is saved on your phone and will send automatically when internet returns."
                : "⚠️ Could not send just now — it is saved on this phone. Tap Retry on the product, or check your internet.",
              error: offline ? undefined : msg,
            };
          return e;
        }),
      );
    }
    await refreshFromQueue();
    setBusy(false);
  };

  return (
    <div
      className="flex flex-col border border-border bg-card"
      style={{ height: "min(72vh, 640px)" }}
    >
      {/* Connection + pending status */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs">
        <Icon name={online ? "cloud-outline" : "cloud-offline-outline"} size={14} />
        <span className={online ? "text-muted-foreground" : "font-semibold"}>
          {online ? "Connected" : "Offline — you can still add products"}
        </span>
        {pendingCount > 0 && (
          <span className="ml-auto flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 font-bold">
              {pendingCount} waiting to send
            </span>
            {online && (
              <button
                onClick={() => void runSync()}
                className="underline underline-offset-4 hover:opacity-80"
              >
                Send now
              </button>
            )}
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {entries.map((e) => (
          <ChatBubble key={e.id} entry={e} onRetry={retry} />
        ))}
        {busy && <div className="text-xs text-muted-foreground animate-pulse">Working…</div>}
      </div>

      {/* Composer */}
      {attachments.length > 0 && (
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {attachments.length} of {MAX_PHOTOS} photos attached
            </span>
            <span>{attachments.length < 1 ? "Add at least 1 photo" : "Ready"}</span>
          </div>
          <div className="flex gap-2">
            {attachments.map((a) => (
              <div key={a.url} className="relative h-16 w-16 border border-border">
                <img
                  src={a.url}
                  alt="Attached product photo"
                  className="h-full w-full object-cover"
                />
                <button
                  aria-label="Remove photo"
                  onClick={() => removeAttachment(a.url)}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center bg-destructive text-destructive-foreground"
                >
                  <Icon name="close-outline" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <label
            className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center border border-border hover:bg-foreground/5 ${
              attachments.length >= MAX_PHOTOS ? "pointer-events-none opacity-40" : ""
            }`}
            title={attachments.length >= MAX_PHOTOS ? "4 photos maximum" : "Attach photos (1–4)"}
          >
            <Icon name="image-outline" size={20} />
            <input type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} />
          </label>
          <textarea
            ref={composerRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter inserts a new line; Ctrl/Cmd+Enter (or the send button) sends.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            enterKeyHint="enter"
            aria-describedby="composer-hint"
            aria-label="Product details"
            placeholder="Type the product details here… (Enter for a new line)"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => void send()}
            disabled={busy}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Icon name="send-outline" size={18} />
          </button>
        </div>
        <div id="composer-hint" className="mt-1.5 text-[11px] text-muted-foreground">
          Enter = new line · Ctrl/⌘ + Enter = send
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ entry, onRetry }: { entry: ChatEntry; onRetry: (id: string) => void }) {
  const chip = entry.role === "user" ? chipFor(entry.status) : null;
  const isBot = entry.role === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
          isBot ? "bg-muted text-foreground" : "bg-secondary text-secondary-foreground"
        }`}
      >
        {entry.text && <div className="whitespace-pre-wrap break-words">{entry.text}</div>}
        {entry.urls && entry.urls.length > 0 && (
          <div
            className={`grid gap-1 ${entry.urls.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${entry.text ? "mt-2" : ""}`}
          >
            {entry.urls.map((u) => (
              <img key={u} src={u} alt="Product photo" className="h-28 w-full object-cover" />
            ))}
          </div>
        )}
        {entry.link && (
          <a
            href={entry.link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
          >
            <Icon name="open-outline" size={13} /> View product
          </a>
        )}
        {chip && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}>
              {chip.label}
            </span>
            {entry.status === "failed" && (
              <button
                onClick={() => onRetry(entry.id)}
                className="text-[11px] underline underline-offset-4"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {entry.error && <div className="mt-1 text-[11px] text-muted-foreground">{entry.error}</div>}
      </div>
    </div>
  );
}
