/** Shared helpers for review rendering on ProductPage + /reviews aggregate. */

export function anonymizeEmail(email: string): string {
  if (!email) return "";
  const [local] = email.split("@");
  if (!local) return "";
  if (local.length <= 2) return local + "·";
  return `${local.slice(0, 2)}${"·".repeat(Math.min(4, local.length - 2))}`;
}

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
