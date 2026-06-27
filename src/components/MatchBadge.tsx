/**
 * MatchBadge.tsx
 * --------------
 * شارة صغيرة لنسبة التطابق مع الذكاء الاصطناعي توضع فوق صورة المنتج (تُستخدم في
 * بطاقات نتائج AI-finder / الاختبار). تعرض نسبة التطابق، وعند المرور بالماوس
 * تظهر تلميحة (tooltip) تشرح سبب ترشيح الذكاء الاصطناعي لهذا المنتج.
 */
import { useState } from "react";
import { Sparkles } from "lucide-react";

interface MatchBadgeProps {
  score: number;        // نسبة التطابق من الذكاء الاصطناعي (0–100)
  reason?: string;      // شرح اختياري من سطر واحد يظهر في تلميحة المرور
  matchLabel: string;   // كلمة "تطابق" مترجمة مسبقاً (تُمرَّر ليبقى المكوّن مستقلاً عن اللغة)
}

/**
 * يعرض شارة نسبة التطابق مع تلميحة اختيارية عند المرور.
 * يستقبل المكوّن `matchLabel` مترجمة مسبقاً بدل استدعاء useLanguage() بنفسه،
 * ليبقى شارة عرضية بحتة (presentational).
 */
export default function MatchBadge({ score, reason, matchLabel }: MatchBadgeProps) {
  // نتتبّع حالة المرور محلياً كي لا تُعرض تلميحة الشرح إلا عند التأشير عليها.
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="absolute top-3 end-16 z-20 pointer-events-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-warm/50 text-warm text-[11px] font-semibold shadow-[0_4px_14px_rgba(212,165,116,0.25)] cursor-help select-none"
        aria-label={`${score}% ${matchLabel}`}
      >
        <Sparkles className="w-3 h-3" aria-hidden />
        <span className="tabular-nums">{score}%</span>
        <span className="hidden sm:inline tracking-wide uppercase text-[10px] opacity-90">
          {matchLabel}
        </span>
      </div>

      {/* تلميحة الشرح — تُركَّب فقط أثناء المرور وعند توفّر سبب (reason) */}
      {reason && hovered && (
        <div
          role="tooltip"
          className="absolute top-full end-0 mt-2 w-64 max-w-[75vw] p-3 rounded-xl bg-[#1E2A3D] text-white/90 text-xs leading-relaxed shadow-xl border border-warm/20 z-30"
        >
          <p className="italic">&ldquo;{reason}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
