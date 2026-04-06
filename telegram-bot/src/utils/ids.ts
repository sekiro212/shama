// Shared id-shape regexes used by orders.ts (for short-prefix order lookup)
// and by toolExecutor.ts (for the get_product_info name-vs-uuid branch).

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Short prefix used by getOrderById — admins typically paste the 8-char
// prefix that formatOrder renders. Range 6-12 gives a small safety margin.
export const SHORT_ID_RE = /^[0-9a-f]{6,12}$/i;
