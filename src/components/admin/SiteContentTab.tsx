import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteSettings, settingsQueryKey, type SiteSettings } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Icon } from "@/components/site/Icon";
import { uploadMedia } from "@/lib/upload";

type Section = "brand" | "nav" | "hero" | "cta" | "footer" | "theme" | "payment" | "currency";

export function SiteContentTab() {
  const { data } = useSiteSettings();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Section>("brand");

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  if (!draft) return <div>Loading…</div>;

  async function save() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        brand: draft.brand,
        tagline: draft.tagline,
        logo_url: draft.logo_url,
        nav_layout: draft.nav_layout as never,
        hero: draft.hero as never,
        cta: draft.cta as never,
        footer: draft.footer as never,
        theme: draft.theme as never,
        payment: draft.payment as never,
        currency: draft.currency as never,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: settingsQueryKey });
    }
  }

  const setD = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: "brand", label: "Brand", icon: "sparkles-outline" },
    { id: "nav", label: "Navigation", icon: "menu-outline" },
    { id: "hero", label: "Hero Section", icon: "images-outline" },
    { id: "cta", label: "CTA Band", icon: "megaphone-outline" },
    { id: "footer", label: "Footer", icon: "chevron-down-outline" },
    { id: "theme", label: "Colors & Theme", icon: "color-palette-outline" },
    { id: "payment", label: "Payment Info", icon: "card-outline" },
    { id: "currency", label: "Currency", icon: "cash-outline" },
  ];

  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div key={s.id} className="rounded-2xl bg-card border border-border overflow-hidden">
          <button
            onClick={() => setOpen(open === s.id ? s.id : s.id)}
            className="w-full flex items-center gap-3 p-4 hover:bg-foreground/5"
          >
            <Icon name={s.icon} size={20} />
            <span className="font-semibold flex-1 text-left">{s.label}</span>
            <Icon name={open === s.id ? "chevron-up-outline" : "chevron-down-outline"} size={18} />
          </button>
          {open === s.id && (
            <div className="p-4 border-t border-border space-y-3">
              {s.id === "brand" && (
                <>
                  <Field label="Brand name" value={draft.brand} onChange={(v) => setD("brand", v)} />
                  <Field label="Tagline" value={draft.tagline ?? ""} onChange={(v) => setD("tagline", v)} />
                  <UploadField
                    label="Logo"
                    value={draft.logo_url ?? ""}
                    accept="image/*"
                    folder="branding"
                    onChange={(v) => setD("logo_url", v)}
                  />
                </>
              )}
              {s.id === "nav" && (
                <>
                  <SelectField
                    label="Logo position"
                    value={draft.nav_layout.logoPosition}
                    options={["left", "center", "right"]}
                    onChange={(v) => setD("nav_layout", { ...draft.nav_layout, logoPosition: v as never })}
                  />
                  <ToggleField
                    label="Show categories"
                    value={draft.nav_layout.showCategories}
                    onChange={(v) => setD("nav_layout", { ...draft.nav_layout, showCategories: v })}
                  />
                  <ToggleField
                    label="Show user (admin) icon"
                    value={draft.nav_layout.showUserIcon}
                    onChange={(v) => setD("nav_layout", { ...draft.nav_layout, showUserIcon: v })}
                  />
                  <ToggleField
                    label="Show cart icon"
                    value={draft.nav_layout.showCart}
                    onChange={(v) => setD("nav_layout", { ...draft.nav_layout, showCart: v })}
                  />
                </>
              )}
              {s.id === "hero" && (
                <>
                  <Field label="Headline" value={draft.hero.headline} onChange={(v) => setD("hero", { ...draft.hero, headline: v })} />
                  <Field label="Subheadline" value={draft.hero.subheadline} onChange={(v) => setD("hero", { ...draft.hero, subheadline: v })} textarea />
                  <Field label="Primary CTA text" value={draft.hero.ctaPrimary} onChange={(v) => setD("hero", { ...draft.hero, ctaPrimary: v })} />
                  <Field label="Secondary CTA text" value={draft.hero.ctaSecondary} onChange={(v) => setD("hero", { ...draft.hero, ctaSecondary: v })} />
                  <UploadField
                    label="Background media (image or video)"
                    value={draft.hero.mediaUrl}
                    accept="image/*,video/*"
                    folder="hero"
                    onChange={(v, kind) => setD("hero", { ...draft.hero, mediaUrl: v, mediaType: kind === "video" ? "video" : kind === "image" ? "image" : draft.hero.mediaType })}
                  />
                  <SelectField
                    label="Media type"
                    value={draft.hero.mediaType}
                    options={["image", "video"]}
                    onChange={(v) => setD("hero", { ...draft.hero, mediaType: v as never })}
                  />
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Overlay ({Math.round((draft.hero.overlay ?? 0) * 100)}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={Math.round((draft.hero.overlay ?? 0) * 100)}
                      onChange={(e) => setD("hero", { ...draft.hero, overlay: Number(e.target.value) / 100 })}
                      className="w-full"
                    />
                  </div>
                </>
              )}
              {s.id === "cta" && (
                <>
                  <Field label="Heading" value={draft.cta.heading} onChange={(v) => setD("cta", { ...draft.cta, heading: v })} />
                  <Field label="Sub" value={draft.cta.sub} onChange={(v) => setD("cta", { ...draft.cta, sub: v })} textarea />
                  <Field label="Button" value={draft.cta.button} onChange={(v) => setD("cta", { ...draft.cta, button: v })} />
                  <UploadField
                    label="Background image"
                    value={draft.cta.mediaUrl ?? ""}
                    accept="image/*"
                    folder="cta"
                    onChange={(v) => setD("cta", { ...draft.cta, mediaUrl: v })}
                  />
                </>
              )}
              {s.id === "footer" && (
                <>
                  <Field label="About" value={draft.footer.about} onChange={(v) => setD("footer", { ...draft.footer, about: v })} textarea />
                  <Field label="Location" value={draft.footer.address} onChange={(v) => setD("footer", { ...draft.footer, address: v })} textarea />
                  <Field label="Phone" value={draft.footer.phone} onChange={(v) => setD("footer", { ...draft.footer, phone: v })} />
                  <Field label="Email" value={draft.footer.email} onChange={(v) => setD("footer", { ...draft.footer, email: v })} />
                  <Field label="Instagram URL" value={draft.footer.socials.instagram ?? ""} onChange={(v) => setD("footer", { ...draft.footer, socials: { ...draft.footer.socials, instagram: v } })} />
                  <Field label="WhatsApp Channel URL (used in footer + Join CTA)" value={draft.footer.socials.whatsappChannel ?? ""} onChange={(v) => setD("footer", { ...draft.footer, socials: { ...draft.footer.socials, whatsappChannel: v } })} />
                  <Field label="Copyright" value={draft.footer.copyright} onChange={(v) => setD("footer", { ...draft.footer, copyright: v })} />
                  <p className="text-xs text-muted-foreground">Column links use the default layout. Edit them in the Advanced JSON below.</p>
                  <JsonField
                    label="Footer columns (JSON)"
                    value={draft.footer.columns}
                    onChange={(v) => setD("footer", { ...draft.footer, columns: v })}
                  />
                </>
              )}
              {s.id === "theme" && (
                <>
                  {(["background", "foreground", "card", "primary", "accent"] as const).map((k) => (
                    <ColorField
                      key={k}
                      label={k}
                      value={draft.theme[k]}
                      onChange={(v) => setD("theme", { ...draft.theme, [k]: v })}
                    />
                  ))}
                </>
              )}
              {s.id === "payment" && (
                <>
                  <Field label="Bank name" value={draft.payment.bankName} onChange={(v) => setD("payment", { ...draft.payment, bankName: v })} />
                  <Field label="Account name" value={draft.payment.accountName} onChange={(v) => setD("payment", { ...draft.payment, accountName: v })} />
                  <Field label="Account number" value={draft.payment.accountNumber} onChange={(v) => setD("payment", { ...draft.payment, accountNumber: v })} />
                  <Field label="WhatsApp number (with country code, digits only)" value={draft.payment.whatsappNumber} onChange={(v) => setD("payment", { ...draft.payment, whatsappNumber: v })} />
                  <Field label="Instructions" value={draft.payment.instructions} onChange={(v) => setD("payment", { ...draft.payment, instructions: v })} textarea />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label={`Delivery fee — Lagos (${draft.currency?.symbol ?? "₦"})`}
                      value={String(Math.round((draft.payment.deliveryLagosCents ?? 200000) / 100))}
                      onChange={(v) => setD("payment", { ...draft.payment, deliveryLagosCents: Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, "")) || 0) * 100) })}
                    />
                    <Field
                      label={`Delivery fee — Outside Lagos (${draft.currency?.symbol ?? "₦"}, 0 = contact)`}
                      value={String(Math.round((draft.payment.deliveryOutsideCents ?? 0) / 100))}
                      onChange={(v) => setD("payment", { ...draft.payment, deliveryOutsideCents: Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, "")) || 0) * 100) })}
                    />
                  </div>
                </>
              )}
              {s.id === "currency" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    This is your store's base currency. Visitors from other countries automatically see prices converted to their local currency.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Symbol (e.g. ₦, $, £)"
                      value={draft.currency?.symbol ?? "₦"}
                      onChange={(v) => setD("currency", { symbol: v, code: draft.currency?.code ?? "NGN" })}
                    />
                    <Field
                      label="ISO code (e.g. NGN, USD, GBP)"
                      value={draft.currency?.code ?? "NGN"}
                      onChange={(v) => setD("currency", { symbol: draft.currency?.symbol ?? "₦", code: v.toUpperCase() })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary shadow-2xl">
          {saving ? "Saving…" : "Save changes"}
          <Icon name="save-outline" size={16} />
        </button>
      </div>
    </div>
  );
}

