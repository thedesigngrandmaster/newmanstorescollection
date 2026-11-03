import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "./Icon";
import { useSiteSettings } from "@/lib/settings";
import { useCart } from "@/lib/cart";

type NavItem = { label: string; to: string; matches: (path: string) => boolean };

export function Navbar() {
  const { data: settings } = useSiteSettings();
  const cart = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = settings?.nav_layout ?? {
    logoPosition: "left",
    showCategories: true,
    showUserIcon: true,
    showCart: true,
  };
  const brand = settings?.brand ?? "Newman Stores Collections";
  const logoUrl = settings?.logo_url;

  const navItems: NavItem[] = [
    {
      label: "Shop",
      to: "/shop",
      matches: (p) =>
        p === "/shop" ||
        p.startsWith("/shop/") ||
        p.startsWith("/product/") ||
        p.startsWith("/products/"),
    },
    { label: "About Us", to: "/about", matches: (p) => p === "/about" },
    { label: "Contact", to: "/contact", matches: (p) => p === "/contact" },
  ];

  const Logo = (
    <Link to="/" className="flex items-center gap-2 min-w-0">
      {logoUrl ? (
        <img src={logoUrl} alt={brand} className="h-8 w-8 object-cover shrink-0" />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center font-display font-bold">
          {brand.charAt(0)}
        </div>
      )}
      <span className="font-display font-bold text-lg truncate">{brand}</span>
    </Link>
  );

  const NavLinks = (
    <ul className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const active = item.matches(pathname);
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              className={`px-3 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                active
                  ? "text-primary border-b-2 border-primary"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const CartBtn = nav.showCart && (
    <button
      aria-label="Cart"
      onClick={() => cart.setOpen(true)}
      className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/5"
    >
      <Icon name="bag-outline" size={22} />
      {cart.count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">
          {cart.count}
        </span>
      )}
    </button>
  );

  const MenuBtn = (
    <button
      aria-label="Menu"
      onClick={() => setMobileOpen((v) => !v)}
      className="md:hidden h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/5"
    >
      <Icon name={mobileOpen ? "close-outline" : "menu-outline"} size={24} />
    </button>
  );

  const Actions = (
    <div className="hidden md:flex items-center gap-1 shrink-0">
      {nav.showCart && (
        <button
          aria-label="Cart"
          onClick={() => cart.setOpen(true)}
          className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/5"
        >
          <Icon name="bag-outline" size={22} />
          {cart.count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">
              {cart.count}
            </span>
          )}
        </button>
      )}
      {nav.showUserIcon && (
        <Link
          to="/auth"
          aria-label="Admin"
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/5"
        >
          <Icon name="person-circle-outline" size={24} />
        </Link>
      )}
    </div>
  );

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "py-2" : "py-3"} glass-nav`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Mobile: menu | logo | cart */}
        <div className="md:hidden grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <div className="justify-self-start">{MenuBtn}</div>
          <div className="justify-self-center">{Logo}</div>
          <div className="justify-self-end">{CartBtn}</div>
        </div>
        {/* Desktop: logo left, links center, actions right */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="min-w-0">{Logo}</div>
          <div className="flex flex-1 justify-center">{NavLinks}</div>
          <div>{Actions}</div>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border/40 bg-card/60"
          >
            <ul className="p-3 space-y-1">
              {navItems.map((item) => {
                const active = item.matches(pathname);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-3 py-2.5 text-sm font-bold uppercase tracking-widest ${
                        active ? "text-primary bg-primary/10" : "hover:bg-foreground/5"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              {nav.showUserIcon && (
                <li>
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-foreground/5"
                  >
                    Admin
                  </Link>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
