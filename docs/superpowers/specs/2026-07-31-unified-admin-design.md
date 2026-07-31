# Unified admin: one panel, two stores

**Date:** 2026-07-31
**Status:** Approved, ready for implementation planning

## Problem

Shama and Shama Dupes are two separate storefronts backed by two separate
Supabase projects. Each ships its own admin panel, so running both means logging
into two sites in two tabs. The goal is one admin, one login, with a switcher
that flips which store you are managing.

Merging the two codebases is explicitly **not** a goal — duplicated admin code
between the repos is acceptable. The pain being solved is the double login, not
double maintenance.

## Scope

| | |
|---|---|
| Goal | One login, one tab |
| Sections working for Dupes | All of them, full edit |
| Deployment | `admin.shama.ly` only |

Cancelled by this decision: the `dupes-admin.shama.ly` subdomain (DNS + cPanel +
SSL) that was part-way set up. It is no longer needed.

**Out of scope:** merging the repos, replacing the plain-text password auth,
fixing the `image: "dsf"` insert placeholder (see Known issues).

## Context discovered

The two admin trees are ~95% identical (dupes was forked from shama) but have
diverged:

- Main has an **Influencers** section (hook + page); dupes does not.
- Dupes has dupe-specific product fields, an `OriginalPicker` dialog and a
  `BulkImportDialog`.

Coupling to the database client is low: 5 files under `src/pages/admin/` import
the Supabase singleton directly, and 12 service files centralise the rest.

A second-client pattern already exists and is proven — `src/lib/dupesStore.ts`
opens a read-only client against the dupes project so Shama product pages can
show available dupes.

### Schema differences (verified against both live projects)

| Table | Main | Dupes |
|---|---|---|
| `perfumes`, `orders`, `reviews`, `promo_codes`, `memories`, `custom_gift_orders`, `perfume_images`, `perfume_samples`, `perfume_bottle_sizes` | yes | yes |
| `influencers` | yes | **no** |

`perfumes` columns — dupes is a strict superset of main:

- **Dupes-only (5):** `inspired_by`, `original_product_id`, `original_house`,
  `original_price`, `accord_match`
- **Main-only:** none

The dupes admin already performs full CRUD from the browser with its public anon
key, so writes to the dupes project need no new permissions.

## Architecture

Three new pieces in the main repo.

### `src/lib/storeClients.ts` — a registry, not a singleton swap

```ts
export type StoreId = "shama" | "dupes";

export const STORES = {
  shama: {
    id: "shama", label: "Shama", labelAr: "Shama",
    client: supabase,                       // existing singleton
    features: { influencers: true,  dupeFields: false },
  },
  dupes: {
    id: "dupes", label: "Shama Dupes", labelAr: "شمة البدائل",
    client: createClient(DUPES_URL, DUPES_KEY, {
      auth: { persistSession: false, storageKey: "shama-dupes-admin" },
    }),
    features: { influencers: false, dupeFields: true },
  },
} as const;
```

Note on labels: the main store has no Arabic wordmark — it renders the Latin
"Shama" in both languages (`عطور فاخرة` is a tagline, not a name), so `labelAr`
repeats the Latin form. The dupes label comes from that repo's
`config/brand.ts` (`nameAr: "شمة البدائل"`), set during the recent rebrand from
"Sahma" to "Shama".

The distinct `storageKey` is required: two clients sharing `shama-auth` in
localStorage would overwrite each other's session.

### `StoreContext`

Holds `activeStore`, persisted to `localStorage` under `admin-active-store`.
Exposes `{ store, client, features, setStore }`. Mounted in `AdminApp.tsx`
inside `AdminAuthProvider`. Resets to `shama` on fresh login, so a session always
starts from a known store rather than a stale selection.

### `useStoreClient()`

The hook every admin hook calls to obtain the active client.

