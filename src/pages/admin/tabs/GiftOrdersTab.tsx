/**
 * =============================================================================
 * تبويب طلبات الهدايا المخصّصة (Custom Gift Orders) في لوحة الإدارة
 * -----------------------------------------------------------------------------
 * مكوّن عرضي يعرض كل طلب هدية كبطاقة تحتوي على المعاينة المولّدة بالذكاء
 * الاصطناعي، واسم المستلم، وتفاصيل المناسبة والتغليف ولون الصندوق والمنتجات
 * وبطاقة الرسالة. يتيح للمدير تحديث حالة كل طلب مباشرة من البطاقة.
 * =============================================================================
 */
import {
  Gift,
  Cake,
  Moon,
  Gem,
  Heart,
  Sparkles,
  Package,
  ShoppingBag,
  CalendarDays,
  Mail,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import type { useGiftOrders } from "../hooks/useGiftOrders";
import type { LucideIcon } from "lucide-react";

interface GiftOrdersTabProps {
  giftOrdersApi: ReturnType<typeof useGiftOrders>;
}

// خريطة ربط كل مناسبة بالأيقونة المناسبة لها لعرضها على البطاقة.
const OCCASION_ICONS: Record<string, LucideIcon> = {
  birthday: Cake,
  eid: Moon,
  anniversary: Gem,
  wedding: Heart,
  just_because: Gift,
};

// إعدادات أنماط التغليف: لكل نمط أيقونته واسمه المعروض.
const WRAPPING_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  ribbon: { icon: Sparkles, label: "Ribbon" },
  luxury_tissue: { icon: Package, label: "Luxury Tissue" },
  luxury_bag: { icon: ShoppingBag, label: "Gift Bag" },
};

// خريطة ألوان صناديق الهدايا إلى قيم HEX لعرض نقطة اللون الفعلية.
const BOX_COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  gold: "#D4AF37",
  white: "#e8e8e8",
  rose_gold: "#B76E79",
};

/**
 * يعرض قائمة بطاقات طلبات الهدايا المخصّصة مع إمكانية تحديث حالة كل طلب.
 * @param giftOrdersApi واجهة الخطّاف useGiftOrders (البيانات، حالة التحميل، إعادة الجلب).
 */
