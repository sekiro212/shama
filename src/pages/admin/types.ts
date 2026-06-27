// ===========================================================================
// types.ts — تعريفات الأنواع (TYPE) المشتركة لتطبيق الإدارة.
// مكان مركزي لأشكال البيانات (التي تعكس جداول Supabase) التي تتبادلها
// hooks الإدارة وألسنتها ونوافذها: العطور ومتغيّراتها،
// وطلبات الهدايا المخصّصة، وحالة نموذج الكوبون.
// ===========================================================================

import { PerfumeImage } from "@/services/imageService";
import { DiscountType, PromoScope } from "@/services/promoCodesService";

/** متغيّر بحجم عيّنة لعطر (مثلاً 3ml–30ml) بسعره/مخزونه الخاص. */
export interface PerfumeSample {
  id: string;
  size: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

/** متغيّر بحجم زجاجة كاملة لعطر (مثلاً 30ml–200ml) بسعره/مخزونه الخاص. */
export interface PerfumeBottleSize {
  id: string;
  size: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

/**
 * Perfume — سجل المنتج الرئيسي (يقابل جدول `perfumes`).
 * الحقول ثنائية اللغة مقترنة (`*` إنجليزي / `*_ar` عربي). و`images` و`samples`
 * و`bottle_sizes` علاقات اختيارية تُحمَّل إلى جانب المنتج.
 */
export interface Perfume {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  description: string;
  description_ar: string;
  fragrance_notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  fragrance_notes_ar: {
    top: string[];
    middle: string[];
    base: string[];
  };
  size: string;
  type: "bottle" | "sample" | "gift";
  rating: number;
  gender: "men" | "women" | "unisex";
  stock_quantity: number;
  is_active: boolean;
  has_samples: boolean;
  has_bottle_sizes: boolean;
  created_at: string;
  updated_at: string;
  images?: PerfumeImage[];
  samples?: PerfumeSample[];
  bottle_sizes?: PerfumeBottleSize[];
}

/**
 * CustomGiftOrder — طلب صندوق هدية يبنيه العميل (المناسبة، التغليف، لون
 * الصندوق، وبطاقة رسالة اختيارية وصورة معاينة مولّدة بالذكاء الاصطناعي) إضافةً إلى حالته
 * وسعره الإجمالي.
 */
export interface CustomGiftOrder {
  id: string;
  user_id: string | null;
  products: { id: string; name: string; price: number; image: string | null }[];
  occasion: string;
  box_color: string;
  wrapping_style: string;
  message_card: string | null;
  recipient_name: string | null;
  delivery_date: string | null;
  generated_image_url: string | null;
  image_style: string;
  status: string;
  total_price: number;
  created_at: string;
}

/**
 * CouponFormState — شكل نموذج إنشاء/تعديل الكوبون. تُحفظ الحقول الرقمية
 * كنصوص لأنها مرتبطة بمدخلات نصّية وتُحلَّل عند الإرسال؛
 * ويقيّد `scope_product_ids` الكوبون عندما يستهدف `scope` منتجات معيّنة.
 */
export interface CouponFormState {
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  max_discount: string;
  min_order_total: string;
  scope: PromoScope;
  scope_product_ids: string[];
  is_active: boolean;
  expires_at: string; // YYYY-MM-DD أو ""
  usage_limit: string;
  usage_limit_per_user: string;
}
