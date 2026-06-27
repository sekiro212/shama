/**
 * ===========================================================================
 * ملف: vanexService.ts
 * الغرض: التكامل مع واجهة برمجة شركة التوصيل Vanex (REST API).
 * يغطّي: جلب المدن والمناطق الفرعية، إنشاء شحنة، تتبّع شحنة، إلغاء شحنة، واسترجاعها.
 * المصادقة تتم عبر رمز Bearer (VANEX_TOKEN) في ترويسة كل طلب يتطلّب صلاحية.
 * ===========================================================================
 */
import { Order } from "./ordersService";

// العنوان الأساسي لواجهة Vanex والرمز السري المقروء من متغيّرات البيئة (env)
const VANEX_BASE = "https://app.vanex.ly/api/v1";
const VANEX_TOKEN = import.meta.env.VITE_VANEX_TOKEN as string;

// ترويسات الطلبات المصادَق عليها (نوع المحتوى JSON + رمز Bearer للمصادقة)
const vanexHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${VANEX_TOKEN}`,
});

export interface VanexLocation {
  id: number;
  name: string;
  parent_city: number;
  price: number;
  code: string;
}

export interface VanexCity {
  id: number;
  name: string;
  price: number;
  branch: number;
  code: string;
  locations: VanexLocation[];
}

export interface VanexSubCity {
  sub_city_id: number;
  sub_city_name: string;
  price?: number;
}

export interface VanexPackage {
  id: number;
  "package-code": string;
  type: number;
  reciever: string;
  phone: string;
  price: number;
  total: number;
  status: string;
}

export interface VanexTrackingLog {
  id: number;
  status: string;
  status_ar?: string;
  description?: string;
  location?: string | null;
  created_at: string;
}

export interface VanexTracking {
  code: string;
  status: string;
  status_ar?: string;
  receiver_name?: string;
  current_location?: string | null;
  estimated_delivery?: string | null;
  logs?: VanexTrackingLog[];
}

export interface VanexCreateResult {
  packageCode: string;
  packageId: number | null;
}

/**
 * جلب جميع مدن Vanex (يتطلّب مصادقة).
 * @returns مصفوفة المدن من حقل data في الاستجابة، أو مصفوفة فارغة عند الفشل.
 */
/** Fetch all Vanex cities (requires auth) */
export const fetchVanexCities = async (): Promise<VanexCity[]> => {
  try {
    const res = await fetch(`${VANEX_BASE}/city/all`, {
      headers: vanexHeaders(),
    });
    // عند فشل الطلب (حالة غير 2xx) نُعيد مصفوفة فارغة بدل رمي خطأ
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as VanexCity[]) || [];
  } catch (err) {
    console.error("Vanex fetchCities error:", err);
    return [];
  }
};

/**
 * استخراج المناطق الفرعية (sub-cities) من مصفوفة locations الخاصة بمدينة Vanex.
 * يحوّل شكل الموقع القادم من الواجهة إلى واجهة VanexSubCity المستخدمة في نموذج الدفع.
 * @param city كائن المدينة الذي يحوي قائمة المواقع.
 * @returns مصفوفة المناطق الفرعية الصالحة (ذات معرّف موجب).
 */
/**
 * Extract sub-cities from a VanexCity's locations array.
 * Maps the API's location shape to the VanexSubCity interface used by the checkout form.
 */
export const getSubCitiesFromCity = (city: VanexCity): VanexSubCity[] => {
  if (!city.locations || !Array.isArray(city.locations)) return [];
  return city.locations
    // استبعاد المواقع ذات المعرّف غير الصالح (صفر أو سالب) قبل التحويل
    .filter((loc) => loc.id && loc.id > 0)
    .map((loc) => ({
      sub_city_id: loc.id,
      sub_city_name: loc.name,
      price: loc.price,
    }));
};

/**
 * إنشاء شحنة جديدة لدى Vanex انطلاقًا من بيانات الطلب.
 * @param order الطلب المراد شحنه (يحوي بيانات المستلم والمدينة وطريقة الدفع والإجمالي).
 * @returns كائن يحوي رمز الشحنة ومعرّفها الرقمي عند النجاح، أو null عند الفشل.
 */
export const createVanexPackage = async (
  order: Order,
): Promise<VanexCreateResult | null> => {
  try {
    // حساب المبلغ الذي تُحصّله Vanex من العميل (price) حسب طريقة الدفع:
    // الدفع عند الاستلام (COD): تُحصّل قيمة المنتجات (رسوم التوصيل تُضاف من Vanex فوقها).
    // التحويل البنكي: المنتجات مدفوعة مسبقًا، فتُحصّل Vanex رسوم التوصيل فقط (price=0).
    const productTotal = order.total - (order.delivery_fee ?? 0);
    const codPrice = order.payment_method === "bank_transfer" ? 0 : productTotal;

    // بناء حمولة الطلب (payload) وفق الحقول التي تتوقّعها واجهة Vanex
    // ملاحظة: أسماء الحقول reciever و leangh و payment_methode مكتوبة هكذا لأنها كما تطلبها الواجهة
    const payload = {
      type: 1, // شحنة تجارية (Commercial package)
      reciever: `${order.first_name} ${order.last_name}`,
      phone: order.phone,
      city: order.vanex_city_id,
      // إضافة المنطقة الفرعية (address_child) فقط إن وُجدت عبر النشر الشرطي
      ...(order.vanex_sub_city_id ? { address_child: order.vanex_sub_city_id } : {}),
      address: order.place_name || order.city,
      price: codPrice,
      payment_methode: "cash",
      paid_by: "customer",
      description: "عطور شمة",
      qty: 1,
      height: 20,
      leangh: 20,
      width: 20,
      extra_size_by: "customer",
      commission_by: "customer",
    };

    const res = await fetch(`${VANEX_BASE}/customer/package`, {
      method: "POST",
      headers: vanexHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("Vanex createPackage error:", json);
      return null;
    }

    // استخراج رمز الشحنة ومعرّفها الرقمي من الاستجابة (المعرّف لازم لاحقًا للإلغاء/الاسترجاع)
    const packageCode = (json.data?.["package-code"] as string) ?? null;
    const packageId =
      typeof json.data?.id === "number" ? (json.data.id as number) : null;

    // الرمز ضروري لإتمام العملية؛ غيابه يعني فشل الإنشاء
    if (!packageCode) return null;
    return { packageCode, packageId };
  } catch (err) {
    console.error("Vanex createPackage error:", err);
    return null;
  }
};

/**
 * تتبّع شحنة Vanex عبر رمز التتبّع (نقطة نهاية عامة لا تتطلّب مصادقة).
 * تُعيد الواجهة الشكل { data: { package: {...}, logs: [...] } } فيُحوَّل إلى الشكل المسطّح
 * VanexTracking الذي تستهلكه الواجهة.
 * @param code رمز تتبّع الشحنة.
 * @returns بيانات التتبّع المسطّحة، أو null عند الفشل أو عدم وجود الشحنة.
 */
/**
 * Track a Vanex package by its tracking code (public endpoint, no auth).
 * API returns { data: { package: {...}, logs: [...] } } — map it to the
 * flat VanexTracking shape the UI consumes.
 */
export const trackVanexPackage = async (
  code: string,
): Promise<VanexTracking | null> => {
  try {
    // ترميز الرمز داخل الرابط لتفادي مشاكل المحارف الخاصة
    const res = await fetch(`${VANEX_BASE}/tracking?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pkg = json.data?.package;
    if (!pkg) return null;
    // سجلات التتبّع قد لا تكون موجودة، فنضمن أنها مصفوفة قبل التحويل
    const logs = Array.isArray(json.data?.logs) ? json.data.logs : [];
    // تحويل أسماء حقول Vanex إلى أسماء الواجهة (city -> الموقع الحالي، delivery_date -> التسليم المتوقع)
    return {
      code: pkg.code,
      status: pkg.status,
      status_ar: pkg.status_ar ?? undefined,
      receiver_name: pkg.reciever ?? undefined,
      current_location: pkg.city ?? null,
      estimated_delivery: pkg.delivery_date ?? null,
      // تحويل كل سجل: type -> status و details -> description و time -> created_at
      logs: logs.map(
        (l: { id: number; type: string; details?: string; time: string }) => ({
          id: l.id,
          status: l.type,
          description: l.details,
          created_at: l.time,
        }),
      ),
    };
  } catch (err) {
    console.error("Vanex trackPackage error:", err);
    return null;
  }
};

