import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  FileCheck2,
  Gauge,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  Ruler,
  ScanLine,
  Settings,
  X,
} from "lucide-react";
import type { Detection } from "@/lib/egg-vision";
import { useAuth } from "@/lib/auth";

export function AppShell({
  children,
  back,
  compact,
}: {
  children: ReactNode;
  back?: boolean;
  compact?: boolean;
}) {
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigation = [
    { to: "/", label: "Overview", Icon: LayoutDashboard },
    { to: "/classify", label: "Classify", Icon: ScanLine },
    { to: "/calibrate", label: "Calibration", Icon: Ruler },
    { to: "/counter", label: "Egg Counter", Icon: ClipboardList },
    { to: "/batches", label: "Batches", Icon: Boxes },
    { to: "/analytics", label: "Analytics", Icon: BarChart3 },
    { to: "/reports", label: "Reports", Icon: FileCheck2 },
    { to: "/accuracy", label: "Accuracy", Icon: Gauge },
    { to: "/settings", label: "System Setup", Icon: Settings },
  ] as const;
  const mobileNavigation = [
    { to: "/", label: "Home", Icon: LayoutDashboard },
    { to: "/classify", label: "Scan", Icon: ScanLine },
    { to: "/calibrate", label: "Calibrate", Icon: Ruler },
    { to: "/batches", label: "Batches", Icon: Boxes },
  ] as const;
  const mobileMoreNavigation = [
    { to: "/counter", label: "Egg Counter", Icon: ClipboardList },
    { to: "/analytics", label: "Analytics", Icon: BarChart3 },
    { to: "/reports", label: "Reports", Icon: FileCheck2 },
    { to: "/accuracy", label: "Accuracy", Icon: Gauge },
    { to: "/settings", label: "System Setup", Icon: Settings },
  ] as const;

  if (compact || !auth.user) {
    return (
      <div className="min-h-screen px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-md">
          <header className="text-center">
            <h1 className="font-display text-2xl leading-tight text-primary sm:text-[1.7rem]">
              Real-Time Mallard Duck
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Egg Size Classification</p>
          </header>
          <main className="mt-8">{children}</main>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen flex-col bg-[#0c2d27] p-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-3 px-2 py-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-emerald-200">
            <Activity className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-lg leading-tight text-white">Mallard Egg</h1>
            <p className="text-[11px] text-white/55">Classification System</p>
          </div>
        </div>
        <nav className="mt-6 space-y-1" aria-label="Primary navigation">
          {navigation.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-white text-[#0c2d27] shadow-panel" }}
              inactiveProps={{
                className: "text-white/65 hover:bg-white/10 hover:text-white",
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="px-2 text-sm font-semibold">{auth.user.name}</p>
          <p className="px-2 text-xs capitalize text-white/50">{auth.user.role}</p>
          <button
            onClick={() => void auth.logout()}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-white/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Activity className="size-4" />
              </span>
              <div>
                <h1 className="font-display text-base leading-tight text-primary">Mallard Egg</h1>
                <p className="text-[10px] text-muted-foreground">Field classifier</p>
              </div>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
              {auth.user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card px-5 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] pt-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xl text-primary">More pages</p>
                  <p className="text-xs text-muted-foreground">Reports, records, and system tools</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {mobileMoreNavigation.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    activeProps={{ className: "border-primary bg-primary/10 text-primary" }}
                    inactiveProps={{ className: "border-border bg-background text-foreground" }}
                    className="flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-sm font-semibold"
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 px-2 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_-22px_rgb(0_0_0/.4)] backdrop-blur lg:hidden"
          aria-label="Mobile navigation"
        >
          {mobileNavigation.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold"
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-muted-foreground"
            aria-label="Open more navigation"
            aria-expanded={mobileMenuOpen}
          >
            <Grid2X2 className="size-5" />
            <span>More</span>
          </button>
        </nav>
        {back ? (
          <div className="mx-auto mb-8 flex max-w-[1440px] px-4 lg:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-secondary-foreground shadow-panel transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CameraStage({
  videoRef,
  detection,
  status,
  error,
  outline = "box",
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detection: Detection | null;
  status: string;
  error: string | null;
  outline?: "box" | "ellipse";
}) {
  const video = videoRef.current;
  const vw = video?.videoWidth || 4;
  const vh = video?.videoHeight || 3;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-secondary shadow-lift">
      <video
        ref={videoRef}
        playsInline
        muted
        className="size-full object-cover"
        aria-label="Live camera feed of the egg tray"
      />
      {detection ? (
        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {outline === "ellipse" ? (
            <ellipse
              cx={detection.x + detection.width / 2}
              cy={detection.y + detection.height / 2}
              rx={detection.width / 2}
              ry={detection.height / 2}
              className="fill-none stroke-destructive"
              strokeWidth={Math.max(2, vw * 0.005)}
            />
          ) : (
            <rect
              x={detection.x}
              y={detection.y}
              width={detection.width}
              height={detection.height}
              className="fill-destructive/25 stroke-destructive"
              strokeWidth={Math.max(2, vw * 0.005)}
            />
          )}
        </svg>
      ) : null}

      {status !== "live" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary px-6 text-center text-sm text-muted-foreground">
          <p>{status === "error" ? error : "Starting camera…"}</p>
          {status === "error" && typeof window !== "undefined" && !window.isSecureContext ? (
            <a
              href={`http://localhost:${window.location.port || "8080"}${window.location.pathname}`}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Open securely as localhost
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
