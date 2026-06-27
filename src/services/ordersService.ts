/**
 * ===========================================================================
 * ملف: ordersService.ts
 * الغرض: خدمة إدارة الطلبات في Supabase (جدول orders).
 * يغطّي: جلب الطلبات مع فلاتر، طلبات المستخدم، الإحصائيات، تحديث الحالة، الحذف،
 * تتبّع الطلب، والتحليلات. كما يربط الطلب بشركة التوصيل Vanex (حفظ معلومات الشحنة ومزامنتها).
 * حالة الطلب (status): pending → confirmed → processing → shipped → delivered (وقيم أخرى).
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";

export interface VanexOrderLog {
  id: number;
  status: string;
  status_ar?: string;
  description?: string;
  location?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  place_name?: string;
  vanex_city_id?: number;
  vanex_sub_city_id?: number;
  vanex_package_code?: string;
  vanex_package_id?: number | null;
  vanex_status?: string | null;
  vanex_status_ar?: string | null;
  vanex_current_location?: string | null;
  vanex_estimated_delivery?: string | null;
  vanex_last_synced_at?: string | null;
  vanex_logs?: VanexOrderLog[] | null;
  delivery_fee?: number;
  payment_method?:
    | "cod"
    | "bank_transfer"
    | "edfali"
    | "sadadapi"
    | "localbankcards"
    | "tlync"
    | "mpgs";
  payment_status?: "unpaid" | "paid" | "failed";
  payment_gateway?: string | null;
  payment_reference?: string | null;
  transfer_proof_url?: string;
  total: number;
  order_date: string;
  items: OrderItem[];
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "accepted" | "returned";
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
}

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  city?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCities: { city: string; count: number; revenue: number }[];
  recentOrders: Order[];
}

/**
 * جلب كل الطلبات مع إمكانية تطبيق فلاتر اختيارية.
 * @param filters فلاتر اختيارية: مدى التاريخ، المدينة، مدى المبلغ، ونص بحث.
 * @returns مصفوفة الطلبات مرتّبة من الأحدث، أو مصفوفة فارغة عند الخطأ.
 */
