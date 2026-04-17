import { useState, useEffect, useCallback } from "react";
import { fetchPendingReviewCount } from "@/services/reviewsService";
import { fetchPendingMemoryCount } from "@/services/memoriesService";

const POLL_INTERVAL = 60_000;

export function useAdminBadges() {
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingMemoryCount, setPendingMemoryCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const [reviews, memories] = await Promise.all([
        fetchPendingReviewCount(),
        fetchPendingMemoryCount(),
      ]);
      setPendingReviewCount(reviews);
      setPendingMemoryCount(memories);
    } catch {
      // silently ignore badge refresh errors
    }
  }, []);

  useEffect(() => {
    refreshBadges();
    const id = setInterval(refreshBadges, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refreshBadges]);

  return { pendingReviewCount, pendingMemoryCount, refreshBadges };
}
