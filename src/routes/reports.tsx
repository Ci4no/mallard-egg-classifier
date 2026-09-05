import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/egg-ui";
import { api, download, type Scan } from "@/lib/api";

export const Route = createFileRoute("/reports")({ component: Reports });
const esc = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function Reports() {
  const [scans, setScans] = useState<Scan[]>([]);
  const load = () => api<{ scans: Scan[] }>("scans").then((result) => setScans(result.scans));
  useEffect(() => {
    void load();
  }, []);
  const csv = () => {
    const head = [
      "ID",
      "Batch",
      "Class",
      "Actual",
      "Confidence",
      "Area px2",
      "Distance mm",
      "Stable",
      "Operator",
      "Captured at",
    ];
    const rows = scans.map((s) => [
      s.id,
      s.batch_name,
      s.predicted_class,
      s.actual_class,
      Number(s.confidence) * 100,
      s.area_px,
      s.distance_mm,
      s.stable,
      s.operator,
      s.captured_at,
    ]);
    return [head, ...rows].map((row) => row.map(esc).join(",")).join("\r\n");
  };
  return (
    <AppShell back>
      <div className="page-heading">
        <div>
          <p className="label-eyebrow">Reports</p>
          <h2 className="mt-1 text-3xl text-primary">Scan records</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, label and export individual egg scans.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 print:hidden">
        <button
          onClick={() => download(`egg-report-${Date.now()}.csv`, csv(), "text/csv")}
          className="rounded-xl bg-primary p-3 text-xs font-semibold text-primary-foreground"
        >
          CSV / Excel
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-primary p-3 text-xs font-semibold text-primary-foreground"
        >
          Print / PDF
        </button>
        <button onClick={() => void load()} className="rounded-xl border p-3 text-xs font-semibold">
          Refresh
        </button>
      </div>
      <div className="panel mt-4 overflow-x-auto p-4">
        <h2>Egg Classification Report</h2>
        <p className="text-xs text-muted-foreground">
          Generated {new Date().toLocaleString()} · {scans.length} records
        </p>
        <table className="data-table mt-4">
          <thead>
            <tr>
              {["Time", "Batch", "Class / actual", "Confidence", "Operator"].map((h) => (
                <th className="border-b p-2" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s.id}>
                <td className="border-b p-2">{new Date(s.captured_at).toLocaleString()}</td>
                <td className="border-b p-2">{s.batch_name}</td>
                <td className="border-b p-2">
                  {s.predicted_class}
                  <select
                    aria-label={`Actual class for scan ${s.id}`}
                    value={s.actual_class ?? ""}
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await api(`scans/${s.id}/actual`, {
                        method: "PATCH",
                        body: JSON.stringify({ actual_class: e.target.value }),
                      });
                      await load();
                    }}
                    className="mt-1 block rounded border bg-background p-1 text-[10px] print:hidden"
                  >
                    <option value="">Set actual…</option>
                    {["Small", "Medium", "Large", "Extra Large"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
                <td className="border-b p-2">{(Number(s.confidence) * 100).toFixed(1)}%</td>
                <td className="border-b p-2">{s.operator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
