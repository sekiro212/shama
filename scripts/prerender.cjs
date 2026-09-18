#!/usr/bin/env node
/**
 * Prerender the built SPA into static <route>/index.html snapshots — reproduces
 * the SSG structure of the old cPanel deploy, but with the CURRENT build's
 * assets + live content.
 *
 *   1. `npm run build`         (dist/ must exist)
 *   2. `npm run preview`       (serves dist on :4173) — start separately
 *   3. node scripts/prerender.cjs
 *
 * Crawls each route with Chrome (Playwright), waits for React to render + data
 * to load, and writes the resulting HTML to dist/<route>/index.html. The root
 * (home) snapshot is written LAST so the SPA fallback shell stays intact for the
 * whole crawl.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.PRERENDER_BASE || "http://localhost:4173";
const DIST = path.join(__dirname, "..", "dist");
const CONCURRENCY = 5;

// Product route is /product/:id (UUID) in the current app — NOT slug.
const PRODUCTS_ONLY = process.env.PRODUCTS_ONLY === "1";
const STATIC_ROUTES = PRODUCTS_ONLY
  ? []
  : [
      "about", "ai-finder", "collection", "contact", "cookies", "faq",
      "gift-sets", "privacy", "quiz", "returns", "reviews", "samples",
      "shipping", "terms",
    ];

function productSlugs() {
  return fs
    .readFileSync("/tmp/product-ids.txt", "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => `product/${id}`);
}

function writeSnapshot(route, html) {
  const dir = route === "" ? DIST : path.join(DIST, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

/**
 * Snapshot one route.
 *
 * Deliberately NOT `waitUntil: "networkidle"`: the app opens a Supabase
 * realtime socket that never closes, so idle frequently never fires and the
 * route dies on timeout. A run that way lost 150 of 325 pages — including the
 * home page — and still exited 0. Wait for React to paint real text instead,
 * then treat network quiet as a best-effort bonus.
 */
async function snapshot(page, route) {
  const url = `${BASE}/${route}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

  // React has mounted and painted something with actual content in it.
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return !!root && root.children.length > 0 && document.body.innerText.trim().length > 200;
    },
    null,
    { timeout: 45000 }
  );

  // Data fetches usually settle right after paint; if the realtime socket keeps
  // the connection busy, carry on rather than failing the page.
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return page.content();
}

/** One retry: most failures here are load-contention timeouts, not bad routes. */
async function snapshotWithRetry(page, route) {
  try {
    return await snapshot(page, route);
  } catch (e) {
    await page.waitForTimeout(1500);
    return await snapshot(page, route);
  }
}

async function main() {
  const routes = [...STATIC_ROUTES, ...productSlugs()]; // root handled last
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  let done = 0, fail = 0;
  const queue = [...routes];
  async function worker(id) {
    const page = await ctx.newPage();
    while (queue.length) {
      const route = queue.shift();
      try {
        const html = await snapshotWithRetry(page, route);
        writeSnapshot(route, html);
        done++;
      } catch (e) {
        fail++;
        console.error(`FAIL ${route}: ${e.message.split("\n")[0]}`);
      }
      if ((done + fail) % 20 === 0) console.log(`  ${done + fail}/${routes.length} (ok=${done} fail=${fail})`);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  // root LAST — overwrites the SPA shell with a prerendered home page
  if (!PRODUCTS_ONLY) {
    const page = await ctx.newPage();
    try {
      writeSnapshot("", await snapshotWithRetry(page, ""));
      done++;
      console.log("  root (home) snapshot written");
    } catch (e) {
      console.error(`FAIL root: ${e.message.split("\n")[0]}`);
      fail++;
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nPRERENDER done: ${done} pages, ${fail} failed`);

  // Exit non-zero on any failure so build-deploy.sh (set -e) refuses to zip a
  // half-rendered site. Shipping one is an SEO regression that is invisible
  // until search traffic drops.
  if (fail > 0) {
    console.error(`PRERENDER INCOMPLETE: ${fail} route(s) failed — not safe to deploy`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
