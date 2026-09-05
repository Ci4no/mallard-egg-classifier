import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/egg-ui";
import { api } from "@/lib/api";
import { SIZE_CLASSES } from "@/lib/egg-vision";
type Result = {
  samples: number;
  accuracy: number;
  matrix: Record<string, Record<string, number>>;
  metrics: { class: string; precision: number; recall: number; f1: number; support: number }[];
};
export const Route = createFileRoute("/accuracy")({ component: Accuracy });
function Accuracy() {
  const [d, setD] = useState<Result | null>(null);
  useEffect(() => {
    void api<Result>("accuracy").then(setD);
  }, []);
  return (
    <AppShell back>
      <div className="page-heading">
        <div>
          <p className="label-eyebrow">Model evaluation</p>
          <h2 className="mt-1 text-3xl text-primary">Accuracy metrics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Validated performance from ground-truth labels.
          </p>
        </div>
      </div>
      <div className="panel mt-5 p-5">
        <p className="text-xs text-muted-foreground">Overall accuracy · labeled samples</p>
        <p className="font-display text-3xl text-primary">
          {d ? (d.accuracy * 100).toFixed(1) : "—"}%{" "}
          <span className="text-base">· {d?.samples ?? 0}</span>
        </p>
        {!d?.samples ? (
          <p className="mt-2 text-xs text-destructive">
            Add actual/ground-truth classes to recorded scans before claiming model accuracy.
          </p>
        ) : null}
      </div>
      <div className="panel mt-4 overflow-x-auto p-4">
        <h3>Confusion matrix</h3>
        <table className="data-table mt-3">
          <thead>
            <tr>
              <th>Actual ↓ / Predicted →</th>
              {SIZE_CLASSES.map((x) => (
                <th className="p-2" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZE_CLASSES.map((a) => (
              <tr key={a}>
                <th className="p-2 text-left">{a}</th>
                {SIZE_CLASSES.map((p) => (
                  <td className="border p-2" key={p}>
                    {d?.matrix[a]?.[p] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel mt-4 p-4">
        <h3>Per-class metrics</h3>
        {d?.metrics.map((m) => (
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs" key={m.class}>
            <strong>{m.class}</strong>
            <span>P {(m.precision * 100).toFixed(1)}%</span>
            <span>R {(m.recall * 100).toFixed(1)}%</span>
            <span>F1 {(m.f1 * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
