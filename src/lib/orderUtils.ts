/** Shared order status colors and payment method badge utilities */

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  processing: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  accepted: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  shipped: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  delivered: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  returned: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
};

export const PAYMENT_METHOD_STYLES = {
  bank_transfer: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  cod: "bg-teal-500/20 text-teal-600 dark:text-teal-400",
} as const;

export const BANK_DETAILS = {
  accountHolder: "فاروق محمد الهويجي",
  accountNumber: "038201000185567",
  iban: "LY68002038038201000185567",
} as const;
