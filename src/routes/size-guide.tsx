import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";

const rows = [
  { us: "7", uk: "6", eu: "40", cm: "25" },
  { us: "8", uk: "7", eu: "41", cm: "26" },
  { us: "9", uk: "8", eu: "42", cm: "27" },
  { us: "10", uk: "9", eu: "43", cm: "28" },
  { us: "11", uk: "10", eu: "44", cm: "29" },
  { us: "12", uk: "11", eu: "45", cm: "30" },
  { us: "13", uk: "12", eu: "46", cm: "31" },
];

export const Route = createFileRoute("/size-guide")({
  head: () => ({ meta: [{ title: "Size Guide — Newman Stores Collections" }] }),
  component: () => (
    <PageShell title="Size Guide" eyebrow="// Find your fit">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-muted-foreground mb-6">
          Measure the length of your foot from heel to longest toe (cm) and match it below. When
          between sizes, we recommend sizing up.
        </p>
        <div className="border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted uppercase text-xs tracking-widest">
              <tr>
                <th className="p-3 text-left">US</th>
                <th className="p-3 text-left">UK</th>
                <th className="p-3 text-left">EU</th>
                <th className="p-3 text-left">CM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {rows.map((r) => (
                <tr key={r.us}>
                  <td className="p-3">{r.us}</td>
                  <td className="p-3">{r.uk}</td>
                  <td className="p-3">{r.eu}</td>
                  <td className="p-3">{r.cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  ),
});
