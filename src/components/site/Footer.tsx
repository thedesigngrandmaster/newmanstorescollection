import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/settings";
import { Icon } from "./Icon";

function isInternal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (isInternal(href)) {
    return (
      <Link to={href} className="hover:text-primary transition-colors">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="hover:text-primary transition-colors">
      {children}
    </a>
  );
}

export function Footer() {
  const { data: s } = useSiteSettings();
  const f = s?.footer;
  const brand = s?.brand ?? "Newman Stores Collections";
  const socials = f?.socials ?? {};

  return (
    <footer className="w-full bg-[color:var(--card)] text-foreground border-t border-border mt-16">
      <div className="w-full px-6 sm:px-10 lg:px-16 py-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_repeat(3,1fr)] gap-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 grid place-items-center overflow-hidden">
                {s?.logo_url ? (
                  <img src={s.logo_url} alt={brand} className="h-full w-full object-cover" />
                ) : (
                  brand.charAt(0)
                )}
              </div>
              <span className="font-display text-2xl font-black uppercase tracking-tight">
                {brand}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm">
              {s?.tagline ?? "Curated branded and unbranded high-quality sneakers."}
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {f?.address && (
                <p className="flex items-center gap-2">
                  <Icon name="location-outline" size={16} /> <span>{f.address}</span>
                </p>
              )}
              {f?.phone && (
                <p className="flex items-center gap-2">
                  <Icon name="call-outline" size={16} /> <span>{f.phone}</span>
                </p>
              )}
              {f?.email && (
                <p className="flex items-center gap-2">
                  <Icon name="mail-outline" size={16} /> <span>{f.email}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="h-9 w-9 border border-border grid place-items-center hover:border-primary hover:text-primary transition-colors"
                >
                  <Icon name="logo-instagram" size={16} />
                </a>
              )}
              {socials.whatsappChannel && (
                <a
                  href={socials.whatsappChannel}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp Channel"
                  className="h-9 w-9 border border-border grid place-items-center hover:border-primary hover:text-primary transition-colors"
                >
                  <Icon name="logo-whatsapp" size={16} />
                </a>
              )}
            </div>
          </div>
          {(f?.columns ?? []).map((col, i) => (
            <div key={i}>
              <h4 className="font-display font-bold uppercase text-xs tracking-widest text-primary mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            {f?.copyright ??
              `Copyright (c) ${new Date().getFullYear()} ${brand}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
