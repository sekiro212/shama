import { useEffect, useState } from "react";
import {
  Package,
  Search,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import OrderDetailView from "@/components/OrderDetailView";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Order } from "@/services/ordersService";

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  processing: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  shipped: "bg-warm/15 text-warm",
  delivered: "bg-green-500/15 text-green-600 dark:text-green-400",
  returned: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const OrderTrackingPage = () => {
  const { t, language, isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const [query, setQuery] = useState(searchParams.get("id") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-search if URL has ?id=…
  useEffect(() => {
    const urlId = searchParams.get("id");
    if (urlId && !searched) {
      setQuery(urlId);
      doSearch(urlId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (input?: string) => {
    const value = (input ?? query).trim();
    if (!value) return;

    setLoading(true);
    setError(null);
    setOrders([]);
    setSelectedId(null);
    setSearched(true);

    try {
      const isEmail = value.includes("@");
      if (isEmail) {
        const { data, error: err } = await supabase
          .from("orders")
          .select("*")
          .eq("email", value.toLowerCase())
          .order("created_at", { ascending: false });
        if (err || !data || data.length === 0) {
          setError(t("tracking.noOrder"));
        } else {
          setOrders(data as Order[]);
          setSelectedId((data[0] as Order).id);
        }
      } else {
        const { data, error: err } = await supabase
          .from("orders")
          .select("*")
          .eq("id", value)
          .maybeSingle();
        if (err || !data) {
          setError(t("tracking.noOrder"));
        } else {
          setOrders([data as Order]);
          setSelectedId((data as Order).id);
        }
      }
    } catch {
      setError(t("tracking.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch();
  };

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const showList = orders.length > 1 && !selectedId;

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(
      language === "ar" ? "ar-LY" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );

  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <div className="grain-bg relative min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-20 sm:pt-24 pb-16 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-1/4 -left-24 w-[28rem] h-[28rem] rounded-full bg-warm/15 blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-80 h-80 rounded-full bg-[#5B8DD9]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={initial}
          animate={animate}
          transition={{ duration: 0.35 }}
          className="mb-8 sm:mb-10 text-center"
        >
          <p className="font-display text-[11px] sm:text-xs tracking-[0.4em] text-warm uppercase">
            {t("tracking.eyebrow")}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-[#1E2A3D] dark:text-[#F5F5F5] mt-2 text-glow-warm">
            {t("tracking.title")}
          </h1>
          <p className="mt-3 font-display italic text-[#6B7B8D] dark:text-white/60 max-w-xl mx-auto">
            {t("tracking.description")}
          </p>
        </motion.header>

        {/* Search form */}
        <motion.form
          initial={initial}
          animate={animate}
          transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.05 }}
          onSubmit={handleSubmit}
          className="glass-card rounded-3xl p-4 sm:p-5 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${
                  isRTL ? "right-4" : "left-4"
                } text-warm pointer-events-none`}
              />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("tracking.placeholder")}
                aria-label={t("tracking.placeholder")}
                className={`h-12 rounded-2xl glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 ${
                  isRTL ? "pr-11" : "pl-11"
                }`}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-2xl px-6 font-display glow-warm-hover disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 me-2" />
                  <span className="tracking-widest uppercase text-xs">
                    {t("tracking.track")}
                  </span>
                </>
              )}
            </Button>
          </div>
        </motion.form>

        {/* Error */}
        {error && (
          <div className="glass-card rounded-2xl p-5 mb-6 border border-red-500/20 flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* No-results */}
        {searched && !loading && orders.length === 0 && !error && (
          <div className="glass-card rounded-3xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warm/15 flex items-center justify-center">
              <Package className="w-7 h-7 text-warm" />
            </div>
            <p className="font-display text-lg text-[#323D50] dark:text-[#F5F5F5]">
              {t("tracking.noOrderFound")}
            </p>
          </div>
        )}

        {/* Multi-order list (email lookup with >1 result and none selected) */}
        {showList && (
          <motion.div
            initial={initial}
            animate={animate}
            transition={{ duration: 0.35 }}
            className="glass-card rounded-3xl p-4 sm:p-5"
          >
            <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase px-2 pb-3">
              {orders.length} {t("myOrders.items")}
            </p>
            <ul className="space-y-2">
              {orders.map((order) => {
                const statusColor =
                  STATUS_PILL[order.status] ?? STATUS_PILL.pending;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      className="w-full text-start rounded-2xl p-4 border border-transparent hover:bg-warm/5 hover:border-warm/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-display text-sm text-[#323D50] dark:text-[#F5F5F5] tabular-nums">
                            #{order.id.slice(0, 8)}
                          </span>
                          <p className="text-xs text-[#6B7B8D] dark:text-white/60 mt-0.5">
                            {formatDate(order.order_date || order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full font-display ${statusColor}`}
                          >
                            {t(`timeline.${order.status}`) || order.status}
                          </span>
                          <span className="font-display tabular-nums text-sm text-[#323D50] dark:text-[#F5F5F5]">
                            {order.total?.toFixed(2)}{" "}
                            <span className="text-[10px] text-warm">LYD</span>
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-warm/60 ${
                              isRTL ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}

        {/* Single order detail */}
        {selected && (
          <>
            {orders.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => setSelectedId(null)}
                className="mb-4 -ml-2 h-9 px-2 text-[#6B7B8D] dark:text-white/60 hover:bg-warm/10 hover:text-warm"
              >
                <ArrowLeft
                  className={`w-4 h-4 me-2 ${isRTL ? "rotate-180" : ""}`}
                />
                <span className="text-xs tracking-widest uppercase">
                  {t("myOrders.items")}
                </span>
              </Button>
            )}
            <OrderDetailView order={selected} variant="tracking" />
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