**`store.id` goes into every admin hook's dependency array.** Switching stores
changes the dep, so `useOrders`, `usePerfumes` and friends refetch
automatically. No manual cache invalidation, no rows leaking between stores.

### Service layer

Services (`productsService`, `ordersService`, …) gain an optional first
parameter `client: SupabaseClient`, defaulting to the main singleton. The
storefront keeps calling them unchanged; the admin passes the active client.
The change is additive rather than a rewrite.

## UI and wrong-store safety

The failure this feature could introduce is editing the wrong store's data.
Three layers guard against it.

1. **Store switcher** — dropdown in `AdminTopBar`, left of the title.
2. **The chrome changes colour**, not just a badge. Topbar accent, sidebar
   active state and primary buttons swap palette: Shama blue `#5B8DD9`, Dupes
   burgundy `#7C3E4F` with cream `#E9D3BB` (values taken from the dupes repo's
   `config/brand.ts` rather than invented). The active store should be obvious
   from across the room without reading anything.
3. **Destructive actions name the store.** `useConfirmDialog` copy becomes
   "Delete *Xerjoff Coro* from **Shama Dupes**?".

**Sidebar** filters its items by the `features` flags, so Influencers disappears
under Dupes. Adding a third store later is a registry entry, not a special case.

## Auth

One login, against the `users` table in the **main** project, via the existing
`AdminAuthProvider` — unchanged. Switching stores does not re-authenticate; it
only swaps which database is read and written.

Implication, stated plainly: the main admin password grants full write access to
the dupes data. That is the intent given one owner. The dupes project's own
`users` table goes unused by this admin; it stays in place so the dupes repo's
standalone admin keeps working.

## Product form and the schema drift

Because dupes is a strict superset, **editing is safe by construction**:
`perfumeSubmit` builds a partial payload and calls `.update()`, so the 5
dupe-only columns are preserved untouched even when the form never renders them.

**Creating** a dupe product is the real gap — those fields would land empty and
the "inspired by" link the dupes store is built around would be missing. So,
rendered only when `features.dupeFields` is on, port from the dupes repo into
`perfumeForm/dupes/`:

- **`OriginalPicker`** — sets `original_product_id` / `original_house` /
  `original_price`. It needs **both clients at once**: the dupes client to save,
  the main client to search the Shama catalogue for originals. The registry
  exposes both, so this needs no special case.
- The `inspired_by` and `accord_match` inputs from `BasicFields`.

## Error handling

- **Missing config** — if `VITE_DUPES_SUPABASE_URL` / `_ANON_KEY` are absent
  from the build, the switcher does not render and the admin behaves exactly as
  today. Same guard `dupesStoreEnabled` already uses. Both vars are already
  present in `.env`.
- **Failures must be loud.** A failed dupes query shows an error state, never an
  empty table. An empty list and a failed request look identical, and on a store
  you visit rarely you would read "broken" as "no data yet". Precedent: commit
  `21760d7`, *"surface read failures instead of an empty balance"*.
- **Switching mid-edit** — an open form dialog blocks the switch until it
  resolves, after a confirm that discards the draft. Saving a half-edited Shama
  product into the dupes database is the worst outcome available here.

## Testing

Playwright e2e, already pointed at the admin host. New spec
`admin-store-switch.spec.ts`:

1. Log in; assert Shama active and Influencers visible in the sidebar.
2. Switch to Dupes; assert product list content changes, Influencers disappears,
   accent colour changes.
3. Switch back; assert Shama data returns.

Plus a unit test asserting each store's `features` flags match the tables that
actually exist in that project.

Finally, drive it in a real browser (`/verify`): click through both stores, edit
one product in each, confirm each write lands in the correct database.

## Known issues (pre-existing, not introduced here)

`src/pages/admin/hooks/perfumeSubmit.ts:102` inserts new perfumes with a
hardcoded `image: "dsf"` placeholder. This is why products created
programmatically need their `image` column patched separately afterwards. Left
alone by this work, but it will surface in the unified admin too.
