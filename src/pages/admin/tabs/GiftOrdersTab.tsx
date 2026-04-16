import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useGiftOrders } from "../hooks/useGiftOrders";

interface GiftOrdersTabProps {
  giftOrdersApi: ReturnType<typeof useGiftOrders>;
}

export function GiftOrdersTab({ giftOrdersApi }: GiftOrdersTabProps) {
  const { t } = useLanguage();
  const { giftOrders, setGiftOrders, giftOrdersLoading, fetchGiftOrders } =
    giftOrdersApi;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50]">
          {t("admin.tabs.giftOrders")}
          {giftOrders.length > 0 && (
            <span className="ms-2 text-sm font-normal text-[#6B7B8D]">({giftOrders.length})</span>
          )}
        </h2>
        <Button variant="outline" onClick={fetchGiftOrders} disabled={giftOrdersLoading}>
          {giftOrdersLoading ? t("admin.loadingTitle") : t("admin.refreshOrders")}
        </Button>
      </div>

      {giftOrdersLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B8DD9]" />
        </div>
      ) : giftOrders.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <Gift className="h-12 w-12 dark:text-white/30 text-[#6B7B8D] mx-auto mb-4" />
          <p className="dark:text-white/60 text-[#6B7B8D]">No custom gift orders yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {giftOrders.map((order) => {
            const boxColorHex: Record<string, string> = {
              black: "#1a1a1a", gold: "#D4AF37", white: "#e8e8e8", rose_gold: "#B76E79",
            };
            const occasionEmoji: Record<string, string> = {
              birthday: "🎂", eid: "🌙", anniversary: "💍", wedding: "💒",
              valentine: "❤️", just_because: "🎁",
            };
            const wrappingLabel: Record<string, string> = {
              ribbon: "🎀 Ribbon", luxury_tissue: "🧻 Luxury Tissue", luxury_bag: "👜 Gift Bag",
            };
            return (
              <div key={order.id} className="glass-card rounded-2xl overflow-hidden">
                {/* AI generated image — full width */}
                {order.generated_image_url && (
                  <div className="relative">
                    <img
                      src={order.generated_image_url}
                      alt="AI Gift Preview"
                      className="w-full max-h-72 object-cover"
                    />
                    <div className="absolute top-3 end-3 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                      ✨ AI Gift Preview
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {/* Row 1: recipient + status dropdown */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg dark:text-[#F5F5F5] text-[#323D50]">
                        {order.recipient_name ? `To: ${order.recipient_name}` : "No recipient name"}
                      </p>
                      {order.delivery_date && (
                        <p className="text-sm dark:text-white/60 text-[#6B7B8D] mt-0.5">
                          📅 Delivery: {new Date(order.delivery_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <Badge
                        className={
                          order.status === "pending"
                            ? "bg-amber-500 text-white"
                            : order.status === "accepted"
                            ? "bg-green-500 text-white"
                            : "bg-blue-500 text-white"
                        }
                      >
                        {order.status}
                      </Badge>
                      <select
                        value={order.status}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from("custom_gift_orders")
                            .update({ status: e.target.value })
                            .eq("id", order.id);
                          if (error) {
                            toast.error("Failed to update status");
                          } else {
                            setGiftOrders((prev) =>
                              prev.map((o) =>
                                o.id === order.id ? { ...o, status: e.target.value } : o
                              )
                            );
                            toast.success("Status updated");
                          }
                        }}
                        className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-lg px-3 py-1.5 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: customization chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass dark:border-white/10 border-[#323D50]/10 dark:text-white/80 text-[#323D50]">
                      {occasionEmoji[order.occasion] ?? "🎁"} {order.occasion.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass dark:border-white/10 border-[#323D50]/10 dark:text-white/80 text-[#323D50]">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 inline-block flex-shrink-0"
                        style={{ backgroundColor: boxColorHex[order.box_color] ?? "#888" }}
                      />
                      {order.box_color.replace("_", " ")} box
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass dark:border-white/10 border-[#323D50]/10 dark:text-white/80 text-[#323D50]">
                      {wrappingLabel[order.wrapping_style] ?? order.wrapping_style}
                    </span>
                  </div>

                  {/* Row 3: products grid */}
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
                            <p className="text-xs font-medium dark:text-[#F5F5F5] text-[#323D50] truncate">{p.name}</p>
                            <p className="text-xs dark:text-white/50 text-[#6B7B8D]">{p.price} LYD</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: message card */}
                  {order.message_card && (
                    <div className="glass rounded-xl p-3 dark:border-white/10 border border-[#323D50]/10">
                      <p className="text-xs font-semibold dark:text-white/50 text-[#6B7B8D] uppercase tracking-wider mb-1">
                        💌 Message Card
                      </p>
                      <p className="text-sm dark:text-white/80 text-[#323D50] italic">
                        "{order.message_card}"
                      </p>
                    </div>
                  )}

                  {/* Row 5: footer — total, date, ID */}
                  <div className="flex items-center justify-between pt-1 border-t dark:border-white/10 border-[#323D50]/10">
                    <p className="font-bold text-[#5B8DD9] text-lg">{order.total_price} LYD</p>
                    <div className="text-right">
                      <p className="text-xs dark:text-white/50 text-[#6B7B8D]">
                        {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
