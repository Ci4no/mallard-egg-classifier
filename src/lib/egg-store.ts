import { useCallback, useEffect, useState } from "react";
import { api, type Batch, type CalibrationRecord } from "./api";
import { SIZE_CLASSES, type SizeClass } from "./egg-vision";

export type Counts = Record<SizeClass, number>;
export const emptyCounts = () => SIZE_CLASSES.reduce((a, k) => ({ ...a, [k]: 0 }), {} as Counts);

export function useCalibration() {
  const [calibration, setCalibration] = useState<CalibrationRecord | null>(null);
  const [ready, setReady] = useState(false);
  const reload = useCallback(
    () =>
      api<{ calibration: CalibrationRecord | null }>("calibrations/active")
        .then((r) => setCalibration(r.calibration))
        .finally(() => setReady(true)),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { calibration, referenceArea: calibration?.reference_area_px ?? null, ready, reload };
}
export function useBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(
    () =>
      api<{ batches: Batch[] }>("batches")
        .then((r) => setBatches(r.batches))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { batches, loading, reload };
}
export function useCounts() {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [averageConfidence, setAverageConfidence] = useState<Partial<Record<SizeClass, number>>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const reload = useCallback(
    () =>
      api<{
        summary: { class: SizeClass; count: number; avg_confidence: number }[];
        total: number;
      }>("analytics").then((r) => {
        const c = emptyCounts();
        const av: Partial<Record<SizeClass, number>> = {};
        r.summary.forEach((x) => {
          c[x.class] = Number(x.count);
          av[x.class] = Number(x.avg_confidence);
        });
        setCounts(c);
        setAverageConfidence(av);
        setTotal(r.total);
      }),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { counts, averageConfidence, total, reload };
}
