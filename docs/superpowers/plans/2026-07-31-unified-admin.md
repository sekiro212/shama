# Unified Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a store switcher to the Shama admin so `admin.shama.ly` manages both the Shama store and the Shama Dupes store (two separate Supabase projects) from one login.

**Architecture:** A store registry (`src/lib/storeClients.ts`) holds a Supabase client plus feature flags per store. A `StoreProvider` exposes the active store through context; admin hooks read the client from it and put `store.id` in their dependency arrays so switching refetches. Service functions gain an optional leading `client` parameter defaulting to the main singleton, keeping the storefront untouched.

**Tech Stack:** React 18 + TypeScript, Vite, `@supabase/supabase-js`, Tailwind, shadcn/ui (Radix), Playwright, Vitest (added in Task 1 — the repo has no unit runner yet).

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-31-unified-admin-design.md`. Read it before starting.
- **Bilingual:** every user-facing string goes in BOTH `src/locales/en.json` and `src/locales/ar.json` and is read via `t("key")` from `useLanguage()`. Never hardcode English in a component.
- **RTL:** use `ms-*`/`me-*` over `ml-*`/`mr-*`; add `rtl:space-x-reverse` to `space-x-*`.
- **Store IDs:** exactly `"shama"` and `"dupes"`. Lowercase, no other values.
- **Store labels:** Shama → `label: "Shama"`, `labelAr: "Shama"` (the main store has no Arabic wordmark). Dupes → `label: "Shama Dupes"`, `labelAr: "شمة البدائل"`.
- **Palette:** Shama `#5B8DD9`; Dupes `#7C3E4F` with cream `#E9D3BB`. Exact hex values, taken from the dupes repo's `config/brand.ts`.
- **localStorage keys:** active store → `admin-active-store`. Dupes client auth → `shama-dupes-admin` (must differ from the main client's `shama-auth` or the two sessions overwrite each other).
- **Env vars:** `VITE_DUPES_SUPABASE_URL` and `VITE_DUPES_SUPABASE_ANON_KEY`, both already present in `.env`.
- **Do NOT** modify the dupes repo, the plain-text password auth, or the `image: "dsf"` placeholder at `src/pages/admin/hooks/perfumeSubmit.ts:102`.
- **Commit after every task.**

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/storeClients.ts` (create) | Store registry: id, labels, Supabase client, feature flags. No React. |
| `src/contexts/StoreContext.tsx` (create) | `StoreProvider` + `useStore()`. Holds active store, persists to localStorage. |
| `src/pages/admin/components/StoreSwitcher.tsx` (create) | Topbar dropdown. |
| `src/pages/admin/AdminApp.tsx` (modify) | Mount `StoreProvider`; gate the influencers route. |
| `src/pages/admin/components/AdminTopBar.tsx` (modify) | Render `StoreSwitcher`. |
| `src/pages/admin/components/AdminSidebar.tsx` (modify) | Filter nav items by feature flags; store accent colour. |
| `src/services/*.ts` (modify) | Optional leading `client` parameter. |
| `src/pages/admin/hooks/*.ts` (modify) | Take client from `useStore()`; add `store.id` to deps. |
| `src/pages/admin/dialogs/perfumeForm/DupeFields.tsx` (create) | Dupe-only product fields, rendered when `features.dupeFields`. |
| `tests/unit/storeClients.test.ts` (create) | Registry shape + feature flags. |
| `tests/e2e/admin-store-switch.spec.ts` (create) | Switching behaviour end to end. |

---

### Task 1: Store registry

**Files:**
- Create: `src/lib/storeClients.ts`
- Create: `tests/unit/storeClients.test.ts`
- Modify: `package.json` (add vitest)
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type StoreId = "shama" | "dupes"`; `type StoreFeatures = { influencers: boolean; dupeFields: boolean }`; `type StoreDef = { id: StoreId; label: string; labelAr: string; accent: string; accentSoft: string; client: SupabaseClient; features: StoreFeatures }`; `const STORES: Record<StoreId, StoreDef>`; `const dupesAdminEnabled: boolean`; `function getStore(id: StoreId): StoreDef`.

- [ ] **Step 1: Install vitest**

The repo has Playwright but no unit runner.

```bash
npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

Add to `package.json` scripts: `"test:unit": "vitest run"`.

- [ ] **Step 3: Write the failing test**

Create `tests/unit/storeClients.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STORES, getStore } from "@/lib/storeClients";

describe("store registry", () => {
  it("exposes exactly the two known stores", () => {
    expect(Object.keys(STORES).sort()).toEqual(["dupes", "shama"]);
  });

  it("labels the main store with no Arabic wordmark", () => {
    expect(STORES.shama.label).toBe("Shama");
    expect(STORES.shama.labelAr).toBe("Shama");
  });

  it("labels the dupes store with its Arabic brand name", () => {
    expect(STORES.dupes.label).toBe("Shama Dupes");
    expect(STORES.dupes.labelAr).toBe("شمة البدائل");
  });

  // influencers exists only in the main Supabase project (verified: 404 on dupes)
  it("enables influencers only for the main store", () => {
    expect(STORES.shama.features.influencers).toBe(true);
    expect(STORES.dupes.features.influencers).toBe(false);
  });

  // the dupes perfumes table is a strict superset (5 extra columns)
  it("enables dupe product fields only for the dupes store", () => {
    expect(STORES.shama.features.dupeFields).toBe(false);
    expect(STORES.dupes.features.dupeFields).toBe(true);
  });

  it("gives each store a distinct accent colour", () => {
    expect(STORES.shama.accent).toBe("#5B8DD9");
    expect(STORES.dupes.accent).toBe("#7C3E4F");
  });

  it("getStore returns the requested store", () => {
    expect(getStore("dupes").id).toBe("dupes");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `@/lib/storeClients`.

- [ ] **Step 5: Write the implementation**

Create `src/lib/storeClients.ts`:

```ts
/**
 * storeClients.ts — registry of the stores this admin can manage.
 *
 * Shama and Shama Dupes live in two separate Supabase projects. Rather than
 * mutating a single client, each store owns its own client plus feature flags
 * describing what that project actually supports. The admin reads the active
 * entry through StoreContext.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type StoreId = "shama" | "dupes";

export interface StoreFeatures {
  /** `influencers` table exists only in the main project. */
  influencers: boolean;
  /** dupes `perfumes` adds inspired_by / original_* / accord_match. */
  dupeFields: boolean;
}

