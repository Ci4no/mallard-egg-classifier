import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/egg-ui";
import { api } from "@/lib/api";
type Data = {
  total: number;
  summary: { class: string; count: number; avg_confidence: number; min_confidence: number }[];
  daily: { day: string; count: number; avg_confidence: number }[];
};
export const Route = createFileRoute("/analytics")({ component: Analytics });
function Analytics() {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    void api<Data>("analytics").then(setD);
  }, []);
  const max = Math.max(1, ...(d?.summary.map((x) => Number(x.count)) ?? []));
  return (
    <AppShell back>
      <div className="page-heading">
        <div>
          <p className="label-eyebrow">Analytics</p>
          <h2 className="mt-1 text-3xl text-primary">Classification insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribution, volume and confidence trends.
          </p>
        </div>
      </div>
      <div className="panel mt-5 p-5">
        <p className="text-xs text-muted-foreground">Total recorded eggs</p>
        <p className="font-display text-4xl text-primary">{d?.total ?? 0}</p>
      </div>
      <div className="panel mt-4 space-y-4 p-5">
        {d?.summary.map((x) => (
          <div key={x.class}>
            <div className="flex justify-between text-sm">
              <span>{x.class}</span>
              <span>
                {x.count} · {Number(x.avg_confidence).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(Number(x.count) / max) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {d.total ? Math.round((Number(x.count) / d.total) * 100) : 0}% distribution · minimum
              confidence {Number(x.min_confidence).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
      <div className="panel mt-4 p-5">
        <h3>Daily trend</h3>
        <div className="mt-3 space-y-2">
          {d?.daily.map((x) => (
            <div key={x.day} className="flex justify-between border-b py-2 text-sm">
              <span>{x.day}</span>
              <span>
                {x.count} scans · {Number(x.avg_confidence).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
