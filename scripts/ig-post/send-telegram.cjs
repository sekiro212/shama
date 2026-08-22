#!/usr/bin/env node
/**
 * Send the rendered IG-post PNGs to a Telegram chat, one album (media group)
 * per product — its 3 slides grouped, captioned with the product name.
 *
 *   node scripts/ig-post/send-telegram.cjs            # every product in out/png
 *   node scripts/ig-post/send-telegram.cjs <slug>...  # only these
 *
 * Reads TELEGRAM_BOT_TOKEN + ADMIN_CHAT_IDS from telegram-bot/.env.
 */
const fs = require("fs");
const path = require("path");

const PNG = path.join(__dirname, "out", "png");
const ENV = path.join(__dirname, "..", "..", "telegram-bot", ".env");

function readEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const env = readEnv(ENV);
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.ADMIN_CHAT_IDS.split(",")[0].trim();
  if (!token || !chat) throw new Error("missing TELEGRAM_BOT_TOKEN / ADMIN_CHAT_IDS");

  const files = fs.readdirSync(PNG).filter((f) => f.endsWith(".png"));
  // group by product slug (strip trailing -1/-2/-3)
  const groups = {};
  for (const f of files) {
    const slug = f.replace(/-\d+\.png$/, "");
    (groups[slug] ||= []).push(f);
  }
  let slugs = Object.keys(groups).sort();
  const argv = process.argv.slice(2);
  // --first sends only slide 1 of each product, for contact-sheet style sends
  // where the cover is the point and the rest is noise.
  const firstOnly = argv.includes("--first");
  const want = argv.filter((a) => !a.startsWith("--"));
  if (want.length) slugs = slugs.filter((s) => want.includes(s));
  if (firstOnly) {
    for (const s of slugs) {
      groups[s] = groups[s].filter((f) => /-1\.png$/.test(f));
    }
  }

  const url = `https://api.telegram.org/bot${token}/sendMediaGroup`;
  // Telegram caps a media group at 10. An 11-slide cast carousel silently
  // failed every retry until it gave up, so split into chunks of 10 and label
  // each part.
  const MAX_GROUP = 10;
  const jobs = [];
  for (const slug of slugs) {
    const all = groups[slug].sort(); // -1, -2, -3 ...
    for (let i = 0; i < all.length; i += MAX_GROUP) {
      const part = all.slice(i, i + MAX_GROUP);
      const nparts = Math.ceil(all.length / MAX_GROUP);
      jobs.push({
        slug,
        imgs: part,
        label: nparts > 1 ? `${slug} (${i / MAX_GROUP + 1}/${nparts})` : slug,
      });
    }
  }

  for (const { slug, imgs, label } of jobs) {
    const form = new FormData();
    const media = imgs.map((f, i) => ({
      type: "photo",
      media: `attach://f${i}`,
      ...(i === 0 ? { caption: titleFromSlug(label) } : {}),
    }));
    form.append("chat_id", chat);
    form.append("media", JSON.stringify(media));
    imgs.forEach((f, i) => {
      const buf = fs.readFileSync(path.join(PNG, f));
      form.append(`f${i}`, new Blob([buf], { type: "image/png" }), f);
    });

    // send with retry on Telegram flood limits AND transient network errors
    let sent = false;
    for (let attempt = 0; attempt < 8 && !sent; attempt++) {
      try {
        const res = await fetch(url, { method: "POST", body: form });
        const json = await res.json();
        if (json.ok) {
          console.log(`OK   ${label}  (${imgs.length} slides)`);
          sent = true;
        } else if (json.parameters?.retry_after) {
          const wait = (json.parameters.retry_after + 1) * 1000;
          console.log(`WAIT ${label}: flood, retry in ${wait / 1000}s`);
          await sleep(wait);
        } else {
          console.error(`FAIL ${label}: ${json.description}`);
          break; // non-retryable Telegram rejection
        }
      } catch (e) {
        console.log(`NETERR ${label}: ${e.message} — retry ${attempt + 1}/8`);
        await sleep(3000 * (attempt + 1)); // linear backoff on network blips
      }
    }
    if (!sent) console.error(`GAVEUP ${label}`);
    await sleep(1500); // stay under album rate limits
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
