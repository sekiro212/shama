/**
 * productsService.ts
 * -------------------
 * طبقة الخدمة الخاصة بكتالوج العطور. كل استعلامات Supabase على جداول
 * `perfumes` و`perfume_samples` و`perfume_bottle_sizes` موجودة هنا حتى لا
 * تتعامل مكوّنات React مع قاعدة البيانات مباشرة.
 *
 * المسؤوليات:
 *  - جلب المنتجات (قائمة مقسّمة إلى صفحات، منتج واحد، بحث، تصفية)
 *  - جلب متغيّرات أحجام العيّنات وأحجام القوارير لكل منتج
 *  - تحويل صفوف قاعدة البيانات بصيغة snake_case إلى شكل `Product` بصيغة camelCase الذي يستخدمه التطبيق
 *  - دوال تصفية نقية تعمل في الذاكرة (حسب النوع / الجنس / حجم العيّنة)
 */
import { supabase } from "@/lib/supabase";
import { getPerfumeImages, PerfumeImage } from "./imageService";

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

export interface Product {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  description: string;
  description_ar: string;
  fragranceNotes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  fragranceNotes_ar: {
    top: string[];
    middle: string[];
    base: string[];
  };
  size: string;
  type: "bottle" | "sample" | "gift";
  rating: number;
  gender?: "men" | "women" | "unisex";
  stock_quantity?: number;
  is_active?: boolean;
  has_samples?: boolean;
  has_bottle_sizes?: boolean;
  images?: PerfumeImage[];
  samples?: PerfumeSample[];
  bottle_sizes?: PerfumeBottleSize[];
}

// Transform database product to Product interface
// كائن ملاحظات فارغ يُعاد استخدامه كقيمة احتياطية حتى لا تضطر الواجهة للتحقق من null.
const defaultNotes = { top: [], middle: [], base: [] };

/**
 * يحوّل صفًّا خامًا من قاعدة البيانات بصيغة snake_case إلى شكل `Product` بصيغة
 * camelCase الذي يستهلكه التطبيق، مع إرفاق الصور والعيّنات وأحجام القوارير المُحمّلة منفصلة.
 * @param dbProduct  الصف الخام من جدول `perfumes`.
 * @param images     صور المعرض المُحمّلة مسبقًا (اختياري، الافتراضي []).
 * @param samples    متغيّرات أحجام العيّنات المُحمّلة مسبقًا (اختياري، الافتراضي []).
 * @param bottleSizes متغيّرات أحجام القوارير المُحمّلة مسبقًا (اختياري، الافتراضي []).
 * @returns كائن `Product` بعد التطبيع.
 */
const transformDatabaseProduct = (
  dbProduct: any,
  images?: PerfumeImage[],
  samples?: PerfumeSample[],
  bottleSizes?: PerfumeBottleSize[]
): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  // الحقول العربية ترجع إلى القيمة الإنجليزية عند عدم وجود ترجمة بعد.
  name_ar: dbProduct.name_ar || dbProduct.name,
  price: dbProduct.price,
  description: dbProduct.description,
  description_ar: dbProduct.description_ar || dbProduct.description,
  fragranceNotes: dbProduct.fragrance_notes || defaultNotes,
  // الملاحظات العربية ترجع إلى الملاحظات الإنجليزية ثم إلى القيم الافتراضية الفارغة.
  fragranceNotes_ar: dbProduct.fragrance_notes_ar || dbProduct.fragrance_notes || defaultNotes,
  size: dbProduct.size,
  type: dbProduct.type,
  rating: dbProduct.rating,
  gender: dbProduct.gender,
  stock_quantity: dbProduct.stock_quantity,
  is_active: dbProduct.is_active,
  has_samples: dbProduct.has_samples,
  has_bottle_sizes: dbProduct.has_bottle_sizes,
  images: images || [],
  samples: samples || [],
  bottle_sizes: bottleSizes || [],
});

/**
 * يجلب متغيّرات أحجام العيّنات النشطة (مثل 3ml–30ml) لعطر واحد.
 * @param perfumeId مُعرّف العطر.
 * @returns مصفوفة العيّنات النشطة مرتّبة حسب الحجم؛ [] عند حدوث خطأ.
 */
