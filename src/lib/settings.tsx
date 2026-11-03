import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NavLayout = {
  logoPosition: "left" | "center" | "right";
  showCategories: boolean;
  showUserIcon: boolean;
  showCart: boolean;
};

export type HeroSettings = {
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  overlay: number;
};

export type CtaSettings = { heading: string; sub: string; button: string; mediaUrl?: string };

export type FooterSettings = {
  about: string;
  address: string;
  phone: string;
  email: string;
  socials: { instagram?: string; tiktok?: string; facebook?: string; whatsappChannel?: string };
  columns: { title: string; links: { label: string; href: string }[] }[];
  copyright: string;
};

export type ThemeSettings = {
  background: string;
  primary: string;
  foreground: string;
  card: string;
  accent: string;
};

export type PaymentSettings = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  whatsappNumber: string;
  instructions: string;
  deliveryLagosCents?: number;
  deliveryOutsideCents?: number;
};

export type CurrencySettings = { symbol: string; code: string };

export type SiteSettings = {
  id: number;
  brand: string;
  tagline: string | null;
  logo_url: string | null;
  nav_layout: NavLayout;
  hero: HeroSettings;
  cta: CtaSettings;
  footer: FooterSettings;
  theme: ThemeSettings;
  payment: PaymentSettings;
  currency: CurrencySettings;
};

export const settingsQueryKey = ["site_settings"] as const;

export const defaultSiteSettings: SiteSettings = {
  id: 1,
  brand: "Newman Stores Collections",
  tagline: "Curated footwear, elevated.",
  logo_url: "/newman-stores-logo.png",
  nav_layout: { logoPosition: "left", showCategories: true, showUserIcon: true, showCart: true },
  hero: {
    headline: "Newman Stores Collections",
    subheadline: "Curated branded and unbranded high-quality sneakers.",
    ctaPrimary: "Shop the drop",
    ctaSecondary: "Track order",
    mediaUrl: "/hero-video.mp4",
    mediaType: "video",
    overlay: 0.45,
  },
  cta: {
    heading: "Join the next drop",
    sub: "Fresh pairs, sharp curation, fast support.",
    button: "Shop now",
    mediaUrl: "/e.png",
  },
  footer: {
    about: "Curated footwear for precise everyday movement.",
    address: "Lagos. Abuja. Ibadan",
    phone: "+234 902 601 6812",
    email: "care.newmanstorescollections@gmail.com",
    socials: { instagram: "", tiktok: "", facebook: "", whatsappChannel: "" },
    columns: [
      {
        title: "Quick Links",
        links: [
          { label: "Shop", href: "/shop" },
          { label: "About Us", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "Customer Care",
        links: [
          { label: "FAQ", href: "/faq" },
          { label: "Shipping & Returns", href: "/shipping-returns" },
          { label: "Track Order", href: "/track-order" },
          { label: "Care Instructions", href: "/care" },
          { label: "Size Guide", href: "/size-guide" },
        ],
      },
    ],
    copyright: "Copyright (c) 2026 Newman Stores Collections. All rights reserved.",
  },
  theme: {
    background: "#212121",
    foreground: "#F4EEE8",
    card: "#2A2A2A",
    primary: "#D4FF00",
    accent: "#D4FF00",
  },
  payment: {
    bankName: "",
    accountName: "",
    accountNumber: "",
    whatsappNumber: "",
    instructions:
      "Transfer the exact amount using your Order ID as the reference, then upload your receipt.",
  },
  currency: { symbol: "₦", code: "NGN" },
};

function normalizeSiteSettings(data: SiteSettings): SiteSettings {
  // Force the new brand if the database still holds an older store name.
  const brand =
    !data.brand || /a01luxe|shoeluxe/i.test(data.brand) ? "Newman Stores Collections" : data.brand;
  return {
    ...defaultSiteSettings,
    ...data,
    brand,
    logo_url: data.logo_url || defaultSiteSettings.logo_url,
    tagline: data.tagline || defaultSiteSettings.tagline,
    nav_layout: { ...defaultSiteSettings.nav_layout, ...(data.nav_layout ?? {}) },
    hero: { ...defaultSiteSettings.hero, ...(data.hero ?? {}) },
    cta: { ...defaultSiteSettings.cta, ...(data.cta ?? {}) },
    footer: {
      ...defaultSiteSettings.footer,
      ...(data.footer ?? {}),
      socials: { ...defaultSiteSettings.footer.socials, ...(data.footer?.socials ?? {}) },
    },
    theme: { ...defaultSiteSettings.theme, ...(data.theme ?? {}) },
    payment: { ...defaultSiteSettings.payment, ...(data.payment ?? {}) },
    currency: { ...defaultSiteSettings.currency, ...(data.currency ?? {}) },
  };
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  if (error) return defaultSiteSettings;
  return normalizeSiteSettings(data as unknown as SiteSettings);
}

export function useSiteSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSiteSettings,
    initialData: defaultSiteSettings,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function applyThemeToDocument(theme: ThemeSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--brand", theme.primary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--ring", theme.primary);
}

export function ThemeApplier({ theme }: { theme?: ThemeSettings }) {
  useEffect(() => {
    if (theme) applyThemeToDocument(theme);
  }, [theme]);
  return null;
}
