#!/usr/bin/env bash
# Full cPanel deploy build: vite build -> prerender every route -> SEO files -> zip.
#
#   bash scripts/build-deploy.sh
#
# Output: shama-dist-cpanel.zip (upload + extract into public_html, and into the
# admin.shama.ly document root — one build serves both via the hostname switch
# in src/main.tsx).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "=== 1/6 build ==="
npm run build 2>&1 | tail -3
# Keep vite's raw SPA shell — the admin subdomain must NOT get the prerendered
# storefront home page (it would flash the store before AdminApp boots).
cp dist/index.html /tmp/raw-index.html

echo "=== 2/6 fetch product ids (route is /product/:id — UUID, not slug) ==="
python3 - <<'PY'
import re, json, urllib.request, urllib.parse
env = {}
for line in open('.env'):
    m = re.match(r'\s*([A-Z_]+)\s*=\s*(.*)', line)
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"\'')
base, key = env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']
q = {'select': 'id', 'order': 'name.asc', 'limit': '2000'}
u = base.rstrip('/') + '/rest/v1/perfumes?' + urllib.parse.urlencode(q)
req = urllib.request.Request(u, headers={'apikey': key, 'Authorization': 'Bearer ' + key})
ids = [r['id'] for r in json.load(urllib.request.urlopen(req, timeout=30)) if r.get('id')]
open('/tmp/product-ids.txt', 'w').write('\n'.join(ids) + '\n')
print(f'  {len(ids)} products')
PY

echo "=== 3/6 preview server ==="
npm run preview >/tmp/preview.log 2>&1 &
PREVIEW_PID=$!
trap 'kill $PREVIEW_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf -o /dev/null http://localhost:4173/ && break; sleep 0.5; done
echo "  up"

echo "=== 4/6 prerender ==="
node scripts/prerender.cjs 2>&1 | tail -4

echo "=== 5/6 prune inactive products + SEO files ==="
# Inactive products render "Product Not Found" (fetchProductById filters is_active) — don't ship them.
PRUNED=0
while IFS= read -r f; do rm -rf "$(dirname "$f")"; PRUNED=$((PRUNED+1)); done < <(grep -rl 'Product Not Found' dist/product 2>/dev/null || true)
echo "  pruned $PRUNED inactive product pages, $(find dist/product -name index.html | wc -l | tr -d ' ') remain"

# SEO/static files are not produced by vite — they live in scripts/deploy-static/
cp scripts/deploy-static/.htaccess scripts/deploy-static/robots.txt \
   scripts/deploy-static/llms.txt scripts/deploy-static/og-default.jpg \
   scripts/deploy-static/sitemap.xml dist/

ls -d dist/product/*/ | xargs -n1 basename > /tmp/active-ids.txt
python3 - <<'PY'
ids = [l.strip() for l in open('/tmp/active-ids.txt') if l.strip()]
import datetime, os
today = os.environ.get('SITEMAP_DATE') or datetime.date.today().isoformat()
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for i in ids:
    out += ['  <url>', f'    <loc>https://shama.ly/product/{i}</loc>',
            f'    <lastmod>{today}</lastmod>', '    <changefreq>weekly</changefreq>',
            '    <priority>0.8</priority>', '  </url>']
out.append('</urlset>')
open('dist/sitemap-products.xml', 'w').write('\n'.join(out) + '\n')
print(f'  sitemap-products.xml: {len(ids)} urls')
PY

echo "=== 6/6 zip (store + admin) ==="
find dist -name .DS_Store -delete

# --- store zip: public_html ---
rm -f shama-dist-cpanel.zip
(cd dist && zip -rq ../shama-dist-cpanel.zip . -x '.DS_Store' -x '*/.DS_Store')
cp shama-dist-cpanel.zip ~/Desktop/shama-dist-cpanel.zip

# --- admin zip: /home/<user>/admin (admin.shama.ly docroot) ---
# Same bundle — src/main.tsx renders AdminApp when hostname starts with "admin.".
# Only needs the raw SPA shell + assets + SPA-routing .htaccess.
rm -rf /tmp/admin-dist && mkdir -p /tmp/admin-dist
cp -R dist/assets /tmp/admin-dist/
cp /tmp/raw-index.html /tmp/admin-dist/index.html
cp scripts/deploy-static/.htaccess /tmp/admin-dist/.htaccess
rm -f shama-admin-cpanel.zip
(cd /tmp/admin-dist && zip -rq "$ROOT/shama-admin-cpanel.zip" . -x '.DS_Store' -x '*/.DS_Store')
cp shama-admin-cpanel.zip ~/Desktop/shama-admin-cpanel.zip

echo "  store: $(ls -lh shama-dist-cpanel.zip | awk '{print $5}') -> ~/Desktop/shama-dist-cpanel.zip"
echo "  admin: $(ls -lh shama-admin-cpanel.zip | awk '{print $5}') -> ~/Desktop/shama-admin-cpanel.zip"
echo "DEPLOY-BUILD-DONE"
