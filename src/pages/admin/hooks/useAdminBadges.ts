/**
 * useAdminBadges.ts
 *
 * hook للبيانات يُغذّي عدّادات الشارات (badge) للعناصر غير المقروءة في الشريط الجانبي للوحة الإدارة.
 * يستعلم من Supabase بشكل دوري عن عدد المراجعات المعلّقة والذكريات (memories) المعلّقة
 * كي يتمكّن شريط التنقّل من إظهار عدد العناصر التي تنتظر المراجعة.
 */
import { useState, useEffect, useCallback } from "react";
import { fetchPendingReviewCount } from "@/services/reviewsService";
import { fetchPendingMemoryCount } from "@/services/memoriesService";

// عدد المللي ثانية (ms) بين كل إعادة جلب لأعداد الشارات في الخلفية.
const POLL_INTERVAL = 60_000;

/**
 * hook يتتبّع أعداد العناصر المعلّقة للمراجعة من أجل شارات الشريط الجانبي.
 * @returns `pendingReviewCount` و`pendingMemoryCount` و`refreshBadges()`
 *          لفرض إعادة عدّ فورية (مثلاً بعد الموافقة على عنصر).
 */
export function useAdminBadges() {
  // أعداد الشارات المعروضة بجانب عنصري التنقّل: المراجعات والذكريات.
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingMemoryCount, setPendingMemoryCount] = useState(0);

  // إعادة جلب العدّادين المعلّقين بالتوازي وتحديث الشارات.
  const refreshBadges = useCallback(async () => {
    try {
      // تشغيل استعلامي العدّ بشكل متزامن لتقليل زمن الاستجابة.
      const [reviews, memories] = await Promise.all([
        fetchPendingReviewCount(),
        fetchPendingMemoryCount(),
      ]);
      setPendingReviewCount(reviews);
      setPendingMemoryCount(memories);
    } catch {
      // تجاهل أخطاء تحديث الشارات بصمت
    }
  }, []);

  // الجلب مرّة واحدة عند التركيب (mount)، ثم الاستعلام دوريًا؛ وتنظيف المؤقّت عند إزالة التركيب (unmount).
  useEffect(() => {
    refreshBadges();
    const id = setInterval(refreshBadges, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refreshBadges]);

  return { pendingReviewCount, pendingMemoryCount, refreshBadges };
}
