// Lightweight blob detection used to measure egg area (in px²) from a video frame.
// Downscales the frame, thresholds it against the background, then finds the
// largest connected component and returns its area + bounding box.

export type Detection = {
  area: number; // px² in original frame coordinates
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

const WORK_WIDTH = 240;

export function detectEgg(
  source: HTMLVideoElement | HTMLCanvasElement,
  work: HTMLCanvasElement,
): Detection | null {
  const srcW = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcH = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  if (!srcW || !srcH) return null;

  const scale = WORK_WIDTH / srcW;
  const w = WORK_WIDTH;
  const h = Math.max(1, Math.round(srcH * scale));
  work.width = w;
  work.height = h;

  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const gray = new Uint8ClampedArray(w * h);
  const hist = new Array(256).fill(0);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    gray[p] = g;
    hist[g]++;
  }

  // Otsu threshold
  const total = w * h;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }

  // Eggs are lighter than the tray in most setups; pick the polarity whose
  // foreground occupies the smaller (object-like) share of the frame.
  let lightCount = 0;
  for (let p = 0; p < total; p++) if (gray[p] > threshold) lightCount++;
  const foregroundIsLight = lightCount <= total / 2;

  const mask = new Uint8Array(total);
  for (let p = 0; p < total; p++) {
    const isLight = gray[p] > threshold;
    mask[p] = (foregroundIsLight ? isLight : !isLight) ? 1 : 0;
  }

  // Largest connected component (iterative flood fill, 4-neighbour)
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  let bestBlob: Detection | null = null;

  for (let start = 0; start < total; start++) {
    if (!mask[start] || seen[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let count = 0;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;

    while (sp > 0) {
      const p = stack[--sp];
      const px = p % w;
      const py = (p / w) | 0;
      count++;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;

      if (px > 0 && mask[p - 1] && !seen[p - 1]) {
        seen[p - 1] = 1;
        stack[sp++] = p - 1;
      }
      if (px < w - 1 && mask[p + 1] && !seen[p + 1]) {
        seen[p + 1] = 1;
        stack[sp++] = p + 1;
      }
      if (py > 0 && mask[p - w] && !seen[p - w]) {
        seen[p - w] = 1;
        stack[sp++] = p - w;
      }
      if (py < h - 1 && mask[p + w] && !seen[p + w]) {
        seen[p + w] = 1;
        stack[sp++] = p + w;
      }
    }

    if (count < 40) continue;
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const fill = count / (bw * bh);
    // An egg must be fully visible inside the guide. Reject hands, furniture,
    // background regions, and clipped objects touching the frame edges.
    if (bw >= w * 0.95 && bh >= h * 0.95) continue;
    if (minX <= 2 || minY <= 2 || maxX >= w - 3 || maxY >= h - 3) continue;
    if (count >= total * 0.32) continue;
    const aspect = bw / bh;
    if (aspect < 0.45 || aspect > 1.9) continue;
    // A filled ellipse occupies about 78.5% of its bounding box. Leave room
    // for natural egg variation while excluding sparse, finger-like blobs.
    if (fill < 0.56 || fill > 0.94) continue;

    const inv = 1 / scale;
    const candidate: Detection = {
      area: count * inv * inv,
      x: minX * inv,
      y: minY * inv,
      width: bw * inv,
      height: bh * inv,
      confidence: Math.min(1, fill * 1.15),
    };
    if (!bestBlob || candidate.area > bestBlob.area) bestBlob = candidate;
  }

  return bestBlob;
}

export const SIZE_CLASSES = ["Small", "Medium", "Large", "Extra Large"] as const;
export type SizeClass = (typeof SIZE_CLASSES)[number];

// Ratio bands relative to the calibrated reference area (a Medium egg).
export const RATIO_BANDS: { label: SizeClass; max: number }[] = [
  { label: "Small", max: 0.86 },
  { label: "Medium", max: 1.05 },
  { label: "Large", max: 1.24 },
  { label: "Extra Large", max: Infinity },
];

export function classifyArea(area: number, referenceArea: number): SizeClass {
  const ratio = area / referenceArea;
  return RATIO_BANDS.find((b) => ratio < b.max)!.label;
}

export function classificationConfidence(
  area: number,
  referenceArea: number,
  detectionConfidence: number,
) {
  const ratio = area / referenceArea;
  const boundaries = [0.86, 1.05, 1.24];
  const distance = Math.min(...boundaries.map((b) => Math.abs(ratio - b)));
  const boundaryCertainty = Math.min(1, 0.55 + distance / 0.2);
  return Math.max(0.01, Math.min(0.99, detectionConfidence * 0.65 + boundaryCertainty * 0.35));
}
