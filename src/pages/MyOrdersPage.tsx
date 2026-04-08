import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Truck,
  Copy,
  Check,
  ShoppingBag,
  CreditCard,
  Banknote,
  Loader2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrdersByEmail, Order } from "@/services/ordersService";
import { trackVanexPackage, VanexTracking } from "@/services/vanexService";
import { ORDER_STATUS_COLORS, PAYMENT_METHOD_STYLES } from "@/lib/orderUtils";
import OrderTimeline from "@/components/OrderTimeline";
import { toast } from "sonner";

const MyOrdersPage = () => {
  const { t, language, isRTL } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [vanexTrackingData, setVanexTrackingData] = useState<Record<string, VanexTracking | null>>({});
  const [vanexLoadingIds, setVanexLoadingIds] = useState<Set<string>>(new Set());
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: "/my-orders" } });
      return;
    }
    setLoading(true);
    fetchOrdersByEmail(user.email || "").then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const handleToggleOrder = (orderId: string) => {
    const isExpanding = expandedOrder !== orderId;
    setExpandedOrder(isExpanding ? orderId : null);

    // Load Vanex tracking when expanding an order with a package code
    if (isExpanding) {
      const order = orders.find((o) => o.id === orderId);
      if (order?.vanex_package_code && !vanexTrackingData[orderId]) {
        setVanexLoadingIds((prev) => new Set(prev).add(orderId));
        trackVanexPackage(order.vanex_package_code)
          .then((data) => {
            setVanexTrackingData((prev) => ({ ...prev, [orderId]: data }));
          })
          .finally(() => {
            setVanexLoadingIds((prev) => {
              const next = new Set(prev);
              next.delete(orderId);
              return next;
            });
          });
      }
    }
  };

  const handleCopyCode = (code: string, orderId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(orderId);
    toast.success(t("myOrders.copied"));
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "ar" ? "ar-LY" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
  };

  const getItemCount = (order: Order) => {
    if (!order.items) return 0;
    return Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0f1724] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5B8DD9]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0f1724] py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
            {t("myOrders.title")}
          </h1>
          <p className="dark:text-white/60 text-[#6B7B8D]">
            {t("myOrders.description")}
          </p>
        </div>

        {/* Orders list */}
        {orders.length === 0 ? (
          <div className="glass-card p-8 sm:p-12 rounded-2xl text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-[#323D50]/30 dark:text-white/30 mb-4" />
            <h3 className="text-lg font-semibold dark:text-[#F5F5F5] text-[#323D50] mb-2">
              {t("myOrders.empty")}
            </h3>
            <p className="dark:text-white/60 text-[#6B7B8D] mb-6">
              {t("myOrders.emptyDesc")}
            </p>
            <Link to="/collection">
              <Button className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-xl px-6 py-3 font-semibold">
                <ShoppingBag className="w-4 h-4 me-2" />
                {t("myOrders.startShopping")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const itemCount = getItemCount(order);
              const statusColor = ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.pending;

              return (
                <div
                  key={order.id}
                  className="glass-card dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  {/* Order header — always visible */}
                  <button
                    type="button"
                    onClick={() => handleToggleOrder(order.id)}
                    className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-3 hover:bg-[#5B8DD9]/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor}`}>
                          {order.status}
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAYMENT_METHOD_STYLES[order.payment_method as keyof typeof PAYMENT_METHOD_STYLES] || PAYMENT_METHOD_STYLES.cod}`}>
                          {order.payment_method === "bank_transfer" ? (
                            <><CreditCard className="w-3 h-3 inline me-1" />{t("myOrders.bankTransfer")}</>
                          ) : (
                            <><Banknote className="w-3 h-3 inline me-1" />{t("myOrders.cod")}</>
                          )}
                        </span>
                      </div>
                      <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                        {t("myOrders.placed")}: {formatDate(order.order_date || order.created_at)}
                      </p>
                      <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                        {itemCount} {itemCount === 1 ? t("myOrders.item") : t("myOrders.items")}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-lg font-bold text-[#e879f9] drop-shadow-sm">
                        {order.total?.toFixed(2)} LYD
                      </p>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#6B7B8D] dark:text-white/50 mt-1 ms-auto" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#6B7B8D] dark:text-white/50 mt-1 ms-auto" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t dark:border-white/10 border-[#323D50]/10 p-4 sm:p-5 space-y-5">
                      {/* Order Timeline */}
                      <OrderTimeline currentStatus={order.status} />

                      {/* Order items */}
                      <div className="space-y-2">
                        {Array.isArray(order.items) &&
                          order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-[#F8F9FB]"
                            >
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded-lg border dark:border-white/10 border-[#323D50]/10"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium dark:text-[#F5F5F5] text-[#323D50] truncate">
                                  {item.name}
                                </p>
                                <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                                  {item.size} &times; {item.quantity}
                                </p>
                              </div>
                              <p className="text-sm font-semibold dark:text-[#F5F5F5] text-[#323D50] shrink-0">
                                {(item.price * item.quantity).toFixed(2)} LYD
                              </p>
                            </div>
                          ))}
                      </div>

                      {/* Price breakdown */}
                      <div className="space-y-1.5 text-sm">
                        {(order.delivery_fee ?? 0) > 0 && (
                          <div className="flex justify-between dark:text-white/70 text-[#6B7B8D]">
                            <span className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              {t("myOrders.deliveryFee")}
                            </span>
                            <span>{order.delivery_fee?.toFixed(2)} LYD</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base dark:text-[#F5F5F5] text-[#323D50]">
                          <span>{t("myOrders.total")}</span>
                          <span className="text-[#e879f9]">{order.total?.toFixed(2)} LYD</span>
                        </div>
                      </div>

                      {/* Shipping info */}
                      <div className="flex items-start gap-2 text-sm dark:text-white/70 text-[#6B7B8D]">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{order.city}{order.place_name ? ` - ${order.place_name}` : ""}</span>
                      </div>

                      {/* Vanex tracking */}
                      {order.vanex_package_code ? (
                        <div className="glass-card dark:bg-white/5 bg-[#F8F9FB] border dark:border-white/10 border-[#323D50]/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold dark:text-[#F5F5F5] text-[#323D50] flex items-center gap-2">
                              <Truck className="w-4 h-4 text-[#5B8DD9]" />
                              {t("myOrders.vanexTracking")}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono dark:text-white/60 text-[#6B7B8D]">
                                {order.vanex_package_code}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(order.vanex_package_code!, order.id)}
                                className="h-7 w-7 p-0 hover:bg-[#5B8DD9]/10"
                              >
                                {copiedCode === order.id ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-[#6B7B8D]" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {vanexLoadingIds.has(order.id) ? (
                            <div className="flex items-center gap-2 text-sm dark:text-white/50 text-[#6B7B8D]">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t("myOrders.loadingTracking")}
                            </div>
                          ) : vanexTrackingData[order.id] ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="dark:text-white/60 text-[#6B7B8D]">{t("myOrders.currentStatus")}</span>
                                <span className="font-medium dark:text-[#F5F5F5] text-[#323D50]">
                                  {vanexTrackingData[order.id]!.status}
                                </span>
                              </div>
                              {vanexTrackingData[order.id]!.current_location && (
                                <div className="flex justify-between">
                                  <span className="dark:text-white/60 text-[#6B7B8D]">{t("myOrders.currentLocation")}</span>
                                  <span className="font-medium dark:text-[#F5F5F5] text-[#323D50]">
                                    {vanexTrackingData[order.id]!.current_location}
                                  </span>
                                </div>
                              )}
                              {vanexTrackingData[order.id]!.estimated_delivery && (
                                <div className="flex justify-between">
                                  <span className="dark:text-white/60 text-[#6B7B8D]">{t("myOrders.estimatedDelivery")}</span>
                                  <span className="font-medium dark:text-[#F5F5F5] text-[#323D50]">
                                    {vanexTrackingData[order.id]!.estimated_delivery}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm dark:text-white/50 text-[#6B7B8D]">
                              {t("myOrders.trackingUnavailable")}
                            </p>
                          )}
                        </div>
                      ) : (
                        order.status !== "delivered" &&
                        order.status !== "returned" && (
                          <p className="text-sm dark:text-white/50 text-[#6B7B8D] italic">
                            {t("myOrders.awaitingDispatch")}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
