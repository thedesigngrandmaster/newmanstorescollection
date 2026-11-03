import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PageShell({
  children,
  title,
  eyebrow,
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-28">
        {(title || eyebrow) && (
          <header className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-b border-border">
            {eyebrow && (
              <div className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
                {eyebrow}
              </div>
            )}
            {title && (
              <h1 className="mt-2 font-display text-4xl sm:text-6xl font-black uppercase">
                {title}
              </h1>
            )}
          </header>
        )}
        <div className="min-h-[50vh]">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-foreground/85 leading-relaxed">
      {children}
    </div>
  );
}