import { Link } from "react-router-dom";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock } from "lucide-react";
import { cdnImg } from "@/lib/cdnImage";

export default function RecentlyViewed() {
  const { items } = useRecentlyViewed();
  const { t, isRTL } = useLanguage();

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[#5B8DD9]" />
        <h3 className="text-xl font-bold text-[#323D50] dark:text-white">{t("recentlyViewed.title")}</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/product/${item.id}`}
            className="flex-shrink-0 glass-card bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all duration-300 hover:scale-105 w-40"
          >
            <img
              src={cdnImg(item.image, { width: 320, format: "webp" })}
              alt={item.name}
              loading="lazy"
              decoding="async"
              width={160}
              height={128}
              className="w-full h-32 object-cover rounded-lg mb-2"
            />
            <p className="text-[#323D50] dark:text-white text-sm font-medium truncate">{item.name}</p>
            <p className="text-[#5B8DD9] text-sm font-bold">{item.price} LYD</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
