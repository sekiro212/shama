import type { CouponFormState, Perfume } from "./types";

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
