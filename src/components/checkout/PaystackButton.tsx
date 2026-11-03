import { useState } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

type Props = {
  orderId: string;
  amount: number; // in Naira (e.g. 108000)
  email: string;
  customerName: string;
  onSuccess?: (reference: string) => void;
};

export function PaystackButton({
  orderId,
  amount,
  email,
  customerName,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const payWithPaystack = () => {
    if (!publicKey) {
      toast.error("Paystack is not configured. Missing public key.");
      return;
    }

    if (!window.PaystackPop) {
      toast.error("Paystack script is still loading. Please try again in a moment.");
      return;
    }

    if (!email || !email.includes("@")) {
      toast.error("A valid email is required for payment.");
      return;
    }

    setLoading(true);

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100), // Convert Naira → kobo
      currency: "NGN",
      ref: `${orderId}-${Date.now()}`,
      metadata: {
        order_id: orderId,
        customer_name: customerName,
        custom_fields: [
          {
            display_name: "Order ID",
            variable_name: "order_id",
            value: orderId,
          },
        ],
      },
      callback: function (response: any) {
        setLoading(false);
        toast.success("Payment successful!");
        if (onSuccess) {
          onSuccess(response.reference);
        }
      },
      onClose: function () {
        setLoading(false);
        toast.message("Payment window closed");
      },
    });

    handler.openIframe();
  };

  return (
    <button
      onClick={payWithPaystack}
      disabled={loading}
      className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider py-4 rounded-none hover:opacity-90 transition disabled:opacity-50"
    >
      {loading ? "Processing..." : `Pay ₦${amount.toLocaleString()} with Paystack`}
    </button>
  );
}
