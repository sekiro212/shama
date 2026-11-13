/**
 * adminDb.ts
 * -------------------------------------------------------------------------
 * مسار الكتابة الخاص بلوحة التحكّم.
 *
 * كانت اللوحة تكتب في قاعدة البيانات مباشرةً من المتصفّح بمفتاح anon، ولم
 * يكن ذلك ممكنًا إلا لأنّ الجداول كانت تقبل الكتابة من أي أحد — وهي الثغرة
 * نفسها التي أُغلقت. الكتابات الآن تمرّ بالدالة الطرفية `admin-db` التي
 * تتحقّق من رمز المسؤول الموقَّع ثم تنفّذ بمفتاح الخدمة.
 *
 * الاستعلامات (SELECT) لم تتغيّر: القراءة العامة للكتالوج ما زالت مسموحة،
 * فلا داعي لتمريرها عبر الخادم.
 * -------------------------------------------------------------------------
 */

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-db`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** الرمز الموقَّع المحفوظ مع جلسة المسؤول عند تسجيل الدخول. */
function adminToken(): string | undefined {
  try {
    const raw = localStorage.getItem("admin_auth");
    return raw ? (JSON.parse(raw).token as string | undefined) : undefined;
  } catch {
    return undefined;
  }
}

type Filters = Record<string, string | number | boolean | string[] | null>;

async function call<T>(body: Record<string, unknown>): Promise<T[]> {
  const token = adminToken();
  if (!token) {
    // جلسة قديمة سابقة لإضافة الرمز: الحلّ تسجيل خروج ودخول من جديد.
    throw new Error("انتهت جلسة المسؤول. سجّل الدخول من جديد.");
  }

  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
    },
    body: JSON.stringify({ adminToken: token, ...body }),
  });

  const payload = (await res.json().catch(() => null)) as
    | { data?: T[]; error?: string }
    | null;

  if (!res.ok) throw new Error(payload?.error ?? `admin-db failed (${res.status})`);
  return payload?.data ?? [];
}

/** إدراج صف أو عدّة صفوف؛ تُعيد الصفوف المُدرَجة (مع معرّفاتها). */
export const adminInsert = <T = Record<string, unknown>>(
  table: string,
  values: Record<string, unknown> | Record<string, unknown>[],
): Promise<T[]> => call<T>({ table, action: "insert", values });

/** تعديل الصفوف المطابقة للمُرشّح. المُرشّح إلزامي في الخادم. */
export const adminUpdate = <T = Record<string, unknown>>(
  table: string,
  values: Record<string, unknown>,
  filters: Filters,
): Promise<T[]> => call<T>({ table, action: "update", values, filters });

/** حذف الصفوف المطابقة للمُرشّح. المُرشّح إلزامي في الخادم. */
export const adminDelete = <T = Record<string, unknown>>(
  table: string,
  filters: Filters,
): Promise<T[]> => call<T>({ table, action: "delete", filters });