export const fetchOrders = async (filters?: OrderFilters): Promise<Order[]> => {
  try {
    // بناء الاستعلام تدريجيًا: نبدأ بالأساس ثم نضيف الفلاتر المتوفّرة فقط
    let query = supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false });

    // تطبيق الفلاتر إن وُجدت
    if (filters) {
      if (filters.startDate) {
        query = query.gte("order_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("order_date", filters.endDate);
      }
      if (filters.city) {
        query = query.eq("city", filters.city);
      }
      if (filters.minAmount) {
        query = query.gte("total", filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte("total", filters.maxAmount);
      }
      if (filters.search) {
        // بحث نصي غير حسّاس لحالة الأحرف (ilike) عبر عدة أعمدة بشرط OR: الاسم الأول/الأخير/البريد
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
};

/**
 * جلب طلبات مستخدم معيّن لصفحة "طلباتي".
 * المطابقة: عبر user_id، بالإضافة إلى الطلبات اليتيمة (user_id = NULL) التي يطابق
 * بريدها بريد الحساب — لاسترجاع الطلبات التي أُنشئت كزائر قبل تسجيل الدخول.
 * لا تُطابَق أبدًا طلبات يملكها مستخدم آخر (user_id مختلف).
 * @param userId معرّف المستخدم.
 * @param email بريد الحساب (اختياري) لاسترجاع طلبات الزائر اليتيمة.
 * @returns طلبات المستخدم مرتّبة من الأحدث، أو مصفوفة فارغة عند الخطأ.
 */
// Fetch orders belonging to a user (for My Orders page).
// Matches by user_id, PLUS orphaned guest orders (user_id IS NULL) whose contact
// email equals the account email — this recovers orders placed before logging in
// or as a guest. It never matches an order owned by a different user_id.
export const fetchMyOrders = async (
  userId: string,
  email?: string | null
): Promise<Order[]> => {
  try {
    const normalizedEmail = email?.trim().toLowerCase();

    let query = supabase.from("orders").select("*");
    if (normalizedEmail) {
      // user_id == me  OR  (user_id is null AND email == account email)
      query = query.or(
        `user_id.eq.${userId},and(user_id.is.null,email.eq.${normalizedEmail})`
      );
    } else {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching user orders:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};

/**
 * جلب طلب واحد عبر معرّفه.
 * @param id معرّف الطلب.
 * @returns كائن الطلب، أو null عند عدم وجوده أو حدوث خطأ.
 */
// Fetch single order by ID
export const fetchOrderById = async (id: string): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
};

/**
 * حساب إحصائيات الطلبات للوحة المعلومات (Overview).
 * يحسب إجمالي الطلبات والإيرادات ومتوسط قيمة الطلب وأعلى المدن وأحدث الطلبات.
 * @returns كائن OrderStats يحتوي على القيم المحسوبة، أو قيمًا صفرية عند الخطأ.
 */
// Get order statistics
export const getOrderStats = async (): Promise<OrderStats> => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false });

    if (error) {
      console.error("Error fetching order stats:", error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        topCities: [],
        recentOrders: [],
      };
    }

    const totalOrders = orders?.length || 0;
    const totalRevenue =
      orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // تجميع الطلبات حسب المدينة لحساب عدد الطلبات والإيراد لكل مدينة (تراكم عبر reduce)
    const cityStats =
      orders?.reduce((acc, order) => {
        if (!acc[order.city]) {
          acc[order.city] = { count: 0, revenue: 0 };
        }
        acc[order.city].count++;
        acc[order.city].revenue += order.total;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>) || {};

    // ترتيب المدن تنازليًا حسب الإيراد وأخذ أعلى 5 فقط
    const topCities = Object.entries(cityStats)
      .map(([city, stats]) => ({
        city,
        count: (stats as { count: number; revenue: number }).count,
        revenue: (stats as { count: number; revenue: number }).revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentOrders = orders?.slice(0, 5) || [];

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      topCities,
      recentOrders,
    };
  } catch (error) {
    console.error("Error calculating order stats:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topCities: [],
      recentOrders: [],
    };
  }
};

/**
 * حذف طلب (للمسؤول فقط).
 * @param id معرّف الطلب المراد حذفه.
 * @returns true عند النجاح، أو false عند الفشل.
 */
// Delete order (admin only)
export const deleteOrder = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      console.error("Error deleting order:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting order:", error);
    return false;
  }
};

/**
 * جلب الطلبات الواقعة ضمن مدى تاريخي محدّد.
 * @param startDate تاريخ البداية (شامل).
 * @param endDate تاريخ النهاية (شامل).
 * @returns الطلبات ضمن المدى مرتّبة من الأحدث، أو مصفوفة فارغة عند الخطأ.
 */
// Get orders by date range
export const getOrdersByDateRange = async (
  startDate: string,
  endDate: string
): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("order_date", startDate)
      .lte("order_date", endDate)
      .order("order_date", { ascending: false });

    if (error) {
      console.error("Error fetching orders by date range:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    return [];
  }
};

/**
 * تحديث حالة الطلب (للمسؤول).
 * @param id معرّف الطلب.
 * @param status الحالة الجديدة.
 * @returns true عند النجاح، أو false عند الفشل.
 */
// Update order status (admin)
export const updateOrderStatus = async (
  id: string,
  status: Order["status"]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        status,
        // تسجيل وقت المعالجة عند أي حالة غير "pending"، وإفراغه إذا أُعيدت إلى "pending"
        processed_at: status !== "pending" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating order status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    return false;
  }
};

/**
 * حساب تحليلات الطلبات: الإجمالي، الإيراد، التوزيع حسب المدينة وحسب الشهر، ومتوسط قيمة الطلب.
 * @returns كائن التحليلات، أو null عند الخطأ.
 */
