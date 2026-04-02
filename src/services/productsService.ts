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
const defaultNotes = { top: [], middle: [], base: [] };

const transformDatabaseProduct = (
  dbProduct: any,
  images?: PerfumeImage[],
  samples?: PerfumeSample[],
  bottleSizes?: PerfumeBottleSize[]
): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  name_ar: dbProduct.name_ar || dbProduct.name,
  price: dbProduct.price,
  description: dbProduct.description,
  description_ar: dbProduct.description_ar || dbProduct.description,
  fragranceNotes: dbProduct.fragrance_notes || defaultNotes,
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

// Fetch samples for a specific perfume
export const fetchPerfumeSamples = async (
  perfumeId: string
): Promise<PerfumeSample[]> => {
  try {
    const { data, error } = await supabase
      .from("perfume_samples")
      .select("*")
      .eq("perfume_id", perfumeId)
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

// Fetch bottle sizes for a specific perfume
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

// Fetch all products from database (only active ones for collection display)
// Updated: now supports pagination
export const fetchProducts = async (
  page: number = 1,
  pageSize: number = 8
): Promise<{ products: Product[]; total: number }> => {
  try {
    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch total count
    const { count, error: countError } = await supabase
      .from("perfumes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (countError) {
      console.error("Error fetching product count:", countError);
      return { products: [], total: 0 };
    }

    // Fetch paginated products
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

    // Load images, samples, and bottle sizes for each product (only for current page)
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

// Fetch single product by ID
export const fetchProductById = async (id: string): Promise<Product | null> => {
  try {
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
export const getFullBottles = (products: Product[]) =>
  products.filter((p) => p.type === "bottle");

export const getSamples = (products: Product[]) =>
  products.filter((p) => p.type === "sample");

export const getGiftSets = (products: Product[]) =>
  products.filter((p) => p.type === "gift");

export const getByGender = (products: Product[], gender: string) => {
  if (gender === "all") return products;
  return products.filter((p) => p.gender === gender);
};

export const getSamplesBySize = (products: Product[], size: string) => {
  if (size === "all") return products;
  return products.filter((p) => p.size === size);
};

// Search products by name
export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
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

// Filter products by category
export const filterProducts = async (filters: {
  type?: "bottle" | "sample" | "gift";
  gender?: "men" | "women" | "unisex";
  minPrice?: number;
  maxPrice?: number;
}): Promise<Product[]> => {
  try {
    let query = supabase.from("perfumes").select("*").eq("is_active", true);

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.gender) {
      query = query.eq("gender", filters.gender);
    }

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
