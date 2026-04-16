import { useState } from "react";
import { Package, Search, MapPin, Clock, AlertCircle, Truck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import OrderTimeline from "@/components/OrderTimeline";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackVanexPackage, VanexTracking } from "@/services/vanexService";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

interface Order {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  total: number;
  items: OrderItem[];
  created_at: string;
  order_date: string;
  place_name?: string;
  city: string;
  phone: string;
  vanex_package_code?: string;
}

const OrderTrackingPage = () => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [vanexTracking, setVanexTracking] = useState<VanexTracking | null>(null);
  const [vanexLoading, setVanexLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);
    setSearched(true);

    try {
      const isEmail = query.includes("@");

      let result;
      if (isEmail) {
        result = await supabase
          .from("orders")
          .select("*")
          .eq("email", query.trim().toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
      } else {
        result = await supabase
          .from("orders")
          .select("*")
          .eq("id", query.trim())
          .single();
      }

      if (result.error) {
        setError(t("tracking.noOrder"));
      } else {
        const fetchedOrder = result.data as Order;
        setOrder(fetchedOrder);
        // If this order has a Vanex package code, fetch live tracking
        if (fetchedOrder.vanex_package_code) {
          setVanexLoading(true);
          trackVanexPackage(fetchedOrder.vanex_package_code)
            .then(setVanexTracking)
            .finally(() => setVanexLoading(false));
        } else {
          setVanexTracking(null);
        }
      }
    } catch {
      setError(t("tracking.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "ar" ? "ar-LY" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-20 md:pt-24 pb-12 sm:pb-16">
      <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-lg shadow-[#5B8DD9]/20">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-2 sm:mb-3 leading-tight">
            {t("tracking.title")}
          </h1>
          <p className="dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] max-w-md mx-auto text-sm sm:text-base px-2">
            {t("tracking.description")}
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSearch}
          className="glass-card rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 dark:text-white/30 text-[#6B7B8D] dark:text-[#D6D6D6]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("tracking.placeholder")}
                className="w-full ps-12 pe-4 py-3.5 min-h-[48px] text-base rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] dark:text-[#D6D6D6] focus:outline-none focus:border-[#5B8DD9] focus:ring-1 focus:ring-[#5B8DD9] transition-all duration-300"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:opacity-90 text-white px-6 sm:px-8 py-3.5 min-h-[48px] rounded-xl transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 me-2" />
                  {t("tracking.track")}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="glass-card rounded-2xl p-6 mb-8 border border-red-500/20">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* No Results */}
        {searched && !order && !error && !loading && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-[#323D50]/20 dark:text-white/20 mx-auto mb-4" />
            <p className="text-[#6B7B8D] dark:text-white/50">
              {t("tracking.noOrderFound")}
            </p>
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Summary Card */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[#6B7B8D] dark:text-white/50 text-sm mb-1">{t("tracking.orderId")}</p>
                  <p className="text-[#323D50] dark:text-white font-mono text-sm">
                    {order.id}
                  </p>
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                    order.status === "delivered"
                      ? "bg-green-500/20 text-green-400"
                      : order.status === "shipped"
                      ? "bg-blue-500/20 text-blue-400"
                      : order.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : order.status === "confirmed"
                      ? "bg-white/50/20 text-[#5B8DD9]"
                      : "bg-white/10 text-[#6B7B8D] dark:text-white/60"
                  }`}
                >
                  {order.status}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#6B7B8D] dark:text-white/40" />
                  </div>
                  <div>
                    <p className="text-[#6B7B8D] dark:text-white/40 text-xs">{t("tracking.orderDate")}</p>
                    <p className="text-[#323D50] dark:text-white text-sm">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#6B7B8D] dark:text-white/40" />
                  </div>
                  <div>
                    <p className="text-[#6B7B8D] dark:text-white/40 text-xs">{t("tracking.shippingTo")}</p>
                    <p className="text-[#323D50] dark:text-white text-sm truncate">
                      {order.city || t("tracking.na")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#6B7B8D] dark:text-white/40" />
                  </div>
                  <div>
                    <p className="text-[#6B7B8D] dark:text-white/40 text-xs">{t("tracking.total")}</p>
                    <p className="text-[#323D50] dark:text-white text-sm font-semibold">
                      {order.total} LYD
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t border-[#323D50]/10 dark:border-white/5 pt-6">
                <h3 className="text-[#323D50] dark:text-white font-semibold mb-6">{t("tracking.orderStatus")}</h3>
                <OrderTimeline currentStatus={order.status} />
              </div>
            </div>

            {/* Order Items */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-[#323D50] dark:text-white font-semibold mb-4">
                {t("tracking.items")} ({order.items?.length || 0})
              </h3>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-white/5 hover:bg-white/[0.07] transition-colors duration-300"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#323D50] dark:text-white font-medium text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-[#6B7B8D] dark:text-white/40 text-xs">
                        {t("tracking.size")}: {item.size} &middot; {t("tracking.qty")}: {item.quantity}
                      </p>
                    </div>
                    <p className="text-[#323D50] dark:text-white font-semibold text-sm whitespace-nowrap">
                      {item.price * item.quantity} LYD
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#323D50]/10 dark:border-white/5">
                <span className="text-[#6B7B8D] dark:text-white/60">{t("tracking.total")}</span>
                <span className="text-xl font-bold gradient-text">
                  {order.total} LYD
                </span>
              </div>
            </div>

            {/* Vanex Live Tracking */}
            {order.vanex_package_code && (
              <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-[#323D50] dark:text-white font-semibold">
                      Vanex Live Tracking
                    </h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.vanex_package_code!);
                        toast.success("Package code copied!");
                      }}
                      className="flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 mt-0.5"
                    >
                      {order.vanex_package_code}
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {vanexLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[#6B7B8D] dark:text-white/50">
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    Loading live tracking...
                  </div>
                ) : vanexTracking ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-white/5 rounded-xl p-3">
                      <p className="text-[#6B7B8D] dark:text-white/40 text-xs mb-1">Status</p>
                      <p className="text-[#323D50] dark:text-white font-medium text-sm">
                        {vanexTracking.status}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-white/5 rounded-xl p-3">
                      <p className="text-[#6B7B8D] dark:text-white/40 text-xs mb-1">Current Location</p>
                      <p className="text-[#323D50] dark:text-white font-medium text-sm">
                        {vanexTracking.current_location || "—"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-white/5 rounded-xl p-3">
                      <p className="text-[#6B7B8D] dark:text-white/40 text-xs mb-1">Estimated Delivery</p>
                      <p className="text-[#323D50] dark:text-white font-medium text-sm">
                        {vanexTracking.estimated_delivery || "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#6B7B8D] dark:text-white/50">
                    Could not load live tracking data. Your package code is{" "}
                    <span className="font-mono text-blue-400">{order.vanex_package_code}</span>.
                  </p>
                )}
              </div>
            )}

            {/* Not yet sent to Vanex */}
            {!order.vanex_package_code && order.status !== "delivered" && (
              <div className="glass-card rounded-2xl p-5 border border-[#323D50]/10 dark:border-white/10">
                <div className="flex items-center gap-3 text-[#6B7B8D] dark:text-white/50">
                  <Truck className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">
                    Your order is being prepared. A Vanex tracking code will appear here once the order is dispatched.
                  </p>
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-[#323D50] dark:text-white font-semibold mb-4">
                {t("tracking.shippingDetails")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7B8D] dark:text-white/40">{t("tracking.name")}</span>
                  <span className="text-[#323D50] dark:text-white">{order.first_name} {order.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7B8D] dark:text-white/40">{t("tracking.email")}</span>
                  <span className="text-[#323D50] dark:text-white">{order.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7B8D] dark:text-white/40">{t("tracking.phone")}</span>
                  <span className="text-[#323D50] dark:text-white">{order.phone || t("tracking.na")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7B8D] dark:text-white/40">{t("tracking.address")}</span>
                  <span className="text-[#323D50] dark:text-white text-right max-w-[60%]">
                    {order.place_name || t("tracking.na")}, {order.city || ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
