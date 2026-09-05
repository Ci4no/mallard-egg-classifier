import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { detectEgg, type Detection } from "@/lib/egg-vision";

type Options = { active?: boolean; fps?: number };

export function useEggCamera({ active = true, fps = 8 }: Options = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timer: number | undefined;
    let requestRunning = false;
    let roboflowAvailable = true;

    const numberValue = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : null;

    const findEggPredictions = (value: unknown, found: Record<string, unknown>[] = []) => {
      if (Array.isArray(value)) {
        value.forEach((item) => findEggPredictions(item, found));
      } else if (value && typeof value === "object") {
        const item = value as Record<string, unknown>;
        const className = String(item.class ?? item.class_name ?? item.label ?? "").toLowerCase();
        const confidence = numberValue(item.confidence);
        const points = Array.isArray(item.points) ? item.points : null;
        if (className === "egg" && confidence !== null && (points || numberValue(item.width))) {
          found.push(item);
        }
        Object.values(item).forEach((child) => findEggPredictions(child, found));
      }
      return found;
    };

    const predictionToDetection = (
      prediction: Record<string, unknown>,
      scaleX: number,
      scaleY: number,
    ): Detection | null => {
      const confidence = numberValue(prediction.confidence) ?? 0;
      const rawPoints = Array.isArray(prediction.points) ? prediction.points : [];
      const points = rawPoints
        .map((point) => {
          if (!point || typeof point !== "object") return null;
          const p = point as Record<string, unknown>;
          const x = numberValue(p.x);
          const y = numberValue(p.y);
          return x === null || y === null ? null : { x, y };
        })
        .filter((point): point is { x: number; y: number } => point !== null);

      if (points.length >= 3) {
        let twiceArea = 0;
        for (let i = 0; i < points.length; i++) {
          const next = points[(i + 1) % points.length];
          twiceArea += points[i].x * next.y - next.x * points[i].y;
        }
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
          area: (Math.abs(twiceArea) / 2) * scaleX * scaleY,
          x: minX * scaleX,
          y: minY * scaleY,
          width: (maxX - minX) * scaleX,
          height: (maxY - minY) * scaleY,
          confidence,
        };
      }

      const width = numberValue(prediction.width);
      const height = numberValue(prediction.height);
      const centerX = numberValue(prediction.x);
      const centerY = numberValue(prediction.y);
      if (width === null || height === null || centerX === null || centerY === null) return null;
      return {
        // Bounding-box fallback is only used if the workflow omits polygon points.
        area: Math.PI * (width * scaleX / 2) * (height * scaleY / 2),
        x: (centerX - width / 2) * scaleX,
        y: (centerY - height / 2) * scaleY,
        width: width * scaleX,
        height: height * scaleY,
        confidence,
      };
    };

    if (!workRef.current) workRef.current = document.createElement("canvas");

    const loop = async () => {
      const video = videoRef.current;
      const work = workRef.current;
      if (video && work && video.readyState >= 2 && !requestRunning) {
        try {
          if (roboflowAvailable) {
            requestRunning = true;
            const inputWidth = Math.min(640, video.videoWidth);
            const inputHeight = Math.max(1, Math.round(video.videoHeight * (inputWidth / video.videoWidth)));
            work.width = inputWidth;
            work.height = inputHeight;
            work.getContext("2d")?.drawImage(video, 0, 0, inputWidth, inputHeight);
            const image = work.toDataURL("image/jpeg", 0.82);
            const response = await api<{ result: unknown }>("roboflow/detect", {
              method: "POST",
              body: JSON.stringify({ image }),
            });
            if (cancelled) return;
            const predictions = findEggPredictions(response.result);
            const scaleX = video.videoWidth / inputWidth;
            const scaleY = video.videoHeight / inputHeight;
            const detections = predictions
              .map((prediction) => predictionToDetection(prediction, scaleX, scaleY))
              .filter((item): item is Detection => item !== null && item.confidence >= 0.35);
            setDetection(detections.sort((a, b) => b.confidence - a.confidence)[0] ?? null);
          } else {
            setDetection(detectEgg(video, work));
          }
        } catch {
          // Preserve offline/local operation when Roboflow is unavailable or not configured.
          roboflowAvailable = false;
          setDetection(detectEgg(video, work));
        } finally {
          requestRunning = false;
        }
      }
      timer = window.setTimeout(loop, roboflowAvailable ? Math.max(500, 1000 / fps) : 1000 / fps);
    };

    const start = async () => {
      setStatus("starting");
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new DOMException("Camera access requires HTTPS or localhost.", "SecurityError");
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("live");
        void loop();
      } catch (e) {
        setStatus("error");
        setError(
          e instanceof Error && e.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access to continue."
            : e instanceof Error && e.name === "SecurityError"
              ? "Camera blocked on an insecure network address. Open this page through localhost on this computer, or use HTTPS on another device."
              : "No camera could be started on this device.",
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, fps]);

  return { videoRef, detection, status, error };
}
