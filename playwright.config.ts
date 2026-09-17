import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:5179",
    // The storefront now opens in Arabic for everyone, but these specs select
    // elements by their English labels ("add to cart", "collection"). Seeding an
    // explicit English choice keeps them testing commerce behaviour instead of
    // translation strings; language.spec.ts clears this to assert the default.
    storageState: "tests/e2e/storage/english.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      // System Chrome, not the bundled chromium: this machine has no
      // ms-playwright download, and scripts/ig-post/render.cjs already
      // relies on the same channel.
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  // A dedicated, strict port on a server we start ourselves. Sahma Dupes is a
  // fork of this repo and defaults to Vite's 5173 too, so `reuseExistingServer`
  // on the default port meant the suite would quietly run against whichever
  // store happened to be up. strictPort makes a collision fail loudly instead.
  webServer: {
    command: "npm run dev -- --port 5179 --strictPort",
    url: "http://localhost:5179",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