export interface StoreDef {
  id: StoreId;
  label: string;
  labelAr: string;
  accent: string;
  accentSoft: string;
  client: SupabaseClient;
  features: StoreFeatures;
}

const DUPES_URL = import.meta.env.VITE_DUPES_SUPABASE_URL as string | undefined;
const DUPES_KEY = import.meta.env.VITE_DUPES_SUPABASE_ANON_KEY as string | undefined;

/** True when the dupes project is configured; the switcher hides when false. */
export const dupesAdminEnabled = Boolean(DUPES_URL && DUPES_KEY);

// A distinct storageKey is required — sharing "shama-auth" would make the two
// clients overwrite each other's session in localStorage.
const dupesClient = dupesAdminEnabled
  ? createClient(DUPES_URL as string, DUPES_KEY as string, {
      auth: { persistSession: false, storageKey: "shama-dupes-admin" },
    })
  : supabase;

export const STORES: Record<StoreId, StoreDef> = {
  shama: {
    id: "shama",
    label: "Shama",
    labelAr: "Shama", // the main store has no Arabic wordmark
    accent: "#5B8DD9",
    accentSoft: "#3E6BB5",
    client: supabase,
    features: { influencers: true, dupeFields: false },
  },
  dupes: {
    id: "dupes",
    label: "Shama Dupes",
    labelAr: "شمة البدائل",
    accent: "#7C3E4F",
    accentSoft: "#E9D3BB",
    client: dupesClient,
    features: { influencers: false, dupeFields: true },
  },
};

export const getStore = (id: StoreId): StoreDef => STORES[id];
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storeClients.ts tests/unit/storeClients.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat(admin): add store registry for Shama and Shama Dupes"
```

---

### Task 2: StoreContext

**Files:**
- Create: `src/contexts/StoreContext.tsx`
- Create: `tests/unit/storeContext.test.ts`

**Interfaces:**
- Consumes: `STORES`, `getStore`, `StoreId`, `StoreDef` from Task 1.
- Produces: `<StoreProvider>`; `useStore(): { store: StoreDef; client: SupabaseClient; features: StoreFeatures; setStore: (id: StoreId) => void }`; `const ACTIVE_STORE_KEY = "admin-active-store"`; `function readStoredStore(raw: string | null): StoreId`.

- [ ] **Step 1: Write the failing test**

`readStoredStore` is exported separately so the persistence rule is testable without a DOM.

Create `tests/unit/storeContext.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readStoredStore, ACTIVE_STORE_KEY } from "@/contexts/StoreContext";

