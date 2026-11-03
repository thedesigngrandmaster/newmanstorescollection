import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/site/PageShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Newman Stores Collections" },
      {
        name: "description",
        content:
          "The story behind Newman Stores Collections: curated branded and unbranded footwear, built for everyday movement.",
      },
      { property: "og:title", content: "About Newman Stores Collections" },
      {
        property: "og:description",
        content: "The story behind the Newman Stores Collections range.",
      },
    ],
  }),
  component: () => (
    <PageShell title="About Us" eyebrow="// The Story">
      <Prose>
        <h3>
          NEWMAN STORES COLLECTIONS was born out of a simple observation: modern luxury is defined
          by how you move.
        </h3>
        <p>
          The contemporary footwear landscape forces a compromise between raw comfort and elite
          aesthetic structure. We rejected that divide. The name Newman represents a fresh start — a
          new standard for how everyday footwear should look, feel and last. The NSC monogram is our
          mark: clean lines, strong foundations, and no unnecessary noise.
        </p>
        <p>
          Our curation spans the entire spectrum of modern movement, from the relaxed utility of
          molded slides and streetwear sneakers to the sharp, uncompromising architecture of
          corporate leather and premium slippers. We strip away the hype tax to focus entirely on
          silhouette, density and form. Every pair is selected for its physical presence and
          structural durability.
        </p>
        <p>
          Newman Stores Collections exists for a generation that moves effortlessly from casual
          street hangouts to corporate boardrooms without ever changing their core identity. True
          status isn't about the logo on your chest; it is about the foundation beneath your feet.
        </p>
        <h3 className="font-display uppercase text-xl font-black text-foreground mt-8">
          What we believe
        </h3>
        <ul className="space-y-2 list-disc pl-6">
          <li>
            We believe that high quality is non-negotiable, so products are always inspected before
            dispatch.
          </li>
          <li>Prices should be fair, so there are no hidden markups.</li>
          <li>Your feet, your rules. Branded or unbranded, both are legit.</li>
        </ul>
      </Prose>
    </PageShell>
  ),
});