/**
 * إلغاء شحنة Vanex عبر معرّفها الرقمي (طلب DELETE مصادَق عليه).
 * @param packageId المعرّف الرقمي للشحنة.
 * @returns كائن حالة الإلغاء ووقته عند النجاح، أو null عند الفشل.
 */
export const cancelVanexPackage = async (
  packageId: number,
): Promise<{ cancelled: boolean; cancelled_at?: string } | null> => {
  try {
    const res = await fetch(`${VANEX_BASE}/customer/package/${packageId}`, {
      method: "DELETE",
      headers: vanexHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Vanex cancelPackage error:", json);
      return null;
    }
    return (json.data as { cancelled: boolean; cancelled_at?: string }) || null;
  } catch (err) {
    console.error("Vanex cancelPackage error:", err);
    return null;
  }
};

/**
 * استرجاع شحنة Vanex (طلب إعادتها) عبر معرّفها الرقمي مع سبب اختياري (طلب PUT مصادَق عليه).
 * @param packageId المعرّف الرقمي للشحنة.
 * @param reason سبب الاسترجاع (اختياري).
 * @returns true عند النجاح، أو false عند الفشل.
 */
export const recallVanexPackage = async (
  packageId: number,
  reason?: string,
): Promise<boolean> => {
  try {
    // إرسال السبب في جسم الطلب فقط إن وُجد، وإلا جسم فارغ
    const res = await fetch(`${VANEX_BASE}/customer/package/${packageId}/recall`, {
      method: "PUT",
      headers: vanexHeaders(),
      body: JSON.stringify(reason ? { reason } : {}),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error("Vanex recallPackage error:", json);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Vanex recallPackage error:", err);
    return false;
  }
};
