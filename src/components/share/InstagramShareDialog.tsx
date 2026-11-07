import { useState } from "react";
import { useSiteSettings } from "@/lib/settings";
import { Icon } from "@/components/site/Icon";
import {
  buildShareCaption,
  productShareUrl,
  shopShareUrl,
  type ShareProduct,
} from "@/lib/social/instagram";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fallback for browsers without clipboard permission.
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
  }
}

async function urlToFile(url: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not fetch image");
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    return new File([blob], `${name.replace(/[^a-z0-9-]/gi, "-")}.${ext}`, {
      type: blob.type || "image/jpeg",
    });
  } catch {
    return null;
  }
}

function downloadBlob(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Instagram-ready share sheet for one or up to three products. Instagram does
 * not accept a caption through the web, so this prepares the image(s), caption
 * and links and uses the native share sheet on mobile when available.
 */
export function InstagramShareDialog({
  products,
  onClose,
}: {
  products: ShareProduct[];
  onClose: () => void;
}) {
  const { data: settings } = useSiteSettings();
  const [caption, setCaption] = useState(() =>
    buildShareCaption(products, settings?.brand ?? "A01Luxe", settings?.tagline),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const imageUrls = products
    .flatMap((p) => (p.images ?? []).filter(Boolean).slice(0, 1))
    .slice(0, 3);
  const primaryLink = products.length === 1 ? productShareUrl(products[0].slug) : shopShareUrl();
  const instagramUrl = settings?.footer?.socials?.instagram || "https://www.instagram.com/";

  const resetCaption = () =>
    setCaption(buildShareCaption(products, settings?.brand ?? "A01Luxe", settings?.tagline));

  const copy = async (text: string, label: string) => {
    try {
      await copyText(text);
      setMessage(`${label} copied.`);
      setError("");
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  };

  const share = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const files = (
        await Promise.all(
          imageUrls.map((url, i) => urlToFile(url, `${products[0]?.slug ?? "product"}-${i + 1}`)),
        )
      ).filter((f): f is File => !!f);

      const canShareFiles =
        files.length > 0 &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files });

      if (typeof navigator.share === "function") {
        const data: ShareData = {
          title: products.length === 1 ? products[0].name : "New drop",
          text: caption,
        };
        if (canShareFiles) data.files = files;
        else data.url = primaryLink;
        await navigator.share(data);
        setMessage("Shared. Choose Instagram in the share sheet.");
      } else {
        await copyText(caption);
        if (files.length > 0) files.forEach(downloadBlob);
        setMessage("Caption copied and image downloaded — post them on Instagram.");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError((err as Error)?.message || "Could not open the share sheet.");
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadImages = async () => {
    setBusy(true);
    setError("");
    try {
      const files = (
        await Promise.all(
          imageUrls.map((url, i) => urlToFile(url, `${products[0]?.slug ?? "product"}-${i + 1}`)),
        )
      ).filter((f): f is File => !!f);
      if (files.length === 0) throw new Error("No product image found.");
      files.forEach(downloadBlob);
      setMessage(`${files.length} image${files.length === 1 ? "" : "s"} downloaded.`);
    } catch (err) {
      setError((err as Error)?.message || "Could not download the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-3 sm:p-6">
      <button
        aria-label="Close share dialog"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border border-border bg-background p-4 shadow-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Icon name="logo-instagram" size={19} /> Share to Instagram
            </h3>
            <p className="text-xs text-muted-foreground">
              Create an ad post with the photo, caption and product link.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border border-border hover:bg-foreground/5"
            aria-label="Close"
          >
            <Icon name="close-outline" size={16} />
          </button>
        </div>

        {imageUrls.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {imageUrls.map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={`${products[i]?.name ?? "Product"} preview`}
                className="h-24 w-24 shrink-0 border border-border object-cover"
              />
            ))}
          </div>
        )}

        <label className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">
          Caption
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={9}
          className="w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary"
        />

        <div className="mt-2 flex items-center gap-2 border border-border bg-muted/40 p-2 text-xs">
          <span className="min-w-0 flex-1 truncate">{primaryLink}</span>
          <button
            onClick={() => void copy(primaryLink, "Link")}
            className="shrink-0 border border-border px-2 py-1 font-semibold uppercase"
          >
            Copy
          </button>
        </div>

        {message && <div className="mt-2 text-xs text-emerald-700">{message}</div>}
        {error && <div className="mt-2 text-xs text-destructive">{error}</div>}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => void share()}
            disabled={busy}
            className="col-span-2 inline-flex items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
          >
            <Icon name="logo-instagram" size={18} /> {busy ? "Preparing…" : "Share"}
          </button>
          <button
            onClick={() => void copy(caption, "Caption")}
            className="border border-border px-3 py-2.5 text-xs font-bold uppercase hover:bg-foreground/5"
          >
            Copy caption
          </button>
          <button
            onClick={() => void downloadImages()}
            disabled={busy || imageUrls.length === 0}
            className="border border-border px-3 py-2.5 text-xs font-bold uppercase hover:bg-foreground/5 disabled:opacity-40"
          >
            Download image{imageUrls.length > 1 ? "s" : ""}
          </button>
          <button
            onClick={() => void copy(primaryLink, "Link")}
            className="border border-border px-3 py-2.5 text-xs font-bold uppercase hover:bg-foreground/5"
          >
            Copy link
          </button>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1 border border-border px-3 py-2.5 text-xs font-bold uppercase hover:bg-foreground/5"
          >
            <Icon name="open-outline" size={14} /> Instagram
          </a>
          <button
            onClick={resetCaption}
            className="col-span-2 text-center text-[11px] text-muted-foreground underline underline-offset-4"
          >
            Reset caption
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          On a phone, tap <strong>Share</strong> and choose Instagram to send the photo. Instagram
          does not accept captions from the web, so paste the copied caption when posting. For ads,
          boost the post from Instagram or Meta Ads Manager.
        </p>
      </div>
    </div>
  );
}
