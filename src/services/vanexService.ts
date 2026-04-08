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

/**
 * Create a Vanex package for an order (admin action).
 * Returns the package code (e.g. "H-13903-TIP-5885703") or null on failure.
 */
export const createVanexPackage = async (order: Order): Promise<string | null> => {
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
