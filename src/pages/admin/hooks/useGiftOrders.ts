/**
 * useGiftOrders.ts
 *
 * hook للبيانات الخاص بمورد "طلبات الهدايا المخصّصة" في لوحة الإدارة.
 * يحمّل قائمة طلبات الهدايا المخصّصة المُرسَلة من العملاء من Supabase
 * ويوفّر القائمة وراية تحميل ودالة تعيين كي تتمكّن واجهة الإدارة من عرض
 * الجدول وتحديثه.
 */
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { CustomGiftOrder } from "../types";

/**
 * hook يدير جلب طلبات الهدايا المخصّصة للوحة الإدارة.
 * @returns مصفوفة طلبات الهدايا، ودالة تعيينها، وراية تحميل، و`fetchGiftOrders`
 *          لإعادة تحميل البيانات من Supabase.
 */
export function useGiftOrders() {
  // طلبات الهدايا المُحمَّلة + راية التحميل الخاصة بواجهة الجدول.
  const [giftOrders, setGiftOrders] = useState<CustomGiftOrder[]>([]);
  const [giftOrdersLoading, setGiftOrdersLoading] = useState(true);

  // جلب جميع طلبات الهدايا المخصّصة، الأحدث أولًا.
  const fetchGiftOrders = async () => {
    setGiftOrdersLoading(true);
    try {
      // استعلام Supabase: تحديد كل طلب هدية مرتّبًا بحسب تاريخ الإنشاء (تنازليًا).
      const { data, error } = await supabase
        .from("custom_gift_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // مزامنة الحالة المحلّية؛ والرجوع إلى مصفوفة فارغة عند عدم إرجاع أي صفوف.
      setGiftOrders(data ?? []);
    } catch (err) {
      // معالجة الأخطاء: تسجيل + إشعار toast كي يرى المسؤول الفشل.
      console.error("Failed to fetch gift orders:", err);
      toast.error("Failed to load gift orders");
    } finally {
      // مسح راية التحميل دائمًا سواء نجح الجلب أم فشل.
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