function UploadField({
  label,
  value,
  accept,
  folder,
  onChange,
}: {
  label: string;
  value: string;
  accept: string;
  folder: string;
  onChange: (v: string, kind?: "image" | "video") => void;
}) {
  const [busy, setBusy] = useState(false);
  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadMedia(file, folder);
      const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : undefined;
      onChange(url, kind);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  const isVideo = value?.match(/\.(mp4|webm|mov)(\?|$)/i);
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 border border-border bg-muted/40 overflow-hidden grid place-items-center">
          {value ? (
            isVideo ? (
              <video src={value} className="h-full w-full object-cover" muted />
            ) : (
              <img src={value} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <Icon name="images-outline" size={20} />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="btn-primary inline-flex cursor-pointer text-sm py-2">
            {busy ? "Uploading…" : value ? "Replace file" : "Upload from device"}
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-muted-foreground hover:text-destructive block"
            >
              Remove
            </button>
          )}
          <div className="text-[11px] text-muted-foreground truncate">{value || "No file selected"}</div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-primary/30"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-primary/30"
        />
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-primary/30"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-colors ${value ? "bg-primary" : "bg-foreground/20"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none font-mono text-sm"
        />
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded-lg border border-border cursor-pointer"
      />
    </div>
  );
}

function JsonField<T>({ label, value, onChange }: { label: string; value: T; onChange: (v: T) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setErr(null);
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Invalid JSON");
          }
        }}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none font-mono text-xs"
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}