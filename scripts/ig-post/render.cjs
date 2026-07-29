#!/usr/bin/env node
/**
 * Render the generated Instagram-post HTML into saveable PNG images.
 *
 *   node scripts/ig-post/render.js                 # every .html in out/
 *   node scripts/ig-post/render.js <slug|file>...  # only these
 *
 * Each HTML holds a 3-slide carousel (each slide = a `.post`, sized with
 * container-query units). We force every `.post` to a fixed 1080px width so the
 * `cqw` layout resolves at true Instagram size, then screenshot the element ->
 * <slug>-1.png / -2.png / -3.png in out/png/.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "out");
const PNG = path.join(OUT, "png");
const SIZE = 1080;

function resolveTargets(argv) {
  const all = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join(OUT, f));
  if (!argv.length) return all;
  return argv.map((a) => {
    if (fs.existsSync(a)) return path.resolve(a);
    const slug = a.replace(/\.html$/, "");
    const hit = all.find((f) => path.basename(f, ".html") === slug);
    if (!hit) throw new Error(`no HTML for "${a}" in ${OUT}`);
    return hit;
  });
}

async function main() {
  const targets = resolveTargets(process.argv.slice(2));
  fs.mkdirSync(PNG, { recursive: true });

  // Use the installed system Chrome (channel) so no Playwright browser download
  // is needed — falls back to the bundled chromium if Chrome isn't present.
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }
  const page = await browser.newPage({
    viewport: { width: SIZE + 80, height: SIZE + 80 },
    deviceScaleFactor: 2, // crisp 2160px source downscales clean; IG re-compresses anyway
  });

  for (const file of targets) {
    const slug = path.basename(file, ".html");
    await page.goto("file://" + file, { waitUntil: "networkidle" });
    // Break the horizontal rail; pin each slide to true 1080px.
    await page.addStyleTag({
      content: `.rail{max-width:none!important;overflow:visible!important}
                .post{width:${SIZE}px!important;flex:0 0 ${SIZE}px!important}`,
    });
    await page.waitForTimeout(150); // let webfonts/data-URI paint settle

    const posts = page.locator(".post");
    const n = await posts.count();
    for (let i = 0; i < n; i++) {
      const dest = path.join(PNG, `${slug}-${i + 1}.png`);
      await posts.nth(i).screenshot({ path: dest });
    }
    console.log(`OK  ${slug}  ->  ${n} slides`);
  }

  await browser.close();
  console.log(`\nSaved to ${PNG}`);
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
