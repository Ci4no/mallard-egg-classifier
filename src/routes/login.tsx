import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/egg-ui";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: LoginPage });
function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [setup, setSetup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (setup) await auth.setup(name, email, password);
      else await auth.login(email, password);
      await nav({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell compact>
      <div className="panel p-6">
        <p className="label-eyebrow">{setup ? "First-time setup" : "Secure sign in"}</p>
        <h2 className="mt-2 text-2xl text-primary">
          {setup ? "Create administrator" : "Welcome back"}
        </h2>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {setup && (
            <label className="block text-sm">
              Full name
              <input
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}
          <label className="block text-sm">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              minLength={8}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            {busy ? "Please wait…" : setup ? "Create admin account" : "Sign in"}
          </button>
        </form>
        <button
          className="mt-4 w-full text-xs text-muted-foreground underline"
          onClick={() => {
            setSetup(!setup);
            setError("");
          }}
        >
          {setup ? "Already configured? Sign in" : "First run? Create the administrator"}
        </button>
      </div>
    </AppShell>
  );
}
