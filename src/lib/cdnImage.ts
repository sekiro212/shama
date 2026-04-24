const SUPABASE_STORAGE_MARKER = "/storage/v1/object/";
const SUPABASE_RENDER_SEGMENT = "/storage/v1/render/image/";

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

export function cdnImg(url: string | null | undefined, opts: TransformOptions = {}): string {
  if (!url) return "";

  const supabaseIndex = url.indexOf(SUPABASE_STORAGE_MARKER);
  if (supabaseIndex !== -1) {
    const prefix = url.slice(0, supabaseIndex);
    const rest = url.slice(supabaseIndex + SUPABASE_STORAGE_MARKER.length);
    const rendered = `${prefix}${SUPABASE_RENDER_SEGMENT}${rest}`;
    return withParams(rendered, {
      width: opts.width,
      height: opts.height,
      quality: opts.quality ?? 75,
      format: opts.format,
      resize: opts.resize,
    });
  }

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
