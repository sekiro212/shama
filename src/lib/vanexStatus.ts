export const VANEX_STATUSES = [
  "store_new",
  "accepted_by_store",
  "pending",
  "shipped",
  "in_warehouse",
  "in_transit",
  "ship_received",
  "ship_preperation",
  "ship_del_return",
  "ship_pending",
  "delivered",
  "complete",
  "cancelled",
  "canceled",
  "returned",
  "store_return",
  "recalled",
  "unknown",
] as const;

export type VanexStatus = (typeof VANEX_STATUSES)[number];

export const CANCELLABLE_VANEX_STATUSES = new Set<string>([
  "store_new",
  "pending",
  "accepted_by_store",
]);

export const TERMINAL_VANEX_STATUSES = new Set<string>([
  "delivered",
  "complete",
  "cancelled",
  "canceled",
  "returned",
  "store_return",
  "recalled",
]);

export function canCancelVanex(status: string | null | undefined): boolean {
  return status != null && CANCELLABLE_VANEX_STATUSES.has(status);
}

export function canRecallVanex(status: string | null | undefined): boolean {
  return (
    status != null &&
    !CANCELLABLE_VANEX_STATUSES.has(status) &&
    !TERMINAL_VANEX_STATUSES.has(status)
  );
}
