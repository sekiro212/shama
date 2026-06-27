/**
 * useScrollThreshold.ts — يخبر إن كانت الصفحة قد تجاوزت عتبة تمرير بالبكسل (مثلاً
 * لتبديل الهيدر إلى نمطه عند التمرير "scrolled").
 *
 * يتم تقييد معالج التمرير عبر requestAnimationFrame ولا يُحدّث الحالة إلا عندما
 * تنقلب القيمة المنطقية فعلاً، فيبقى رخيص الكلفة أثناء التمرير السريع.
 */
import { useEffect, useState } from "react";

/**
 * @param threshold إزاحة التمرير العمودية (بالبكسل) التي تبدّل النتيجة.
 * @returns `true` بمجرد تجاوز `window.scrollY` للعتبة `threshold`، وإلا `false`.
 */
export function useScrollThreshold(threshold: number): boolean {
  const [crossed, setCrossed] = useState(
    () => typeof window !== "undefined" && window.scrollY > threshold
  );

  useEffect(() => {
    let rafId = 0;
    let queued = false;
    // إعادة الحساب وعدم تثبيت تغيير الحالة إلا عندما تنقلب القيمة المنطقية.
    const check = () => {
      queued = false;
      setCrossed((prev) => {
        const next = window.scrollY > threshold;
        return prev === next ? prev : next;
      });
    };
    // دمج دفقات أحداث التمرير في فحص واحد متزامن مع rAF.
    const onScroll = () => {
      if (queued) return;
      queued = true;
      rafId = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [threshold]);

  return crossed;
}
