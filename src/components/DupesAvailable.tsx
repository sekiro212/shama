/**
 * ===========================================================================
 * DupesAvailable — shows inspired-by dupes for this original, on the Shama page.
 *
 * Queries the separate Sahma Dupes store (read-only bridge) for dupes linked to
 * this perfume via `original_product_id`, and renders them as cards that deep-
 * link to the Sahma Dupes storefront. Renders nothing when the bridge is off or
 * no dupes exist — so it's safe to drop on every product page.
 * ===========================================================================
 */
import { memo, useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  fetchDupesForProduct,
  dupeProductUrl,
  dupesStoreEnabled,
  type DupeProduct,
} from "@/lib/dupesStore";

interface DupesAvailableProps {
  productId: string;
  /** This original's price, to compute the shopper's saving. */
  originalPrice: number;
}

function DupesAvailableBase({ productId, originalPrice }: DupesAvailableProps) {
  const { t, language, isRTL } = useLanguage();
  const [dupes, setDupes] = useState<DupeProduct[]>([]);

  useEffect(() => {
    if (!dupesStoreEnabled || !productId) return;
    let alive = true;
    fetchDupesForProduct(productId).then((d) => {
      if (alive) setDupes(d);
    });
    return () => {
      alive = false;
    };
  }, [productId]);

  if (!dupesStoreEnabled || dupes.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[#5B8DD9]/20 bg-gradient-to-br from-[#5B8DD9]/[0.05] to-transparent">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-[#5B8DD9]" />
        <span className="text-[0.7rem] font-sans tracking-[0.22em] uppercase text-[#5B8DD9]">
          {t("dupesAvailable.eyebrow")}
        </span>
      </div>
      <p className="text-sm text-[#6B7B8D] dark:text-white/60 mb-3">
        {t("dupesAvailable.subtitle")}
      </p>

      <div className="space-y-2">
        {dupes.map((d) => {
          const name = language === "ar" && d.name_ar ? d.name_ar : d.name;
          const save =
            originalPrice > 0 && d.price < originalPrice
              ? Math.round((1 - d.price / originalPrice) * 100)
              : 0;
          return (
            <a
              key={d.id}
              href={dupeProductUrl(d.id)}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-[#5B8DD9]/15 bg-white/60 dark:bg-white/5 p-2.5 transition-colors hover:border-[#5B8DD9]/40 hover:bg-[#5B8DD9]/[0.06]"
            >
              {d.image && (
                <img
                  src={d.image}
                  alt=""
                  loading="lazy"
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#323D50] dark:text-[#F5F5F5]">
                  {name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-[#5B8DD9] font-semibold">
                    {d.price} LYD
                  </span>
                  {save > 0 && (
                    <span className="text-[0.7rem] rounded-full bg-[#5B8DD9]/10 text-[#3E6BB5] px-2 py-0.5 tabular-nums">
                      −{save}%
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight
                className={`w-4 h-4 shrink-0 text-[#5B8DD9] transition-transform group-hover:translate-x-0.5 ${
                  isRTL ? "rotate-180 group-hover:-translate-x-0.5" : ""
                }`}
              />
            </a>
          );
        })}
      </div>

      <p className="mt-3 text-[0.68rem] text-[#6B7B8D] dark:text-white/40">
        {t("dupesAvailable.note")}
      </p>
    </div>
  );
}

export const DupesAvailable = memo(DupesAvailableBase);