describe("readStoredStore", () => {
  it("uses the shama store when nothing is stored", () => {
    expect(readStoredStore(null)).toBe("shama");
  });

  it("restores a valid stored store", () => {
    expect(readStoredStore("dupes")).toBe("dupes");
  });

  it("falls back to shama for an unknown value", () => {
    expect(readStoredStore("bogus")).toBe("shama");
  });

  it("uses a stable localStorage key", () => {
    expect(ACTIVE_STORE_KEY).toBe("admin-active-store");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `@/contexts/StoreContext`.

- [ ] **Step 3: Write the implementation**

Create `src/contexts/StoreContext.tsx`:

```tsx
/**
 * StoreContext.tsx — which store the admin is currently managing.
 *
 * Holds the active store and hands out its Supabase client. Admin hooks put
 * `store.id` in their dependency arrays so switching triggers a refetch.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORES, getStore, type StoreDef, type StoreFeatures, type StoreId } from "@/lib/storeClients";

export const ACTIVE_STORE_KEY = "admin-active-store";

/** Validate a persisted value; anything unrecognised falls back to the main store. */
export function readStoredStore(raw: string | null): StoreId {
  return raw && raw in STORES ? (raw as StoreId) : "shama";
}

interface StoreContextValue {
  store: StoreDef;
  client: SupabaseClient;
  features: StoreFeatures;
  setStore: (id: StoreId) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState<StoreId>(() =>
    readStoredStore(typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_STORE_KEY))
  );

  const setStore = useCallback((id: StoreId) => {
    setStoreId(id);
    window.localStorage.setItem(ACTIVE_STORE_KEY, id);
  }, []);

  const value = useMemo(() => {
    const store = getStore(storeId);
    return { store, client: store.client, features: store.features, setStore };
  }, [storeId, setStore]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Read the active store. Throws outside StoreProvider so misuse fails loudly. */
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS, 11 tests total.

- [ ] **Step 5: Mount the provider**

In `src/pages/admin/AdminApp.tsx`, import `StoreProvider` and wrap the router — inside `AdminAuthProvider`, so it lives within the authenticated area:

```tsx
<ThemeProvider>
  <LanguageProvider>
    <AdminAuthProvider>
      <StoreProvider>
        {/* existing <Router> subtree unchanged */}
      </StoreProvider>
    </AdminAuthProvider>
  </LanguageProvider>
</ThemeProvider>
```

- [ ] **Step 6: Reset to the main store on fresh login**

The selection persists across reloads, but a *new login* must start from a known store rather than inheriting a selection from days ago.

Find the login function in `src/contexts/AdminAuthContext.tsx` (the one that succeeds against `isAdminAuthenticated()`), and clear the key immediately after a successful authentication:

```ts
import { ACTIVE_STORE_KEY } from "@/contexts/StoreContext";

// inside the successful-login branch, before setting the authenticated state:
window.localStorage.removeItem(ACTIVE_STORE_KEY);
```

`StoreProvider` then reads `null` on next mount and `readStoredStore` returns `"shama"`.

- [ ] **Step 7: Verify the app still builds**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/contexts/StoreContext.tsx tests/unit/storeContext.test.ts src/pages/admin/AdminApp.tsx src/contexts/AdminAuthContext.tsx
git commit -m "feat(admin): add StoreContext holding the active store"
```

---

### Task 3: Thread the client through services

**Files:**
- Modify: `src/services/ordersService.ts`
- Modify: `src/services/productsService.ts`
- Modify: `src/services/reviewsService.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (services stay React-free).
- Produces: every exported service function accepts an optional **leading** `client: SupabaseClient` parameter, defaulting to the main singleton. Example new signatures: `fetchOrders(client?: SupabaseClient, filters?: OrderFilters)`, `updateOrderStatus(client: SupabaseClient | undefined, id: string, status: OrderStatus)`, `fetchProducts(client?: SupabaseClient, ...)`.

Existing storefront callers pass nothing and keep working.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/serviceClient.test.ts`. A fake client records which table was queried, proving the passed client is used instead of the singleton:

```ts
import { describe, it, expect } from "vitest";
import { fetchOrders } from "@/services/ordersService";

function fakeClient(rows: unknown[]) {
  const calls: string[] = [];
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain, eq: chain, gte: chain, lte: chain, ilike: chain,
    order: () => Promise.resolve({ data: rows, error: null }),
  });
  return {
    calls,
    client: { from: (t: string) => { calls.push(t); return builder; } } as never,
  };
}

describe("ordersService client injection", () => {
  it("queries the client it is given", async () => {
    const { client, calls } = fakeClient([{ id: "1" }]);
    await fetchOrders(client);
    expect(calls).toContain("orders");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `fetchOrders` ignores the argument (it takes `filters` first).

- [ ] **Step 3: Add the parameter**

In each service, import the type and default to the singleton. Pattern for every exported function:

```ts
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export const fetchOrders = async (
  client: SupabaseClient = supabase,
  filters?: OrderFilters,
): Promise<Order[]> => {
  let query = client.from("orders").select("*");
  // ...rest of the existing body, with every `supabase.` replaced by `client.`
};
```

Apply to all exported functions in the three services. Inside each body, replace `supabase.` with `client.`. Do not change any query logic.

- [ ] **Step 4: Fix storefront callers that pass filters positionally**

Run: `npx tsc -b --noEmit`

Any caller passing filters as the first argument now type-errors. Update each to `fetchOrders(undefined, filters)`. Fix until tsc is clean.

- [ ] **Step 5: Run tests**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/services tests/unit/serviceClient.test.ts src
git commit -m "feat(services): accept an optional Supabase client parameter"
```

---

### Task 4: Admin hooks use the active client

**Files:**
- Modify: `src/pages/admin/hooks/useOrders.ts`
- Modify: `src/pages/admin/hooks/usePerfumes.ts`
- Modify: `src/pages/admin/hooks/useGiftOrders.ts`
- Modify: `src/pages/admin/hooks/perfumeSubmit.ts`
- Modify: `src/pages/admin/hooks/useReviews.ts`
- Modify: `src/pages/admin/hooks/useCoupons.ts`
- Modify: `src/pages/admin/hooks/useMemories.ts`
- Modify: `src/pages/admin/hooks/useOverviewData.ts`
- Modify: `src/pages/admin/hooks/useAdminBadges.ts`
- Modify: `src/pages/admin/tabs/GiftOrdersTab.tsx`

**Interfaces:**
- Consumes: `useStore()` from Task 2; the client-parameter service signatures from Task 3.
- Produces: no new exports. Every admin hook fetches from the active store and refetches on switch.

- [ ] **Step 1: Convert one hook and confirm the pattern**

In `src/pages/admin/hooks/useOrders.ts`, replace the singleton import:

```ts
// remove: import { supabase } from "@/lib/supabase";
import { useStore } from "@/contexts/StoreContext";
```

Inside the hook body:

```ts
const { client, store } = useStore();
```

Replace every `supabase.` with `client.`, and every service call with the client as first argument (`fetchOrders(client)`, `updateOrderStatus(client, id, status)`).

Add `store.id` to the dependency array of every `useEffect`/`useCallback` that loads data:

```ts
useEffect(() => {
  loadOrders();
}, [store.id]);  // refetch when the store switches
```

- [ ] **Step 2: Verify no stale data on switch**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Apply the same pattern to the remaining files**

Repeat Step 1 for each file listed above. `perfumeSubmit.ts` is not a hook — give it an explicit leading `client: SupabaseClient` parameter and pass `client` from `usePerfumes`. `GiftOrdersTab.tsx` is a component: use `const { client } = useStore()`.

**Leave the `image: "dsf"` placeholder at `perfumeSubmit.ts:102` exactly as is.**

- [ ] **Step 4: Confirm the singleton is gone from the admin tree**

Run: `grep -rn 'from "@/lib/supabase"' src/pages/admin`
Expected: no output.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin
git commit -m "feat(admin): read data through the active store's client"
```

---

### Task 5: Store switcher UI

**Files:**
- Create: `src/pages/admin/components/StoreSwitcher.tsx`
- Modify: `src/pages/admin/components/AdminTopBar.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

**Interfaces:**
- Consumes: `useStore()` (Task 2), `STORES` and `dupesAdminEnabled` (Task 1).
- Produces: `<StoreSwitcher />`, default export.

- [ ] **Step 1: Add translation keys**

`src/locales/en.json`, inside the `admin` object:

```json
"store": {
  "switch": "Store",
  "shama": "Shama",
  "dupes": "Shama Dupes",
  "switchedTo": "Now managing {{store}}"
}
```

`src/locales/ar.json`, same location:

```json
"store": {
  "switch": "المتجر",
  "shama": "Shama",
  "dupes": "شمة البدائل",
  "switchedTo": "تُدير الآن {{store}}"
}
```

- [ ] **Step 2: Create the component**

Create `src/pages/admin/components/StoreSwitcher.tsx`:

```tsx
/**
 * StoreSwitcher — picks which store the admin manages.
 *
 * Hidden entirely when the dupes project is not configured, so a build without
 * VITE_DUPES_* behaves exactly as the single-store admin did.
 */
import { Store as StoreIcon, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStore } from "@/contexts/StoreContext";
import { STORES, dupesAdminEnabled, type StoreId } from "@/lib/storeClients";

export default function StoreSwitcher() {
  const { store, setStore } = useStore();
  const { t, isRTL } = useLanguage();

  if (!dupesAdminEnabled) return null;

  const nameOf = (id: StoreId) => (isRTL ? STORES[id].labelAr : STORES[id].label);

  const pick = (id: StoreId) => {
    if (id === store.id) return;
    setStore(id);
    toast.success(t("admin.store.switchedTo").replace("{{store}}", nameOf(id)));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 rtl:space-x-reverse font-medium"
          style={{ borderColor: store.accent, color: store.accent }}
          aria-label={t("admin.store.switch")}
        >
          <StoreIcon className="w-4 h-4" />
          <span>{nameOf(store.id)}</span>
          <ChevronDown className="w-4 h-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? "start" : "end"} className="min-w-[200px]">
        {(Object.keys(STORES) as StoreId[]).map((id) => (
          <DropdownMenuItem key={id} onClick={() => pick(id)} className="gap-2 cursor-pointer">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: STORES[id].accent }}
            />
            <span className="flex-1">{nameOf(id)}</span>
            {id === store.id && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Render it in the topbar**

In `src/pages/admin/components/AdminTopBar.tsx`, import `StoreSwitcher` and render it immediately before the existing page title.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `http://admin.localhost:5173/`, log in.
Expected: the switcher shows "Shama". Opening it lists both stores with the active one ticked. Selecting "Shama Dupes" shows a toast and the product list changes to dupe products.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/StoreSwitcher.tsx src/pages/admin/components/AdminTopBar.tsx src/locales
git commit -m "feat(admin): add store switcher to the topbar"
```

---

### Task 6: Sidebar reflects the active store

**Files:**
- Modify: `src/pages/admin/components/AdminSidebar.tsx`
- Modify: `src/pages/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: `useStore()` (Task 2).
- Produces: nav items filtered by feature flags; the active-item accent follows the store.

- [ ] **Step 1: Tag the influencers nav item**

In `AdminSidebar.tsx`, the item list is around line 48. Add an optional `feature` key to the item type and tag influencers:

```ts
interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  badgeKey?: string;
  /** Hidden unless the active store has this feature. */
  feature?: keyof StoreFeatures;
}

// ...
{ path: "/influencers", icon: Megaphone, labelKey: "admin.nav.influencers", feature: "influencers" },
```

- [ ] **Step 2: Filter by the active store**

In the sidebar component body:

```ts
const { store, features } = useStore();
const visibleItems = NAV_ITEMS.filter((item) => !item.feature || features[item.feature]);
```

Render `visibleItems` instead of `NAV_ITEMS`. Use `store.accent` for the active item's colour in place of the hardcoded blue.

- [ ] **Step 3: Guard the route too**

A hidden link is not a closed door — `/influencers` is still reachable by URL, and under Dupes it would query a table that 404s. In `AdminApp.tsx`, redirect when the feature is off:

```tsx
<Route
  path="/influencers"
  element={features.influencers ? <InfluencersPage /> : <Navigate to="/" replace />}
/>
```

Read `features` from `useStore()` in the component that declares the routes, and import `Navigate` from `react-router-dom`.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `http://admin.localhost:5173/`, log in.
Expected: under Shama the sidebar shows Influencers and the accent is blue. Switch to Dupes: Influencers disappears, the accent turns burgundy, and visiting `/influencers` directly redirects to the overview.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/AdminSidebar.tsx src/pages/admin/AdminApp.tsx
git commit -m "feat(admin): adapt sidebar and routes to the active store"
```

---

### Task 7: Dupe-only product fields

**Files:**
- Create: `src/pages/admin/dialogs/perfumeForm/DupeFields.tsx`
- Modify: `src/pages/admin/dialogs/PerfumeFormDialog.tsx`
- Modify: `src/pages/admin/types.ts`
- Modify: `src/locales/en.json`, `src/locales/ar.json`

**Interfaces:**
- Consumes: `useStore()` (Task 2).
- Produces: `<DupeFields value={...} onChange={...} />` where value is `{ inspired_by, original_product_id, original_house, original_price, accord_match }`.

Reference implementation lives in the dupes repo at `src/pages/admin/dialogs/perfumeForm/BasicFields.tsx` and `OriginalPicker.tsx` — read them, do not import across repos.

- [ ] **Step 1: Extend the form type**

In `src/pages/admin/types.ts`, add the five optional columns to the perfume form type:

```ts
/** Present only on the dupes store; the main `perfumes` table lacks these. */
inspired_by?: string | null;
original_product_id?: string | null;
original_house?: string | null;
original_price?: number | null;
accord_match?: number | null;
```

They are optional, so the main store's form is unaffected.

- [ ] **Step 2: Add translation keys**

`en.json` under `admin`:

```json
"dupe": {
  "section": "Dupe details",
  "inspiredBy": "Inspired by",
  "originalHouse": "Original house",
  "originalPrice": "Original price (LYD)",
  "accordMatch": "Accord match (%)",
  "pickOriginal": "Search the Shama catalogue",
  "noOriginal": "No original linked"
}
```

`ar.json` under `admin`:

```json
"dupe": {
  "section": "تفاصيل البديل",
  "inspiredBy": "مستوحى من",
  "originalHouse": "الدار الأصلية",
  "originalPrice": "سعر الأصلي (د.ل)",
  "accordMatch": "نسبة التطابق (%)",
  "pickOriginal": "ابحث في كتالوج شما",
  "noOriginal": "لا يوجد عطر أصلي مرتبط"
}
```

- [ ] **Step 3: Create the component**

Create `src/pages/admin/dialogs/perfumeForm/DupeFields.tsx`. Note it searches the **main** catalogue while the form saves to the **dupes** client — hence `STORES.shama.client` explicitly:

```tsx
/**
 * DupeFields — the columns that exist only on the dupes `perfumes` table.
 *
 * The original-picker searches the MAIN Shama catalogue (STORES.shama.client)
 * while the surrounding form writes to the dupes project, so both clients are
 * in play at once.
 */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { STORES } from "@/lib/storeClients";

export interface DupeFieldValues {
  inspired_by?: string | null;
  original_product_id?: string | null;
  original_house?: string | null;
  original_price?: number | null;
  accord_match?: number | null;
}

interface Props {
  value: DupeFieldValues;
  onChange: (patch: Partial<DupeFieldValues>) => void;
}

interface OriginalOption { id: string; name: string; price: number }

export default function DupeFields({ value, onChange }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<OriginalOption[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) { setOptions([]); return; }
    let alive = true;
    STORES.shama.client
      .from("perfumes")
      .select("id,name,price")
      .ilike("name", `%${query}%`)
      .eq("is_active", true)
      .limit(8)
      .then(({ data }) => { if (alive) setOptions((data as OriginalOption[]) ?? []); });
    return () => { alive = false; };
  }, [query]);

  return (
    <div className="glass-card p-6 rounded-2xl space-y-4">
      <h3 className="font-semibold">{t("admin.dupe.section")}</h3>

      <div className="space-y-2">
        <Label>{t("admin.dupe.pickOriginal")}</Label>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} />
        {options.length > 0 && (
          <ul className="rounded-xl border divide-y">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full text-start px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    onChange({
                      original_product_id: o.id,
                      inspired_by: o.name,
                      original_price: o.price,
                    });
                    setQuery("");
                    setOptions([]);
                  }}
                >
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          {value.inspired_by || t("admin.dupe.noOriginal")}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t("admin.dupe.originalHouse")}</Label>
        <Input
          value={value.original_house ?? ""}
          onChange={(e) => onChange({ original_house: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("admin.dupe.originalPrice")}</Label>
        <Input
          type="number"
          value={value.original_price ?? ""}
          onChange={(e) => onChange({ original_price: Number(e.target.value) || null })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("admin.dupe.accordMatch")}</Label>
        <Input
          type="number" min={0} max={100}
          value={value.accord_match ?? ""}
          onChange={(e) => onChange({ accord_match: Number(e.target.value) || null })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render it conditionally**

In `PerfumeFormDialog.tsx`:

```tsx
const { features } = useStore();
// ...inside the form, after the existing basic fields:
{features.dupeFields && (
  <DupeFields
    value={formData}
    onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
  />
)}
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, log into `http://admin.localhost:5173/`.
Expected: under Shama, Products → edit shows no dupe section. Switch to Dupes → the section appears; typing 2+ characters in the original search lists Shama products; picking one fills inspired-by and original price. Save, reopen, and confirm the values persisted.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/dialogs src/pages/admin/types.ts src/locales
git commit -m "feat(admin): add dupe-only product fields for the dupes store"
```

---

### Task 8: Loud failures and switch-mid-edit guard

**Files:**
- Modify: `src/pages/admin/hooks/usePerfumes.ts`
- Modify: `src/pages/admin/hooks/useOrders.ts`
- Modify: `src/pages/admin/components/StoreSwitcher.tsx`
- Modify: `src/pages/admin/dialogs/PerfumeFormDialog.tsx`
- Modify: `src/locales/en.json`, `src/locales/ar.json`

**Interfaces:**
- Consumes: `useStore()` (Task 2), `<StoreSwitcher />` (Task 5).
- Produces: `loadError: string | null` returned from `usePerfumes` and `useOrders`; a `blocked` guard on the switcher.

- [ ] **Step 1: Add translation keys**

`en.json` under `admin`:

```json
"loadFailed": "Couldn't load data from this store",
"switchBlocked": "Close the open form before switching stores"
```

`ar.json` under `admin`:

```json
"loadFailed": "تعذّر تحميل البيانات من هذا المتجر",
"switchBlocked": "أغلق النموذج المفتوح قبل تبديل المتجر"
```

- [ ] **Step 2: Surface read failures instead of an empty table**

An empty list and a failed request look identical, and on a rarely-visited store that reads as "no data yet" rather than "broken". In `usePerfumes` and `useOrders`, add `const [loadError, setLoadError] = useState<string | null>(null)`; set it in the `catch` of each loader, clear it on success, and return it. In the matching tab component, render the error text when `loadError` is set instead of the empty state.

- [ ] **Step 3: Block switching while a form dialog is open**

Saving a half-edited Shama product into the dupes database is the worst outcome this feature can produce. In `PerfumeFormDialog`, when the dialog opens set `window.__adminFormOpen = true` and clear it on close. In `StoreSwitcher.pick()`, before switching:

```ts
if (window.__adminFormOpen) {
  toast.error(t("admin.switchBlocked"));
  return;
}
```

Declare the global in `src/vite-env.d.ts`:

```ts
declare global {
  interface Window { __adminFormOpen?: boolean }
}
export {};
```

- [ ] **Step 4: Name the store in destructive confirmations**

Deleting a Shama product while believing you are in Dupes is the mistake this whole feature risks. The confirm dialog is the last gate, so it must say which store it is about to write to.

Add to `en.json` under `admin`: `"confirmInStore": "in {{store}}"`.
Add to `ar.json` under `admin`: `"confirmInStore": "في {{store}}"`.

In `src/pages/admin/hooks/useConfirmDialog.ts`, take the active store and append its name to the description passed to the dialog:

```ts
import { useStore } from "@/contexts/StoreContext";
import { useLanguage } from "@/contexts/LanguageContext";

// inside the hook:
const { store } = useStore();
const { t, isRTL } = useLanguage();
const storeName = isRTL ? store.labelAr : store.label;

// when building the confirm description, suffix it:
const describe = (base: string) =>
  `${base} ${t("admin.confirmInStore").replace("{{store}}", storeName)}`;
```

Apply `describe()` to the description of every delete confirmation the hook raises, so the copy reads e.g. "Delete Xerjoff Coro? in Shama Dupes".

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, log in.
Expected: opening a product form and then trying to switch stores shows the blocked toast and the store does not change; closing the form allows the switch. Deleting a product under Dupes shows a confirmation naming "Shama Dupes".

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin src/locales src/vite-env.d.ts
git commit -m "feat(admin): surface load failures and guard switching mid-edit"
```

---

### Task 9: End-to-end test

**Files:**
- Create: `tests/e2e/admin-store-switch.spec.ts`

**Interfaces:**
- Consumes: the finished UI from Tasks 5–8.
- Produces: nothing.

Pattern-match `tests/e2e/admin-influencers.spec.ts` — it already handles the `admin.localhost:5173` host and the `AdminLoginGate`.

- [ ] **Step 1: Write the test**

```ts
/**
 * The admin app is served on the admin.* host (see src/main.tsx), so these
 * tests target admin.localhost rather than the storefront origin.
 */
import { test, expect } from "@playwright/test";

const ADMIN_BASE = "http://admin.localhost:5173";

test.describe("admin store switcher", () => {
  test("starts on Shama with influencers available", async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await expect(page.getByRole("button", { name: /Shama/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Influencers|المؤثرين/ })).toBeVisible();
  });

  test("hides influencers after switching to the dupes store", async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await page.getByRole("button", { name: /Shama/ }).click();
    await page.getByRole("menuitem", { name: /Shama Dupes|شمة البدائل/ }).click();
    await expect(page.getByRole("link", { name: /Influencers|المؤثرين/ })).toHaveCount(0);
  });

  test("redirects /influencers to the overview under the dupes store", async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await page.getByRole("button", { name: /Shama/ }).click();
    await page.getByRole("menuitem", { name: /Shama Dupes|شمة البدائل/ }).click();
    await page.goto(`${ADMIN_BASE}/influencers`);
    await expect(page).toHaveURL(`${ADMIN_BASE}/`);
  });

  test("remembers the selected store across a reload", async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await page.getByRole("button", { name: /Shama/ }).click();
    await page.getByRole("menuitem", { name: /Shama Dupes|شمة البدائل/ }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: /Shama Dupes|شمة البدائل/ })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/e2e/admin-store-switch.spec.ts`
Expected: PASS. If the login gate blocks, mirror the auth setup in `admin-influencers.spec.ts`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin-store-switch.spec.ts
git commit -m "test(admin): cover switching between the two stores"
```

---

### Task 10: Verify against both live databases

**Files:** none (verification only).

**Interfaces:**
- Consumes: the complete feature.
- Produces: nothing.

Tests prove the UI reacts. This task proves writes land in the **right database** — the one thing a green test suite cannot tell you.

- [ ] **Step 1: Full check**

```bash
npm run test:unit && npx tsc -b --noEmit && npm run lint && npm run build
```

Expected: all pass.

- [ ] **Step 2: Edit one product per store**

Run `npm run dev`, log into `http://admin.localhost:5173/`.

Under **Shama**: edit any product's stock quantity, save.
Switch to **Dupes**: edit a different product's stock quantity, save.

- [ ] **Step 3: Confirm each write hit the correct project**

For each edit, query both projects and confirm the change appears in exactly one:

```bash
# main project
curl -s "$VITE_SUPABASE_URL/rest/v1/perfumes?select=name,stock_quantity&name=eq.<NAME>" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"

# dupes project
curl -s "$VITE_DUPES_SUPABASE_URL/rest/v1/perfumes?select=name,stock_quantity&name=eq.<NAME>" \
  -H "apikey: $VITE_DUPES_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_DUPES_SUPABASE_ANON_KEY"
```

Expected: the Shama edit appears only in the main project; the Dupes edit only in the dupes project. **If a write lands in the wrong project, stop — that is a data-corruption bug, not a polish item.**

- [ ] **Step 4: Confirm no cross-store leakage on switch**

Switch stores back and forth on the Products screen. The list must fully replace each time — no rows from the other store, however briefly.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(admin): corrections from cross-store verification"
```

---

## Deployment note

This ships in the normal store build. After merging:

```bash
bash scripts/build-deploy.sh
```

Extract `shama-admin-cpanel.zip` into `/home/shamaly/admin`. The Dupes storefront and its own admin are unaffected.

`dupes-admin.shama.ly` is **not needed** — this design supersedes it. Skip that DNS/cPanel/SSL work.
