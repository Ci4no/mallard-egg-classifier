import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/egg-ui";
import { useCounts } from "@/lib/egg-store";
import { SIZE_CLASSES } from "@/lib/egg-vision";

export const Route = createFileRoute("/counter")({
  head: () => ({
    meta: [
      { title: "Egg Classification Counter — Mallard Duck Eggs" },
      {
        name: "description",
        content:
          "Running tally of mallard duck eggs classified as Small, Medium, Large and Extra Large.",
      },
      { property: "og:title", content: "Egg Classification Counter" },
      {
        property: "og:description",
        content: "Track how many mallard duck eggs fall into each size class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CounterPage,
});

function CounterPage() {
  const { counts, averageConfidence, total } = useCounts();

  return (
    <AppShell back>
      <div className="mx-auto max-w-3xl">
        <p className="label-eyebrow text-center">Classification</p>

        <div className="panel mt-5 divide-y divide-border">
          {SIZE_CLASSES.map((label) => (
            <div key={label} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-medium">
                {label}
                <span className="block text-xs font-normal text-muted-foreground">
                  Avg. confidence: {averageConfidence[label]?.toFixed(1) ?? "—"}%
                </span>
              </span>
              <span className="font-display text-2xl tabular-nums text-primary">
                {counts[label] ?? 0}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-secondary/60 px-5 py-3">
            <span className="label-eyebrow">Total</span>
            <span className="text-sm font-semibold tabular-nums">{total}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Database-backed totals. Use batches and report filters instead of deleting audit history.
        </p>
      </div>
    </AppShell>
  );
}