export const fetchPerfumeSamples = async (
  perfumeId: string
): Promise<PerfumeSample[]> => {
  try {
    const { data, error } = await supabase
      .from("perfume_samples")
      .select("*")
      .eq("perfume_id", perfumeId)
      // عرض المتغيّرات التي فعّلها المسؤول للبيع فقط.
      .eq("is_active", true)
      .order("size");

    if (error) {
      console.error("Error fetching perfume samples:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching perfume samples:", error);
    return [];
  }
};

/**
 * يجلب متغيّرات أحجام القوارير الكاملة النشطة (مثل 30ml–200ml) لعطر واحد.
 * @param perfumeId مُعرّف العطر.
 * @returns مصفوفة أحجام القوارير النشطة مرتّبة حسب الحجم؛ [] عند حدوث خطأ.
 */
export const fetchPerfumeBottleSizes = async (
  perfumeId: string
): Promise<PerfumeBottleSize[]> => {
  try {
    const { data, error } = await supabase
      .from("perfume_bottle_sizes")
      .select("*")
      .eq("perfume_id", perfumeId)
      .eq("is_active", true) // Restored - bottle sizes should be active
      .order("size");

    if (error) {
      console.error("Error fetching perfume bottle sizes:", error);
      return [];
    }

    console.log(`Bottle sizes for perfume ${perfumeId}:`, data);
    return data || [];
  } catch (error) {
    console.error("Error fetching perfume bottle sizes:", error);
    return [];
  }
};

/**
 * يجلب صفحة واحدة من المنتجات النشطة لشبكة المجموعة، إضافة إلى العدد الإجمالي
 * حتى تتمكّن الواجهة من عرض أدوات التنقّل بين الصفحات.
 * @param page     رقم الصفحة يبدأ من 1 (الافتراضي 1).
 * @param pageSize عدد العناصر في الصفحة (الافتراضي 8).
 * @returns `{ products, total }` — حيث total هو العدد الكامل للمنتجات النشطة وليس حجم الصفحة.
 */
// Fetch all products from database (only active ones for collection display)
// Updated: now supports pagination
export const fetchProducts = async (
  page: number = 1,
  pageSize: number = 8
): Promise<{ products: Product[]; total: number }> => {
  try {
    // تحويل رقم الصفحة (يبدأ من 1) إلى نطاق صفوف شامل يبدأ من 0 كما يتوقّعه Supabase.
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // استخدام head:true مع count:"exact" يُعيد عدد الصفوف فقط (بدون الصفوف نفسها)
    // حتى نحسب عدد الصفحات بتكلفة منخفضة.
    const { count, error: countError } = await supabase
      .from("perfumes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (countError) {
      console.error("Error fetching product count:", countError);
      return { products: [], total: 0 };
    }

    // الأحدث أولًا؛ تقصر .range() الاستعلام على صفوف هذه الصفحة فقط.
    const { data, error } = await supabase
      .from("perfumes")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching products:", error);
      return { products: [], total: 0 };
    }

    if (!data) return { products: [], total: 0 };

    // لكل منتج في هذه الصفحة نُحمّل صوره وعيّناته وأحجام قواريره بالتوازي. تُبقي
    // Promise.all على الـ map الخارجي كل المنتجات قيد التحميل دفعة واحدة (صفوف هذه
    // الصفحة فقط، لذا تبقى تكلفة استعلامات N+1 محدودة).
    const productsWithImagesAndSamples = await Promise.all(
      data.map(async (product) => {
        const [images, samples, bottleSizes] = await Promise.all([
          getPerfumeImages(product.id),
          fetchPerfumeSamples(product.id),
          fetchPerfumeBottleSizes(product.id),
        ]);
        return transformDatabaseProduct(product, images, samples, bottleSizes);
      })
    );

    return { products: productsWithImagesAndSamples, total: count || 0 };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], total: 0 };
  }
};

/**
 * يجلب منتجًا نشطًا واحدًا (لصفحة تفاصيل المنتج) مع كل صوره وعيّناته وأحجام قواريره.
 * @param id مُعرّف العطر.
 * @returns كائن `Product` الكامل، أو null إن لم يُوجد/غير نشط/عند حدوث خطأ.
 */
// Fetch single product by ID
export const fetchProductById = async (id: string): Promise<Product | null> => {
  try {
    // تتوقّع .single() صفًّا واحدًا بالضبط وإلا تُرجع خطأ.
    const { data, error } = await supabase
      .from("perfumes")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }

    if (!data) return null;

    console.log("Raw product from database:", data);

    // Load images, samples, and bottle sizes for this product
    const [images, samples, bottleSizes] = await Promise.all([
      getPerfumeImages(data.id),
      fetchPerfumeSamples(data.id),
      fetchPerfumeBottleSizes(data.id),
    ]);

    console.log("Product data loaded:", {
      name: data.name,
      has_bottle_sizes: data.has_bottle_sizes,
      bottle_sizes_count: bottleSizes.length,
      bottle_sizes: bottleSizes,
      has_samples: data.has_samples,
      samples_count: samples.length,
      samples: samples,
    });

    return transformDatabaseProduct(data, images, samples, bottleSizes);
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
};

