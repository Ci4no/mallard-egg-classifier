import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  BrainCircuit,
  CheckCircle2,
  DatabaseBackup,
  HardDrive,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/egg-ui";
import { api, download } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Device = {
  id: number;
  name: string;
  phone_model: string;
  mount_type: string;
  target_distance_mm: number;
  distance_tolerance_mm: number;
  alignment_tolerance_deg: number;
};
type Model = { id: number; name: string; version: string; type: string; is_active: number };
export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [notice, setNotice] = useState("");
  const load = () =>
    Promise.all([
      api<{ devices: Device[] }>("devices").then((x) => setDevices(x.devices)),
      api<{ models: Model[] }>("models").then((x) => setModels(x.models)),
    ]);
  useEffect(() => {
    void load();
  }, []);
  const done = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  };
  return (
    <AppShell back>
      <div className="page-heading">
        <div>
          <p className="label-eyebrow">Administration</p>
          <h2 className="mt-1 text-3xl text-primary">System configuration</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage capture hardware, model versions, access, and data protection.
          </p>
        </div>
        {notice ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" />
            {notice}
          </span>
        ) : null}
      </div>
      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Section
            Icon={HardDrive}
            title="Capture hardware"
            description="Register the fixed smartphone rig used for calibration and scanning."
          >
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                await api("devices", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                form.reset();
                await load();
                done("Mount profile saved");
              }}
            >
              <Field label="Rig name" name="name" placeholder="e.g. Laboratory Rig A" required />
              <Field label="Phone model" name="phone_model" placeholder="e.g. Samsung Galaxy A54" />
              <Field label="Mount type" name="mount_type" placeholder="Overhead copy stand" />
              <Field
                label="Lens-to-tray distance"
                name="target_distance_mm"
                type="number"
                suffix="mm"
                placeholder="300"
                required
              />
              <Field
                label="Distance tolerance"
                name="distance_tolerance_mm"
                type="number"
                suffix="mm"
                defaultValue="5"
              />
              <Field
                label="Maximum alignment tilt"
                name="alignment_tolerance_deg"
                type="number"
                suffix="degrees"
                defaultValue="3"
              />
              <div className="sm:col-span-2 flex justify-end">
                <Submit>Save mount profile</Submit>
              </div>
            </form>
            <div className="mt-6 border-t pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Registered hardware
              </p>
              {devices.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {devices.map((d) => (
                    <div key={d.id} className="rounded-xl border bg-secondary/35 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{d.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {d.phone_model || "Phone not specified"} ·{" "}
                            {d.mount_type || "Mount not specified"}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          READY
                        </span>
                      </div>
                      <div className="mt-4 flex gap-5 text-xs">
                        <span>
                          <strong>{d.target_distance_mm}</strong> mm distance
                        </span>
                        <span>
                          <strong>±{d.distance_tolerance_mm}</strong> tolerance
                        </span>
                        <span>
                          <strong>{d.alignment_tolerance_deg}°</strong> tilt
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="No mount profile registered yet." />
              )}
            </div>
          </Section>
          <Section
            Icon={BrainCircuit}
            title="Classification model"
            description="Track the exact algorithm or trained artifact used for every result."
          >
            <div className="space-y-2">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {m.name}{" "}
                      <span className="font-normal text-muted-foreground">v{m.version}</span>
                    </p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {m.type}
                    </p>
                  </div>
                  {m.is_active ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>
              ))}
            </div>
            {user?.role === "admin" ? (
              <form
                className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  await api("models", {
                    method: "POST",
                    body: JSON.stringify({
                      ...Object.fromEntries(new FormData(form)),
                      is_active: true,
                    }),
                  });
                  form.reset();
                  await load();
                  done("Model registered");
                }}
              >
                <Field label="Model name" name="name" placeholder="Mallard classifier" required />
                <Field label="Version" name="version" placeholder="1.0.0" required />
                <label className="block text-xs font-semibold">
                  Runtime
                  <select
                    name="type"
                    className="mt-1.5 h-11 w-full rounded-lg border bg-white px-3 text-sm"
                  >
                    <option value="ml-api">ML API</option>
                    <option value="tensorflow-js">TensorFlow.js</option>
                    <option value="onnx">ONNX</option>
                    <option value="vision-rules">Vision rules</option>
                  </select>
                </label>
                <Field
                  label="Endpoint URL"
                  name="endpoint_url"
                  placeholder="Optional for remote API"
                />
                <div className="sm:col-span-2 flex justify-end">
                  <Submit>Register and activate</Submit>
                </div>
              </form>
            ) : null}
          </Section>
        </div>
        <div className="space-y-6">
          {user?.role === "admin" ? (
            <Section
              Icon={UserPlus}
              title="User access"
              description="Create controlled accounts for operators and administrators."
            >
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  await api("users", {
                    method: "POST",
                    body: JSON.stringify(Object.fromEntries(new FormData(form))),
                  });
                  form.reset();
                  done("User account created");
                }}
              >
                <Field label="Full name" name="name" placeholder="Operator name" required />
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
                <Field
                  label="Temporary password"
                  name="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
                <label className="block text-xs font-semibold">
                  Access role
                  <select
                    name="role"
                    className="mt-1.5 h-11 w-full rounded-lg border bg-white px-3 text-sm"
                  >
                    <option value="operator">Operator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
                <Submit full>Create account</Submit>
              </form>
            </Section>
          ) : null}
          <Section
            Icon={ShieldCheck}
            title="System status"
            description="Operational services required by this workstation."
          >
            <div className="space-y-3">
              <Status label="Database connection" />
              <Status label="Authentication service" />
              <Status label="API availability" />
            </div>
          </Section>
          {user?.role === "admin" ? (
            <Section
              Icon={DatabaseBackup}
              title="Data protection"
              description="Export a portable copy of operational records."
            >
              <div className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                <strong>Backup reminder:</strong> JSON exports supplement—not replace—scheduled
                MySQL server backups.
              </div>
              <button
                onClick={async () => {
                  const backup = await api<object>("backup");
                  download(
                    `mallard-backup-${Date.now()}.json`,
                    JSON.stringify(backup, null, 2),
                    "application/json",
                  );
                  done("Backup downloaded");
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                <Box className="size-4" />
                Download JSON backup
              </button>
            </Section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  Icon,
  title,
  description,
  children,
}: {
  Icon: typeof HardDrive;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex gap-3 border-b bg-secondary/35 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-base">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function Field({
  label,
  suffix,
  ...props
}: { label: string; suffix?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <div className="relative mt-1.5">
        <input
          {...props}
          className="h-11 w-full rounded-lg border bg-white px-3 pr-12 text-sm placeholder:text-muted-foreground/65"
        />
        {suffix ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}
function Submit({ children, full = false }: { children: ReactNode; full?: boolean }) {
  return (
    <button
      className={`${full ? "w-full" : ""} rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95`}
    >
      {children}
    </button>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}
function Status({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <span className="size-2 rounded-full bg-emerald-500" />
        Operational
      </span>
    </div>
  );
}
