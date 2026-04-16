import { PerfumeImage } from "@/services/imageService";
import { DiscountType, PromoScope } from "@/services/promoCodesService";

export interface PerfumeSample {
  id: string;
  size: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface PerfumeBottleSize {
  id: string;
  size: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

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

export interface CouponFormState {
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  max_discount: string;
  min_order_total: string;
  scope: PromoScope;
  scope_product_ids: string[];
  is_active: boolean;
  expires_at: string; // YYYY-MM-DD or ""
  usage_limit: string;
  usage_limit_per_user: string;
}
