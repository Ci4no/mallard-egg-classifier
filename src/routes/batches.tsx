import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/egg-ui";
import { api } from "@/lib/api";
import { useBatches } from "@/lib/egg-store";
export const Route = createFileRoute("/batches")({ component: BatchesPage });
function BatchesPage() {
  const { batches, reload } = useBatches();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <AppShell back>
      <div className="page-heading">
        <div>
          <p className="label-eyebrow">Batch management</p>
          <h2 className="mt-1 text-3xl text-primary">Scanning sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize egg scans by source or collection period.
          </p>
        </div>
      </div>
      <form
        className="panel mt-5 space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("batches", { method: "POST", body: JSON.stringify({ name, notes }) });
          setName("");
          setNotes("");
          await reload();
        }}
      >
        <input
          required
          placeholder="New batch name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border bg-background px-3 py-2"
        />
        <textarea
          placeholder="Notes / source / collection details"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border bg-background px-3 py-2"
        />
        <button className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">
          Start batch
        </button>
      </form>
      <div className="mt-4 space-y-3">
        {batches.map((b) => (
          <div className="panel p-4" key={b.id}>
            <div className="flex justify-between">
              <div>
                <h3>{b.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {b.scan_count} scans · {new Date(b.started_at).toLocaleString()}
                </p>
              </div>
              <span className="text-xs uppercase">{b.status}</span>
            </div>
            {b.notes ? <p className="mt-2 text-sm">{b.notes}</p> : null}
            {b.status === "active" ? (
              <button
                onClick={async () => {
                  await api(`batches/${b.id}/close`, { method: "PATCH" });
                  await reload();
                }}
                className="mt-3 text-xs text-destructive underline"
              >
                Close batch
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
