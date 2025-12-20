import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "error";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "error";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our database
export interface Order {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  total: number;
  order_date: string;
  items: OrderItem[];
  created_at?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
}
