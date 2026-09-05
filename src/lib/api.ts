const TOKEN_KEY = "mde:session";

export type User = { id: number; name: string; email: string; role: "admin" | "operator" };
export type Batch = {
  id: number;
  name: string;
  notes?: string;
  status: "active" | "closed";
  started_at: string;
  scan_count: number;
};
export type CalibrationRecord = {
  id: number;
  device_id: number | null;
  reference_area_px: number;
  reference_width_mm: number | null;
  reference_height_mm: number | null;
  distance_mm: number;
  alignment_deg: number;
  sample_count: number;
  variation_percent: number;
  is_valid: number;
  created_at: string;
};
export type Scan = {
  id: number;
  batch_id: number;
  batch_name: string;
  predicted_class: string;
  actual_class: string | null;
  confidence: number;
  area_px: number;
  measured_width_mm: number | null;
  measured_height_mm: number | null;
  distance_mm: number;
  stable: number;
  operator: string;
  captured_at: string;
};

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export async function api<T>(route: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`/api/index.php?route=${encodeURIComponent(route)}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({ error: "Invalid server response" }));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data as T;
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
