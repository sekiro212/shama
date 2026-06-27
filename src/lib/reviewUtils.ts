/**
 * reviewUtils.ts — دوال مساعدة مشتركة لعرض المراجعات.
 *
 * تُستخدم في صفحة المنتج وفي صفحة /reviews المجمّعة لإخفاء هوية البريد
 * الإلكتروني للمراجِع وتنسيق تاريخ المراجعة حسب اللغة.
 */

/** Shared helpers for review rendering on ProductPage + /reviews aggregate. */

/**
 * يُخفي هوية البريد الإلكتروني للحفاظ على الخصوصية: يُبقي أول حرفين من الجزء
 * المحلي ويستبدل الباقي بنقاط (·)، ويتجاهل نطاق المجال بالكامل.
 * @param email البريد الإلكتروني الكامل للمراجِع.
 * @returns نسخة مُخفاة الهوية (مثل "ab··")، أو "" إن كان البريد فارغاً.
 */
export function anonymizeEmail(email: string): string {
  if (!email) return "";
  const [local] = email.split("@");
  if (!local) return "";
  if (local.length <= 2) return local + "·";
  return `${local.slice(0, 2)}${"·".repeat(Math.min(4, local.length - 2))}`;
}

/**
 * ينسّق تاريخ ISO إلى تاريخ مقروء بحسب اللغة (تقويم ليبي للعربية).
 * @param iso سلسلة تاريخ بصيغة ISO.
 * @param language اللغة النشطة ("en" أو "ar").
 * @returns تاريخاً منسّقاً، أو "" إذا تعذّر التحليل.
 */
export function formatReviewDate(iso: string, language: "en" | "ar"): string {
  try {
    return new Date(iso).toLocaleDateString(
      language === "ar" ? "ar-LY" : "en-GB",
      { year: "numeric", month: "short", day: "numeric" },
    );
  } catch {
    return "";
  }
}