// Get orders count by status/city
export const getOrdersAnalytics = async () => {
  try {
    const { data: orders, error } = await supabase.from("orders").select("*");

    if (error) {
      console.error("Error fetching orders analytics:", error);
      return null;
    }

    const analytics = {
      totalOrders: orders?.length || 0,
      totalRevenue: orders?.reduce((sum, order) => sum + order.total, 0) || 0,
      ordersByCity:
        orders?.reduce((acc, order) => {
          acc[order.city] = (acc[order.city] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
      // التوزيع حسب الشهر: تحويل تاريخ الطلب إلى مفتاح نصي مثل "Jan 2026" ثم عدّ الطلبات لكل شهر
      ordersByMonth:
        orders?.reduce((acc, order) => {
          const month = new Date(order.order_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
      averageOrderValue: orders?.length
        ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
        : 0,
    };

    return analytics;
  } catch (error) {
    console.error("Error fetching orders analytics:", error);
    return null;
  }
};

/**
 * حفظ رمز شحنة Vanex ومعرّفها الرقمي في الطلب وتعيين حالته إلى "shipped" (تم الشحن).
 * المعرّف الرقمي (packageId) لازم لاحقًا لنقاط نهاية الإلغاء/الاسترجاع (cancel/recall).
 * @param orderId معرّف الطلب.
 * @param packageCode رمز شحنة Vanex النصي.
 * @param packageId المعرّف الرقمي للشحنة (قد يكون null).
 * @returns true عند النجاح، أو false عند الفشل.
 */
/**
 * Save Vanex package code + numeric id to an order and mark it as shipped.
 * The numeric id is required later for cancel/recall endpoints.
 */
export const saveVanexPackageInfo = async (
  orderId: string,
  packageCode: string,
  packageId: number | null,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        vanex_package_code: packageCode,
        vanex_package_id: packageId,
        // حالة Vanex الأولية للشحنة الجديدة: "store_new" بالإنجليزية و"جديد" بالعربية للعرض
        vanex_status: "store_new",
        vanex_status_ar: "جديد",
        vanex_last_synced_at: new Date().toISOString(),
        status: "shipped",
        processed_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error saving Vanex package info:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error saving Vanex package info:", error);
    return false;
  }
};

/**
 * تشغيل دالة Edge المسماة sync-vanex-packages لطلب واحد فقط لمزامنة حالته مع Vanex.
 * تُحدّث الحقول vanex_status والسجلات (logs) وآخر وقت مزامنة (last_synced_at) لذلك الصف.
 * @param orderId معرّف الطلب المراد مزامنته.
 * @returns true عند النجاح، أو false عند الفشل.
 */
/**
 * Trigger the sync-vanex-packages edge function for a single order.
 * Updates vanex_status + logs + last_synced_at on that row.
 */
export const syncVanexOrder = async (orderId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke("sync-vanex-packages", {
      body: { order_id: orderId },
    });
    if (error) {
      console.error("Error syncing Vanex order:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error syncing Vanex order:", error);
    return false;
  }
};

/**
 * تشغيل مزامنة جماعية لكل شحنات Vanex غير المنتهية (non-terminal).
 * تستدعي الدالة بدون تمرير معرّف طلب فتعالج جميع الشحنات النشطة.
 * @returns عدد المُزامَن (synced)، المُتخطّى (skipped)، وقائمة الأخطاء (errors)، أو null عند الفشل.
 */
/**
 * Trigger a bulk sync of all non-terminal Vanex packages.
 * Returns the counts reported by the edge function.
 */
export const bulkSyncVanex = async (): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
} | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("sync-vanex-packages", {
      body: {},
    });
    if (error) {
      console.error("Error bulk-syncing Vanex:", error);
      return null;
    }
    return {
      synced: data?.synced ?? 0,
      skipped: data?.skipped ?? 0,
      errors: data?.errors ?? [],
    };
  } catch (error) {
    console.error("Error bulk-syncing Vanex:", error);
    return null;
  }
};
