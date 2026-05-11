type TransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "origin" | "avif" | "webp";
  resize?: "cover" | "contain" | "fill";
};

function withParams(url: string, params: Record<string, string | number | undefined>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  if (!q) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${q}`;
}

// Supabase image transformations require a paid plan. The current shama.ly
// project is on Free, so /storage/v1/render/image returns 403 → ERR_BLOCKED_BY_ORB
// in Chrome and product cards stay stuck on the loading placeholder. Until the
// project moves to Pro+, serve the original storage object directly.
export function cdnImg(url: string | null | undefined, opts: TransformOptions = {}): string {
  if (!url) return "";

  if (url.includes("images.unsplash.com")) {
    return withParams(url, {
      w: opts.width,
      h: opts.height,
      q: opts.quality ?? 75,
      fm: opts.format === "webp" ? "webp" : undefined,
      fit: opts.resize === "cover" ? "crop" : undefined,
      auto: "format,compress",
    });
  }

  return url;
}
