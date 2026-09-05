import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, CameraStage } from "@/components/egg-ui";
import { useEggCamera } from "@/hooks/use-egg-camera";
import { useBatches, useCalibration } from "@/lib/egg-store";
import { classifyArea, classificationConfidence, type SizeClass } from "@/lib/egg-vision";
import { api } from "@/lib/api";

export const Route = createFileRoute("/classify")({
  head: () => ({
    meta: [
      { title: "Classify Egg Size — Real-Time Image Recognition" },
      {
        name: "description",
        content:
          "Point your camera at a mallard duck egg and classify it as Small, Medium, Large or Extra Large in real time.",
      },
      { property: "og:title", content: "Classify Egg Size in Real Time" },
      {
        property: "og:description",
        content: "Live image-recognition classification of mallard duck egg sizes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassifyPage,
});

function ClassifyPage() {
  const { videoRef, detection, status, error } = useEggCamera();
  const { calibration, referenceArea, ready } = useCalibration();
  const { batches } = useBatches();
  const [recorded, setRecorded] = useState<SizeClass | null>(null);
  const [batchId, setBatchId] = useState("");
  const [message, setMessage] = useState("");
  const [areas, setAreas] = useState<number[]>([]);
  useEffect(() => {
    if (detection) setAreas((v) => [...v.slice(-7), detection.area]);
  }, [detection]);
  const variation = useMemo(() => {
    if (areas.length < 4) return 100;
    const avg = areas.reduce((a, b) => a + b, 0) / areas.length;
    return Math.max(...areas.map((x) => (Math.abs(x - avg) / avg) * 100));
  }, [areas]);

  const live: SizeClass | null =
    detection && referenceArea ? classifyArea(detection.area, referenceArea) : null;
  const confidence =
    detection && referenceArea
      ? classificationConfidence(detection.area, referenceArea, detection.confidence)
      : 0;
  const stable = variation <= 3;

  return (
    <AppShell back>
      <div className="mx-auto max-w-3xl">
        <p className="label-eyebrow text-center">Classify</p>

        <div className="mt-5">
          <CameraStage
            videoRef={videoRef}
            detection={detection}
            status={status}
            error={error}
            outline="ellipse"
          />
        </div>

        <div className="panel mt-5 px-5 py-4 text-center">
          <p className="label-eyebrow">Classification</p>
          <p className="mt-1 font-display text-3xl text-primary">
            {ready && !referenceArea ? "Not calibrated" : (live ?? "Detecting…")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {detection ? `${Math.round(detection.area).toLocaleString()} px²` : "No egg in frame"}
            {referenceArea ? ` · reference ${Math.round(referenceArea).toLocaleString()} px²` : ""}
          </p>
          {live ? (
            <p className="mt-2 text-sm">
              <strong>{(confidence * 100).toFixed(1)}%</strong> confidence ·{" "}
              <span className={stable ? "text-primary" : "text-destructive"}>
                {stable ? "Stable" : "Hold device steady"}
              </span>
            </p>
          ) : null}
        </div>

        {ready && !referenceArea ? (
          <Link
            to="/calibrate"
            className="mt-4 block w-full rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground shadow-lift"
          >
            Calibrate first
          </Link>
        ) : (
          <div className="mt-4 space-y-3">
            <select
              aria-label="Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <option value="">Select active batch</option>
              {batches
                .filter((b) => b.status === "active")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!live || !batchId || !stable || !calibration}
              onClick={async () => {
                if (!live || !detection || !calibration) return;
                setMessage("");
                try {
                  const physicalArea =
                    calibration.reference_width_mm && calibration.reference_height_mm
                      ? (Math.PI *
                          calibration.reference_width_mm *
                          calibration.reference_height_mm) /
                        4
                      : null;
                  const pxPerMm = physicalArea
                    ? Math.sqrt(calibration.reference_area_px / physicalArea)
                    : null;
                  await api("scans", {
                    method: "POST",
                    body: JSON.stringify({
                      batch_id: Number(batchId),
                      calibration_id: calibration.id,
                      predicted_class: live,
                      confidence,
                      area_px: detection.area,
                      width_px: detection.width,
                      height_px: detection.height,
                      measured_width_mm: pxPerMm ? detection.width / pxPerMm : null,
                      measured_height_mm: pxPerMm ? detection.height / pxPerMm : null,
                      distance_mm: calibration.distance_mm,
                      alignment_deg: calibration.alignment_deg,
                      stable: true,
                    }),
                  });
                  setRecorded(live);
                  window.setTimeout(() => setRecorded(null), 1600);
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Could not save scan");
                }
              }}
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-opacity disabled:opacity-40"
            >
              {recorded ? `Recorded ${recorded}` : "Record to counter"}
            </button>
            {message ? <p className="text-center text-xs text-destructive">{message}</p> : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
