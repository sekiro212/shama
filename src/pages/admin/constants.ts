// ===========================================================================
// constants.ts — الثوابت (CONSTANTS) والدوال المساعدة الصغيرة المشتركة لتطبيق الإدارة.
// يحتوي على حالات النموذج الفارغة/الافتراضية المستخدمة لتهيئة وإعادة ضبط نافذتي
// محرّر الكوبون والعطر، إضافةً إلى دالة مساعدة لتسمية حالة Vanex.
// ===========================================================================

import type { CouponFormState, Perfume } from "./types";

/**
 * initialCouponForm — الحالة الافتراضية الفارغة لنافذة إنشاء/تعديل الكوبون.
 * تُستخدم لتهيئة نموذج كوبون جديد ولإعادة ضبط النموذج بعد الإرسال.
 */
export const initialCouponForm: CouponFormState = {
  code: "",
  discount_type: "fixed",
  discount_value: "",
  max_discount: "",
  min_order_total: "0",
  scope: "all_products",
  scope_product_ids: [],
  is_active: true,
  expires_at: "",
  usage_limit: "",
  usage_limit_per_user: "",
};

/**
 * initialPerfumeData — القيم الافتراضية الفارغة لعطر جديد (NEW) في نموذج
 * المحرّر. يُسقِط الحقول التي يديرها الخادم (id، created_at، updated_at) لأنها
 * تُعيَّن من قاعدة البيانات لا من النموذج.
 */
export const initialPerfumeData: Omit<Perfume, "id" | "created_at" | "updated_at"> = {
  name: "",
  name_ar: "",
  price: 0,
  description: "",
  description_ar: "",
  fragrance_notes: {
    top: [],
    middle: [],
    base: [],
  },
  fragrance_notes_ar: {
    top: [],
    middle: [],
    base: [],
  },
  size: "",
  type: "bottle",
  rating: 4.5,
  gender: "unisex",
  stock_quantity: 0,
  is_active: true,
  has_samples: false,
  has_bottle_sizes: false,
};

/**
 * ترجمة رمز حالة Vanex، مع الرجوع إلى نسخة مقروءة من الرمز
 * الخام (مثلاً "store_canceled" ← "store canceled") عند عدم وجود مفتاح
 * ترجمة — إذ يضيف Vanex حالات قد لا نكون قد ترجمناها بعد.
 */
export const vanexStatusLabel = (
  t: (key: string) => string,
  status: string
): string => {
  const label = t(`admin.vanex.statuses.${status}`);
  return label === `admin.vanex.statuses.${status}`
    ? status.replace(/_/g, " ")
    : label;
};
