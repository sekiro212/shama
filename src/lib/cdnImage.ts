/**
 * cdnImage.ts — يبني روابط صور مُحسَّنة لصور المنتجات.
 *
 * يوحّد طريقة طلب الصور المُعاد تحجيمها/المضغوطة. تحويلات صور Supabase Storage
 * تتطلب خطة مدفوعة (انظر الملاحظة أدناه)، لذلك بالنسبة للصور المستضافة على
 * Supabase نمرر حالياً الرابط الأصلي كما هو، بينما روابط Unsplash تحصل على
 * تحويلات تُضاف عبر معاملات الاستعلام (query params).
 */

/** التحويل المطلوب للصورة (مجموعة جزئية تُربط بمعاملات استعلام كل CDN). */
type TransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "origin" | "avif" | "webp";
  resize?: "cover" | "contain" | "fill";
};

/**
 * يُلحق سلسلة استعلام برابط، متخطّياً المعاملات الفارغة/غير المعرّفة.
 * @param url الرابط الأساسي (قد يحتوي بالفعل على `?`).
 * @param params أزواج مفتاح/قيمة لترميزها وإلحاقها.
 * @returns الرابط مع سلسلة استعلام مرتبطة بشكل صحيح (`?` أو `&`).
 */
function withParams(url: string, params: Record<string, string | number | undefined>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  if (!q) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${q}`;
}

// تحويلات صور Supabase تتطلب خطة مدفوعة. مشروع shama.ly الحالي على الخطة
// المجانية (Free)، لذا فإن /storage/v1/render/image يعيد 403 ← ERR_BLOCKED_BY_ORB
// في Chrome وتبقى بطاقات المنتجات عالقة على عنصر التحميل البديل. إلى أن ينتقل
// المشروع إلى Pro+، نقدّم كائن التخزين الأصلي مباشرة.
/**
 * يعيد رابط صورة (ربما محوّلاً) للمصدر المعطى.
 * @param url رابط الصورة المصدر (Supabase Storage أو Unsplash أو أي شيء).
 * @param opts العرض/الارتفاع/الجودة/الصيغة/إعادة التحجيم المطلوبة.
 * @returns رابطاً محوّلاً لـ Unsplash؛ والرابط الأصلي خلاف ذلك؛ و"" إن لم يوجد رابط.
 */
export function cdnImg(url: string | null | undefined, opts: TransformOptions = {}): string {
  if (!url) return "";

  // يدعم Unsplash التحويلات الفورية عبر معاملات الاستعلام الخاصة به (w/h/q/fm/fit).
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
