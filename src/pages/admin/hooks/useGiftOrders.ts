import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { CustomGiftOrder } from "../types";

export function useGiftOrders() {
  const [giftOrders, setGiftOrders] = useState<CustomGiftOrder[]>([]);
  const [giftOrdersLoading, setGiftOrdersLoading] = useState(false);

  const fetchGiftOrders = async () => {
    setGiftOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_gift_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGiftOrders(data ?? []);
    } catch (err) {
      console.error("Failed to fetch gift orders:", err);
      toast.error("Failed to load gift orders");
    } finally {
      setGiftOrdersLoading(false);
    }
  };

  return {
    giftOrders,
    setGiftOrders,
    giftOrdersLoading,
    fetchGiftOrders,
  };
}
