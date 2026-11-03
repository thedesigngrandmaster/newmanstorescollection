import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { Icon } from "@/components/site/Icon";

const cards = [
  {
    icon: "cube-outline",
    title: "Order status",
    desc: "Check where your order is right now.",
    href: "/track-order" as const,
  },
  {
    icon: "car-outline",
    title: "Shipping & Returns",
    desc: "Policies, timelines, and refunds.",
    href: "/shipping-returns" as const,
  },
  {
    icon: "information-circle-outline",
    title: "FAQ",
    desc: "Quick answers to common questions.",
    href: "/faq" as const,
  },
  {
    icon: "mail-outline",
    title: "Contact us",
    desc: "Reach a real human by email, phone, or WhatsApp.",
    href: "/contact" as const,
  },
];

export const Route = createFileRoute("/customer-care")({
  head: () => ({ meta: [{ title: "Customer Care — Newman Stores Collections" }] }),
  component: () => (
    <PageShell title="Customer Care" eyebrow="// We're here to help">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            to={c.href}
            className="border border-border p-6 hover:border-primary group"
          >
            <div className="h-10 w-10 border border-primary text-primary grid place-items-center mb-4">
              <Icon name={c.icon} size={18} />
            </div>
            <h3 className="font-display uppercase font-black">{c.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-primary text-xs uppercase tracking-widest font-bold group-hover:gap-2 transition-all">
              Open <Icon name="arrow-forward-outline" size={14} />
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  ),
});