// Helper functions for filtering (maintaining backward compatibility)
// دوال تصفية نقية تعمل على مصفوفة مُحمّلة مسبقًا — بدون أي استدعاءات لقاعدة البيانات.

/** تُرجع منتجات القوارير الكاملة فقط من قائمة موجودة في الذاكرة. */
export const getFullBottles = (products: Product[]) =>
  products.filter((p) => p.type === "bottle");

/** تُرجع منتجات العيّنات فقط من قائمة موجودة في الذاكرة. */
export const getSamples = (products: Product[]) =>
  products.filter((p) => p.type === "sample");

/** تُرجع منتجات أطقم الهدايا فقط من قائمة موجودة في الذاكرة. */
export const getGiftSets = (products: Product[]) =>
  products.filter((p) => p.type === "gift");

/** تُصفّي قائمة في الذاكرة حسب الجنس؛ القيمة "all" تمرّر كل العناصر. */
export const getByGender = (products: Product[], gender: string) => {
  if (gender === "all") return products;
  return products.filter((p) => p.gender === gender);
};

/** تُصفّي قائمة في الذاكرة حسب حجم العيّنة؛ القيمة "all" تمرّر كل العناصر. */
export const getSamplesBySize = (products: Product[], size: string) => {
  if (size === "all") return products;
  return products.filter((p) => p.size === size);
};

/**
 * يبحث في المنتجات النشطة بالاسم، مطابقًا الاسم الإنجليزي أو العربي.
 * @param query نص البحث الحر.
 * @returns المنتجات المطابقة مع تحميل الصور والمتغيّرات؛ [] عند حدوث خطأ.
 */
// Search products by name
export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    // استخدام .or() مع شرطي ilike = مطابقة جزئية غير حسّاسة لحالة الأحرف على الاسم
    // الإنجليزي أو العربي. تجعل علامات %...% البحث من نوع "يحتوي على".
    const { data, error } = await supabase
      .from("perfumes")
      .select("*")
      .eq("is_active", true)
      .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%`)
      .order("name");

    if (error) {
      console.error("Error searching products:", error);
      return [];
    }

    if (!data) return [];

    // Load images, samples, and bottle sizes for each product
    const productsWithImagesAndSamples = await Promise.all(
      data.map(async (product) => {
        const [images, samples, bottleSizes] = await Promise.all([
          getPerfumeImages(product.id),
          fetchPerfumeSamples(product.id),
          fetchPerfumeBottleSizes(product.id),
        ]);
        return transformDatabaseProduct(product, images, samples, bottleSizes);
      })
    );

    return productsWithImagesAndSamples;
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
};

/**
 * استعلام منتجات مُصفّى على جانب الخادم. يبني استعلام Supabase تدريجيًا مضيفًا
 * المُرشّحات التي زوّدها المُستدعي فعليًا فقط.
 * @param filters قيود اختيارية للنوع / الجنس / نطاق السعر.
 * @returns المنتجات النشطة المطابقة مع تحميل الصور والمتغيّرات؛ [] عند حدوث خطأ.
 */
// Filter products by category
export const filterProducts = async (filters: {
  type?: "bottle" | "sample" | "gift";
  gender?: "men" | "women" | "unisex";
  minPrice?: number;
  maxPrice?: number;
}): Promise<Product[]> => {
  try {
    // نبدأ من استعلام المنتجات النشطة الأساسي ثم نُسلسل المُرشّحات بشكل شرطي حتى
    // لا تُقيّد المُرشّحات غير المُحدَّدة النتيجة.
    let query = supabase.from("perfumes").select("*").eq("is_active", true);

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.gender) {
      query = query.eq("gender", filters.gender);
    }

    // gte / lte = حدّ أدنى / أقصى للسعر شامل للطرفين.
    if (filters.minPrice !== undefined) {
      query = query.gte("price", filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte("price", filters.maxPrice);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error filtering products:", error);
      return [];
    }

    if (!data) return [];

    // Load images, samples, and bottle sizes for each product
    const productsWithImagesAndSamples = await Promise.all(
      data.map(async (product) => {
        const [images, samples, bottleSizes] = await Promise.all([
          getPerfumeImages(product.id),
          fetchPerfumeSamples(product.id),
          fetchPerfumeBottleSizes(product.id),
        ]);
        return transformDatabaseProduct(product, images, samples, bottleSizes);
      })
    );

    return productsWithImagesAndSamples;
  } catch (error) {
    console.error("Error filtering products:", error);
    return [];
  }
};
