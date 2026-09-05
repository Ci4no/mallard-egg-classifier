import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Check, ChevronRight, Lightbulb, Move3d, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, CameraStage } from "@/components/egg-ui";
import { useEggCamera } from "@/hooks/use-egg-camera";
import { useCalibration } from "@/lib/egg-store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/calibrate")({
  head: () => ({
    meta: [
      { title: "Calibrate Reference Area — Egg Size Classification" },
      {
        name: "description",
        content:
          "Capture the reference pixel area of a medium mallard duck egg so live classification stays accurate.",
      },
      { property: "og:title", content: "Calibrate Reference Area" },
      {
        property: "og:description",
        content: "Set the px² reference used to classify mallard duck egg sizes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalibratePage,
});

function CalibratePage() {
  const router = useRouter();
  const { videoRef, detection, status, error: cameraError } = useEggCamera();
  const { referenceArea, reload } = useCalibration();
  const [saved, setSaved] = useState(false);
  const [samples, setSamples] = useState<number[]>([]);
  const [distance, setDistance] = useState("300");
  const [alignment, setAlignment] = useState("0");
  const [referenceWidth, setReferenceWidth] = useState("45");
  const [referenceHeight, setReferenceHeight] = useState("60");
  const [saveError, setSaveError] = useState("");

  const area = detection?.area ?? 0;
  useEffect(() => {
    if (detection) setSamples((v) => [...v.slice(-9), detection.area]);
  }, [detection]);
  const stats = useMemo(() => {
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    const sd = samples.length
      ? Math.sqrt(samples.reduce((s, x) => s + (x - avg) ** 2, 0) / samples.length)
      : 0;
    return { avg, variation: avg ? (sd / avg) * 100 : 100 };
  }, [samples]);
  const valid =
    samples.length >= 10 &&
    stats.variation <= 3 &&
    Number(distance) > 0 &&
    Number(referenceWidth) > 0 &&
    Number(referenceHeight) > 0 &&
    Math.abs(Number(alignment)) <= 3;

  return (
    <AppShell back>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-wide text-primary">
            DEVICE SETUP · STEP 2 OF 3
          </span>
          <h2 className="mt-3 text-2xl text-primary sm:text-3xl">Calibrate your camera</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Place one verified <strong className="font-semibold text-foreground">Medium egg</strong>{" "}
            inside the guide. Keep everything still while we collect 10 readings.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            [Smartphone, "Mount fixed"],
            [Lightbulb, "Even lighting"],
            [Move3d, "Egg centered"],
          ].map(([Icon, label]) => (
            <div key={label as string} className="rounded-xl border bg-card px-2 py-3 text-center">
              <Icon className="mx-auto size-4 text-primary" />
              <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground">{label as string}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <CameraStage
            videoRef={videoRef}
            detection={detection}
            status={status}
            error={cameraError}
            outline="box"
          />
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Area:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {detection ? Math.round(area).toLocaleString() : "—"} px²
          </span>
        </p>
        <div className="panel mt-4 grid grid-cols-2 gap-3 p-4">
          <label className="text-xs">
            Reference width (mm)
            <input
              type="number"
              min="1"
              step="0.1"
              value={referenceWidth}
              onChange={(e) => setReferenceWidth(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="text-xs">
            Reference length (mm)
            <input
              type="number"
              min="1"
              step="0.1"
              value={referenceHeight}
              onChange={(e) => setReferenceHeight(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="text-xs">
            Camera distance (mm)
            <input
              type="number"
              min="1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label className="text-xs">
            Alignment/tilt (°)
            <input
              type="number"
              step="0.1"
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <p className="col-span-2 text-xs text-muted-foreground">
            Samples: {samples.length}/10 · variation: {stats.variation.toFixed(2)}% · requirement:
            ≤3% and tilt ≤3°
          </p>
        </div>

        <button
          type="button"
          disabled={!valid}
          onClick={async () => {
            setSaveError("");
            try {
              await api("calibrations", {
                method: "POST",
                body: JSON.stringify({
                  device_id: null,
                  reference_area_px: stats.avg,
                  reference_width_mm: Number(referenceWidth),
                  reference_height_mm: Number(referenceHeight),
                  distance_mm: Number(distance),
                  alignment_deg: Number(alignment),
                  sample_count: samples.length,
                  variation_percent: stats.variation,
                }),
              });
              await reload();
              setSaved(true);
              router.invalidate();
            } catch (e) {
              setSaveError(e instanceof Error ? e.message : "Calibration failed");
            }
          }}
          className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-opacity disabled:opacity-40"
        >
          {valid ? "Save verified calibration" : "Waiting for stable calibration"}
        </button>
        {saveError ? (
          <p className="mt-3 text-center text-xs text-destructive">{saveError}</p>
        ) : null}

        {referenceArea ? (
          saved ? (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
              <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-5" />
              </span>
              <p className="mt-2 text-sm font-bold text-primary">Calibration complete</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reference saved at {Math.round(referenceArea).toLocaleString()} px².
              </p>
              <Link
                to="/batches"
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary"
              >
                Continue to batches <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Current reference: {Math.round(referenceArea).toLocaleString()} px²
            </p>
          )
        ) : null}
      </div>
    </AppShell>
  );
}
