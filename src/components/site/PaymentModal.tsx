import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/settings";
import { useMoney } from "@/lib/currency";
import { Icon } from "./Icon";

export function PaymentModal({
  orderId,
  totalCents,
  onClose,
}: {
  orderId: string;
  totalCents: number;
  onClose: () => void;
}) {
  const { data: settings } = useSiteSettings();
  const money = useMoney();
  const p = settings?.payment;
  const digits = (p?.whatsappNumber ?? "").replace(/[^0-9]/g, "");
  const waHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        `Hi! I just paid for order ${orderId} (${money.format(totalCents)}). Here's my receipt:`,
      )}`
    : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[95]"
      />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        className="fixed inset-x-3 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] max-h-[90vh] overflow-y-auto z-[100] bg-background rounded-3xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="text-center mb-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary grid place-items-center">
            <Icon name="checkmark-circle-outline" size={32} />
          </div>
          <h3 className="mt-3 font-display text-2xl font-bold">Order received</h3>
          <p className="text-muted-foreground text-sm">
            Complete your payment using the details below.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <Row label="Order ID" value={orderId} copyable />
          <Row label="Amount" value={money.format(totalCents)} />
          {p?.bankName && <Row label="Bank" value={p.bankName} />}
          {p?.accountName && <Row label="Account name" value={p.accountName} />}
          {p?.accountNumber && <Row label="Account number" value={p.accountNumber} copyable />}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {p?.instructions ??
            "Transfer the exact amount using your Order ID as the reference, then tap the button below."}
        </p>

        {waHref ? (
          <motion.a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-white font-semibold text-base sm:text-lg shadow-lg active:scale-[0.98] transition-transform"
            style={{ backgroundColor: "#25D366" }}
          >
            <Icon name="receipt-outline" size={22} />
            Upload your receipt here after payment
          </motion.a>
        ) : (
          <p className="mt-5 text-center text-sm text-destructive">
            WhatsApp number not set. Ask an admin to add one in Site Content settings.
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </motion.div>
    </>
  );
}

function Row({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-sm font-medium truncate">{value}</span>
        {copyable && (
          <button
            onClick={() => navigator.clipboard?.writeText(value)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Copy"
          >
            <Icon name="copy-outline" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}