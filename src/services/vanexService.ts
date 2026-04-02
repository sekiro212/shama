import { Order } from "./ordersService";

const VANEX_BASE = "https://app.vanex.ly/api/v1";
const VANEX_TOKEN = import.meta.env.VITE_VANEX_TOKEN as string;

const vanexHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${VANEX_TOKEN}`,
});

export interface VanexCity {
  id: number;
  name: string;
  name_en: string;
  code: string;
  region_id: number;
  active: boolean;
}

export interface VanexSubCity {
  sub_city_id: number;
  sub_city_name: string;
  sub_city_name_en?: string;
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

export interface VanexTracking {
  code: string;
  status: string;
  receiver_name: string;
  current_location: string;
  estimated_delivery: string;
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

/** Fetch sub-cities/areas for a given city (requires auth) */
export const fetchVanexSubCities = async (cityId: number): Promise<VanexSubCity[]> => {
  try {
    const res = await fetch(`${VANEX_BASE}/delivery/price?city_id=${cityId}`, {
      headers: vanexHeaders(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data as { sub_city_id: number; sub_city_name: string; price?: number }[];
    if (!Array.isArray(data)) return [];
    // Filter out rows with no sub-city (some cities return a single row with sub_city_id=0)
    return data.filter((d) => d.sub_city_id && d.sub_city_id > 0);
  } catch (err) {
    console.error("Vanex fetchSubCities error:", err);
    return [];
  }
};

/**
 * Create a Vanex package for an order (admin action).
 * Returns the package code (e.g. "H-13903-TIP-5885703") or null on failure.
 */
export const createVanexPackage = async (order: Order): Promise<string | null> => {
  try {
    const payload = {
      type: 1, // Commercial package
      reciever: `${order.first_name} ${order.last_name}`,
      phone: order.phone,
      city: order.vanex_city_id,
      ...(order.vanex_sub_city_id ? { address_child: order.vanex_sub_city_id } : {}),
      address: order.place_name || order.city,
      price: order.total,
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

    return (json.data?.["package-code"] as string) || null;
  } catch (err) {
    console.error("Vanex createPackage error:", err);
    return null;
  }
};

/**
 * Track a Vanex package by its tracking code (public endpoint, no auth).
 */
export const trackVanexPackage = async (code: string): Promise<VanexTracking | null> => {
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
