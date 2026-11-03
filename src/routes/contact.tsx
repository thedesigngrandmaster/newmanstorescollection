import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { useSiteSettings } from "@/lib/settings";
import { Icon } from "@/components/site/Icon";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Newman Stores Collections" },
      {
        name: "description",
        content: "Reach the Newman Stores Collections team — email, phone, WhatsApp.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data: s } = useSiteSettings();
  const f = s?.footer;
  const wa = (s?.payment?.whatsappNumber ?? "").replace(/[^0-9]/g, "");
  const cards = [
    {
      icon: "mail-outline",
      label: "Email",
      value: f?.email,
      href: f?.email ? `mailto:${f.email}` : undefined,
    },
    {
      icon: "call-outline",
      label: "Phone",
      value: f?.phone,
      href: f?.phone ? `tel:${f.phone}` : undefined,
    },
    {
      icon: "logo-whatsapp",
      label: "WhatsApp",
      value: wa ? `+${wa}` : undefined,
      href: wa ? `https://wa.me/${wa}` : undefined,
    },
    { icon: "location-outline", label: "Address", value: f?.address },
  ];
  return (
    <PageShell title="Contact" eyebrow="// Get in touch">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <a
            key={c.label}
            href={c.href}
            className={`border border-border p-6 flex gap-4 items-start ${c.href ? "hover:border-primary" : "opacity-70"}`}
          >
            <div className="h-10 w-10 border border-primary text-primary grid place-items-center shrink-0">
              <Icon name={c.icon} size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                {c.label}
              </div>
              <div className="font-medium break-words">{c.value || "—"}</div>
            </div>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
