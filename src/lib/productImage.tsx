/**
 * productImage.tsx — صورة بديلة (placeholder) لقارورة العطر.
 *
 * يوفّر شكلين للصورة الافتراضية عند غياب صورة المنتج: رابط SVG مضمّن كـ data URI
 * (للأماكن التي تتطلب رابطاً نصياً مثل السلة)، ومكوّن React يرسم أيقونة قارورة
 * (للأماكن التي ترسم JSX). كلاهما لا يعتمد على أي طلب شبكة خارجي.
 */
import { PillBottle } from "lucide-react";

// Data URI fallback for contexts where a string URL is required
// (cart entries, wishlist entries, toast images). Keeps cart persistence
// self-contained — no external HTTP calls, no broken CDN links.
// (بديل على شكل data URI للسياقات التي تتطلب رابطاً نصياً — سلة، مفضّلة،
// صور التنبيهات — فيبقى حفظ السلة مكتفياً ذاتياً دون روابط CDN مكسورة.)
export const PLACEHOLDER_IMAGE_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#5B8DD9" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#3E6BB5" stop-opacity="0.22"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#bg)"/>
      <g fill="none" stroke="#5B8DD9" stroke-width="6" stroke-opacity="0.55" stroke-linecap="round" stroke-linejoin="round">
        <rect x="165" y="100" width="70" height="38" rx="5"/>
        <line x1="175" y1="100" x2="225" y2="100"/>
        <path d="M145 158 h110 v160 q0 22 -22 22 h-66 q-22 0 -22 -22z"/>
        <line x1="180" y1="210" x2="220" y2="210"/>
      </g>
    </svg>`
  );

/**
 * مكوّن بديل يُرسم بدل صورة المنتج المفقودة: تدرّج لوني خفيف مع أيقونة قارورة.
 * @param className أصناف Tailwind إضافية للتحكم بالحجم/الموضع.
 * @returns عنصر JSX يملأ الحاوية الأب.
 */
export function ProductImageFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#5B8DD9]/15 via-[#5B8DD9]/10 to-[#3E6BB5]/15 ${className}`}
      aria-hidden="true"
    >
      <PillBottle
        className="h-20 w-20 text-[#5B8DD9]/50 drop-shadow-sm"
        strokeWidth={1.4}
      />
    </div>
  );
}
