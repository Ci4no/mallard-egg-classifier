import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Check, Database, LockKeyhole, Ruler, ScanLine, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/egg-ui";
import { useBatches, useCalibration, useCounts } from "@/lib/egg-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { referenceArea, ready } = useCalibration();
  const { total, averageConfidence } = useCounts();
  const { batches } = useBatches();
  const auth = useAuth();
  if (auth.loading)
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading secure workspace…</p>
      </AppShell>
    );
  if (!auth.user)
    return (
      <AppShell>
        <div className="panel p-6 text-center">
          <h2>Sign in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect to the shared database to classify and record eggs.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign in / first setup
          </Link>
        </div>
      </AppShell>
    );
  if (!ready)
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <span className="mx-auto block size-8 animate-pulse rounded-full bg-primary/15" />
          <p className="mt-4 text-sm text-muted-foreground">Checking device readiness…</p>
        </div>
      </AppShell>
    );
  if (!referenceArea)
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl bg-[#0c2d27] p-6 text-white shadow-lift sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-emerald-100">
                DEVICE SETUP · 2 OF 3
              </span>
              <Ruler className="size-6 text-amber-300" />
            </div>
            <h2 className="mt-7 max-w-md text-3xl leading-tight text-white sm:text-4xl">
              Calibrate before your first scan
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">
              Hi {auth.user.name.split(" ")[0]}. Your secure workspace is ready. Use one verified
              Medium egg to teach this device its reference size.
            </p>
            <Link
              to="/calibrate"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-[#0c2d27] sm:w-auto"
            >
              Start guided calibration
              <Ruler className="size-4" />
            </Link>
          </div>

          <div className="mt-6 panel p-5 sm:p-6">
            <p className="label-eyebrow">First-run checklist</p>
            <div className="mt-5 space-y-5">
              <SetupStep
                icon={<Check className="size-4" />}
                state="done"
                title="Administrator created"
                detail="Your records and calibration history are protected."
              />
              <SetupStep
                icon={<Ruler className="size-4" />}
                state="active"
                title="Calibrate this camera"
                detail="Fix the mount, lighting and Medium reference egg."
              />
              <SetupStep
                icon={<LockKeyhole className="size-4" />}
                state="locked"
                title="Classify eggs"
                detail="Scanning unlocks after a valid calibration is saved."
              />
            </div>
          </div>
        </div>
      </AppShell>
    );
  const values = Object.values(averageConfidence);
  const overall = values.length
    ? values.reduce((sum, value) => sum + (value ?? 0), 0) / values.length
    : null;
  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="label-eyebrow">System overview</p>
          <h2 className="mt-1 text-3xl text-primary">Good day, {auth.user.name.split(" ")[0]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor classification activity and system readiness.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/calibrate"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold"
          >
            <Ruler className="size-4" />
            Calibrate
          </Link>
          <Link
            to="/classify"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ScanLine className="size-4" />
            New scan
          </Link>
        </div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric Icon={Activity} label="Total egg scans" value={total.toLocaleString()} />
        <Metric
          Icon={Database}
          label="Active batches"
          value={String(batches.filter((b) => b.status === "active").length)}
        />
        <Metric
          Icon={ShieldCheck}
          label="Calibration"
          value={ready && referenceArea ? "Ready" : "Required"}
          detail={
            referenceArea
              ? `${Math.round(referenceArea).toLocaleString()} px² reference`
              : "No active reference"
          }
        />
        <Metric
          Icon={Activity}
          label="Mean class confidence"
          value={overall === null ? "—" : `${overall.toFixed(1)}%`}
        />
      </div>
      <div className="panel mt-6 p-6">
        <h3 className="text-xl text-primary">Recommended workflow</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Prepare", "Secure the phone mount and verify lighting."],
            ["02", "Calibrate", "Capture a stable Medium reference egg."],
            ["03", "Classify", "Select an active batch and record scans."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl bg-secondary/60 p-4">
              <span className="text-xs font-bold text-primary">{n}</span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function SetupStep({
  icon,
  state,
  title,
  detail,
}: {
  icon: React.ReactNode;
  state: "done" | "active" | "locked";
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-4">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          state === "done"
            ? "bg-primary text-primary-foreground"
            : state === "active"
              ? "bg-amber-100 text-amber-800 ring-4 ring-amber-50"
              : "bg-secondary text-muted-foreground"
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Metric({
  Icon,
  label,
  value,
  detail,
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="panel p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
