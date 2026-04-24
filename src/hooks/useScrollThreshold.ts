import { useEffect, useState } from "react";

export function useScrollThreshold(threshold: number): boolean {
  const [crossed, setCrossed] = useState(
    () => typeof window !== "undefined" && window.scrollY > threshold
  );

  useEffect(() => {
    let rafId = 0;
    let queued = false;
    const check = () => {
      queued = false;
      setCrossed((prev) => {
        const next = window.scrollY > threshold;
        return prev === next ? prev : next;
      });
    };
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
