import { supabase } from "@/lib/supabase";

type EventType =
  | "quiz_completion"
  | "search_query"
  | "ai_search_query"
  | "product_view"
  | "wishlist_add"
  | "wishlist_remove"
  | "cart_add"
  | "cart_remove"
  | "chatbot_query"
  | "scent_dna_generated"
  | "purchase";

let _currentUserId: string | null = null;

export function setTrackingUser(userId: string | null): void {
  _currentUserId = userId;
}

export function trackEvent(
  eventType: EventType,
  eventData: Record<string, unknown>
): void {
  if (!_currentUserId) return;

  supabase
    .from("user_events")
    .insert({
      user_id: _currentUserId,
      event_type: eventType,
      event_data: eventData,
    })
    .then(({ error }) => {
      if (error) console.warn("Tracking event failed:", error.message);
    });
}
