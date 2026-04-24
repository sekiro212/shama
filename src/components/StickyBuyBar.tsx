import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollThreshold } from "@/hooks/useScrollThreshold";

interface StickyBuyBarProps {
  price: number;
  priceLabel: string;
  onAddToCart: () => void;
  disabled?: boolean;
  isSoldOut?: boolean;
}

export default function StickyBuyBar({
  price,
  priceLabel,
  onAddToCart,
  disabled,
  isSoldOut,
}: StickyBuyBarProps) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const visible = useScrollThreshold(500);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Quick purchase"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 80 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-[#F8F9FB]/97 dark:bg-[#1a2235]/97 backdrop-blur-md border-t border-warm/20 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.25)] pb-safe"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl font-semibold tabular-nums text-[#1E2A3D] dark:text-[#F5F5F5] leading-none">
                {price} <span className="text-[10px] font-sans tracking-[0.2em] text-[#6B7B8D] dark:text-white/50 align-middle">LYD</span>
              </div>
              <div className="text-[11px] text-[#6B7B8D] dark:text-white/55 mt-0.5 truncate">
                {priceLabel}
              </div>
            </div>
            <Button
              onClick={onAddToCart}
              disabled={disabled || isSoldOut}
              className="shrink-0 min-h-[44px] px-5 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0 rounded-xl font-semibold glow-warm-hover disabled:opacity-60"
              aria-label={isSoldOut ? t("product.soldOut") : t("product.addToCart")}
            >
              <ShoppingBag className="w-4 h-4 me-2" />
              {isSoldOut ? t("product.soldOut") : t("product.addToCart")}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
