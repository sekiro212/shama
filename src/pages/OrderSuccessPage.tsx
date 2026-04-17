import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Copy, ShoppingBag, Receipt } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    toast.success(t("cart.copied"));
  };

  const detailsHref = user ? "/my-orders" : `/track-order?id=${orderId ?? ""}`;

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 16, scale: 0.98 };
  const animate = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1 };

  return (
    <div className="grain-bg relative min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-20 sm:pt-24 pb-16 overflow-hidden flex items-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-warm/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#5B8DD9]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-xl w-full px-4 sm:px-6">
        <motion.div
          initial={initial}
          animate={animate}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-card rounded-3xl p-8 sm:p-12 text-center"
        >
          {/* Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-warm/20 blur-xl" />
            <div className="relative w-20 h-20 rounded-full bg-warm flex items-center justify-center glow-warm">
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.2} />
            </div>
          </div>

          <p className="font-display text-[11px] tracking-[0.4em] text-warm uppercase">
            {t("checkout.eyebrow")}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[#1E2A3D] dark:text-[#F5F5F5] mt-3 text-glow-warm">
            {t("checkout.success.title")}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#6B7B8D] dark:text-white/60">
            {t("checkout.success.subtitle")}
          </p>

          {orderId && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <code className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm bg-warm/10 border border-warm/30 rounded-full px-4 py-2 text-[#323D50] dark:text-[#F5F5F5] break-all">
                {orderId}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                aria-label={t("cart.copied")}
                className="h-9 w-9 p-0 text-warm hover:bg-warm/10"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-2xl h-12 font-display glow-warm-hover"
            >
              <Link to={detailsHref}>
                <Receipt className="w-4 h-4 me-2" />
                {t("checkout.success.viewDetails")}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 border-warm/40 bg-white/40 dark:bg-white/5 text-warm hover:bg-warm/10 hover:text-warm rounded-2xl h-12 font-display"
            >
              <Link to="/collection">
                <ShoppingBag className="w-4 h-4 me-2" />
                {t("checkout.success.continueShopping")}
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
