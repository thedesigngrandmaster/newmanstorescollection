import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const items = [
  {
    q: "How long does shipping take?",
    a: "Orders within Lagos arrive in 36-48 hours. While, orders outside Lagos take 7–14 business days depending on your location (or the destination/state).",
  },
  {
    q: "Are the branded sneakers authentic?",
    a: "Yes. Every branded pair is sourced from verified suppliers and inspected in-house before dispatch.",
  },
  {
    q: "How do I pay?",
    a: "After checkout you'll receive an Order ID and our bank account details. Transfer the exact amount using the Order ID as the reference, then upload your receipt to our Customer Care Representative via WhatsApp.",
  },
  {
    q: "Can I return a pair?",
    a: "Unworn pairs in original packaging can be exchanged within 7 days. See our Shipping & Returns page for details.",
  },
  {
    q: "What if my size sells out?",
    a: "Contact our Customer Care Representative via WhatsApp — we may be able to restock or suggest a comparable pair.",
  },
  {
    q: "How do I track my order?",
    a: "Use the Track Order page and enter your Order ID (e.g. NSC-XXXXXX).",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Newman Stores Collections" },
      {
        name: "description",
        content:
          "Answers to common questions about shipping, payment, returns and sizing at Newman Stores Collections.",
      },
    ],
  }),
  component: () => (
    <PageShell title="FAQ" eyebrow="// Frequently Asked">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Accordion
          type="single"
          collapsible
          className="border border-border divide-y divide-border"
        >
          {items.map((it, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="px-4">
              <AccordionTrigger className="font-display uppercase text-left">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PageShell>
  ),
});
