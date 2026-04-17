import { Order } from "./ordersService";

const VANEX_BASE = "https://app.vanex.ly/api/v1";
const VANEX_TOKEN = import.meta.env.VITE_VANEX_TOKEN as string;

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

/** Fetch all Vanex cities (requires auth) */
export const fetchVanexCities = async (): Promise<VanexCity[]> => {
  try {
    const res = await fetch(`${VANEX_BASE}/city/all`, {
      headers: vanexHeaders(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as VanexCity[]) || [];
  } catch (err) {
    console.error("Vanex fetchCities error:", err);
    return [];
  }
};

/**
 * Extract sub-cities from a VanexCity's locations array.
 * Maps the API's location shape to the VanexSubCity interface used by the checkout form.
 */
export const getSubCitiesFromCity = (city: VanexCity): VanexSubCity[] => {
  if (!city.locations || !Array.isArray(city.locations)) return [];
  return city.locations
    .filter((loc) => loc.id && loc.id > 0)
    .map((loc) => ({
      sub_city_id: loc.id,
      sub_city_name: loc.name,
      price: loc.price,
    }));
};

export const createVanexPackage = async (
  order: Order,
): Promise<VanexCreateResult | null> => {
  try {
    // COD: Vanex collects product total from customer (delivery fee added by Vanex on top)
    // Bank transfer: products already paid via bank, Vanex collects only delivery fee (price=0)
    const productTotal = order.total - (order.delivery_fee ?? 0);
    const codPrice = order.payment_method === "bank_transfer" ? 0 : productTotal;

    const payload = {
      type: 1, // Commercial package
      reciever: `${order.first_name} ${order.last_name}`,
      phone: order.phone,
      city: order.vanex_city_id,
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

    const packageCode = (json.data?.["package-code"] as string) ?? null;
    const packageId =
      typeof json.data?.id === "number" ? (json.data.id as number) : null;

    if (!packageCode) return null;
    return { packageCode, packageId };
  } catch (err) {
    console.error("Vanex createPackage error:", err);
    return null;
  }
};

/**
 * Track a Vanex package by its tracking code (public endpoint, no auth).
 */
export const trackVanexPackage = async (
  code: string,
): Promise<VanexTracking | null> => {
  try {
    const res = await fetch(`${VANEX_BASE}/tracking?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as VanexTracking) || null;
  } catch (err) {
    console.error("Vanex trackPackage error:", err);
    return null;
  }
};

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

export const recallVanexPackage = async (
  packageId: number,
  reason?: string,
): Promise<boolean> => {
  try {
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
