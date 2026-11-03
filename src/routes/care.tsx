import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/site/PageShell";

export const Route = createFileRoute("/care")({
  head: () => ({ meta: [{ title: "Care Instructions — Newman Stores Collections" }] }),
  component: () => (
    <PageShell title="Care Instructions" eyebrow="// Keep them fresh">
      <Prose>
        <h3 className="font-display uppercase text-xl font-black text-foreground">Daily</h3>
        <p>
          Wipe down uppers with a dry microfiber cloth after each wear. Rotate pairs to allow at
          least 24 hours of rest between wears.
        </p>
        <h3 className="font-display uppercase text-xl font-black text-foreground mt-8">
          Deep clean
        </h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Remove laces and insoles.</li>
          <li>Use a soft brush and pH-neutral cleaner. No harsh detergents.</li>
          <li>Air dry away from direct heat or sunlight — never machine dry.</li>
          <li>Re-lace and store with shoe trees to hold shape.</li>
        </ol>
        <p className="mt-6 text-xs text-muted-foreground">
          Suede and nubuck require dedicated brushes and protectant sprays.
        </p>
      </Prose>
    </PageShell>
  ),
});