export function GiftOrdersTab({ giftOrdersApi }: GiftOrdersTabProps) {
  const { t } = useLanguage();
  const { giftOrders, setGiftOrders, giftOrdersLoading, fetchGiftOrders } =
    giftOrdersApi;

  /**
   * تحدّث حالة طلب هدية في قاعدة البيانات ثم تزامن الحالة محلياً.
   * عند الفشل يظهر إشعار خطأ ولا يتغيّر شيء؛ وعند النجاح تُحدَّث القائمة
   * تحديثاً متفائلاً (optimistic) دون إعادة جلب كامل من الخادم.
   */
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("custom_gift_orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      // تحديث الطلب المطابق للمعرّف فقط داخل المصفوفة المحلية مع الإبقاء على البقية.
      setGiftOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );
      toast.success("Status updated");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50]">
          {t("admin.tabs.giftOrders")}
          {giftOrders.length > 0 && (
            <span className="ms-2 text-sm font-normal text-[#6B7B8D]">
              ({giftOrders.length})
            </span>
          )}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchGiftOrders}
          disabled={giftOrdersLoading}
          className="h-9 w-9 border-[#323D50]/15 dark:border-white/20 cursor-pointer"
        >
          <RefreshCw
            className={`w-4 h-4 ${giftOrdersLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* حالة التحميل: عرض بطاقات هيكلية وامضة (skeleton) ريثما تصل البيانات */}
      {giftOrdersLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl h-64 animate-pulse"
            />
          ))}
        </div>
      ) : giftOrders.length === 0 ? (
        /* حالة الفراغ: لا توجد طلبات هدايا بعد */
        <EmptyState
          icon={Gift}
          title="No custom gift orders yet"
          subtitle="Gift orders will appear here once customers place them."
        />
      ) : (
        <div className="space-y-6">
          {giftOrders.map((order) => {
            // اختيار أيقونة المناسبة من الخريطة، مع أيقونة هدية افتراضية عند عدم التطابق.
            const OccasionIcon = OCCASION_ICONS[order.occasion] ?? Gift;
            // استخراج إعدادات نمط التغليف، مع قيم احتياطية إن كان النمط غير معرّف.
            const wrappingConfig = WRAPPING_CONFIG[order.wrapping_style];
            const WrappingIcon = wrappingConfig?.icon ?? Package;
            const wrappingLabel =
              wrappingConfig?.label ?? order.wrapping_style;

            return (
              <div
                key={order.id}
                className="glass-card rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* عرض صورة المعاينة المولّدة بالذكاء الاصطناعي إن وُجدت */}
                {order.generated_image_url && (
                  <div className="relative">
                    <img
                      src={order.generated_image_url}
                      alt="AI Gift Preview"
                      className="w-full max-h-72 object-cover"
                    />
                    <div className="absolute top-3 end-3 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow inline-flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5" />
                      AI Gift Preview
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg dark:text-[#F5F5F5] text-[#323D50]">
                        {order.recipient_name
                          ? `To: ${order.recipient_name}`
                          : "No recipient name"}
                      </p>
                      {order.delivery_date && (
                        <p className="text-sm dark:text-white/60 text-[#6B7B8D] mt-0.5 inline-flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Delivery:{" "}
                          {new Date(order.delivery_date).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {/* شارة الحالة الحالية + قائمة منسدلة لتغييرها فوراً */}
                      <StatusBadge status={order.status} type="order" />
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value)
                        }
                      >
                        <SelectTrigger className="w-[130px] h-8 text-sm glass bg-white dark:bg-white/5 border-[#323D50]/10 dark:border-white/10 cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                          <SelectItem value="pending" className="cursor-pointer">
                            Pending
                          </SelectItem>
                          <SelectItem value="accepted" className="cursor-pointer">
                            Accepted
                          </SelectItem>
                          <SelectItem value="delivered" className="cursor-pointer">
                            Delivered
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* شارات تفاصيل الطلب: المناسبة، لون الصندوق، نمط التغليف */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass dark:border-white/10 border-[#323D50]/10 dark:text-white/80 text-[#323D50]">
                      <OccasionIcon className="w-3.5 h-3.5" />
                      {/* استبدال الشرطة السفلية بمسافة لعرض اسم المناسبة بشكل مقروء */}
                      {order.occasion.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass dark:border-white/10 border-[#323D50]/10 dark:text-white/80 text-[#323D50]">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 inline-block flex-shrink-0"
                        style={{
                          backgroundColor:
                            BOX_COLOR_HEX[order.box_color] ?? "#888",
                        }}
                      />
                      {order.box_color.replace("_", " ")} box
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass dark:border-white/10 border-[#323D50]/10 dark:text-white/80 text-[#323D50]">
                      <WrappingIcon className="w-3.5 h-3.5" />
                      {wrappingLabel}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold dark:text-white/50 text-[#6B7B8D] uppercase tracking-wider mb-2">
                      Products ({order.products.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {order.products.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 glass rounded-xl p-2 dark:border-white/10 border border-[#323D50]/10"
                        >
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#323D50]/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                              <Gift className="w-4 h-4 dark:text-white/30 text-[#6B7B8D]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium dark:text-[#F5F5F5] text-[#323D50] truncate">
                              {p.name}
                            </p>
                            <p className="text-xs dark:text-white/50 text-[#6B7B8D]">
                              {p.price} LYD
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.message_card && (
                    <div className="glass rounded-xl p-3 dark:border-white/10 border border-[#323D50]/10">
                      <p className="text-xs font-semibold dark:text-white/50 text-[#6B7B8D] uppercase tracking-wider mb-1 inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        Message Card
                      </p>
                      <p className="text-sm dark:text-white/80 text-[#323D50] italic">
                        &ldquo;{order.message_card}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t dark:border-white/10 border-[#323D50]/10">
                    <p className="font-bold text-[#5B8DD9] text-lg">
                      {order.total_price} LYD
                    </p>
                    <div className="text-right">
                      <p className="text-xs dark:text-white/50 text-[#6B7B8D]">
                        {new Date(order.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                      <p className="text-xs dark:text-white/30 text-[#6B7B8D]/60 font-mono">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
