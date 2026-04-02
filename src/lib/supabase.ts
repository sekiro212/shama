import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "error";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "error";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: "shama-auth",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Types for our database
export interface Order {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  place_name?: string;
  total: number;
  order_date: string;
  items: OrderItem[];
  status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "accepted" | "returned";
  processed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
}
