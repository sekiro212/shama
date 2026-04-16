# Admin Subdomain Setup on Libyan Spider cPanel

This guide walks you through publishing the Shama admin panel at `admin.shama.ly` on the same Libyan Spider cPanel account that already serves the public storefront at `shama.ly`. The same `dist/` build is deployed to both document roots; the React app picks the correct view at runtime based on the hostname.

## Prerequisites

- Working cPanel login for your Libyan Spider account (URL, username, password).
- The main site `shama.ly` is already live on this account and resolving over HTTPS.
- `npm run build` runs cleanly on your local machine and produces a populated `dist/` directory.

## Step 1: Create the subdomain in cPanel

Open cPanel and look for the **Domains** section.

**Modern cPanel (Jupiter theme):**

1. Click **Domains** -> **Create A New Domain**.
2. In the **Domain** field, enter `admin.shama.ly`.
3. Uncheck **Share document root** so cPanel gives the subdomain its own folder.
4. The **Document Root** field will auto-fill with something like `/home/<cpuser>/admin.shama.ly` or `/home/<cpuser>/public_html/admin.shama.ly`.
5. Click **Submit**.

**Legacy cPanel (Paper Lantern theme):**

1. Click **Subdomains**.
2. **Subdomain**: `admin`.
3. **Domain**: select `shama.ly` from the dropdown.
4. **Document Root**: accept the default or change it to `/home/<cpuser>/admin.shama.ly`.
5. Click **Create**.

Write the exact document root path down. You will need it in Step 4.

## Step 2: Confirm DNS

If Libyan Spider manages your DNS inside cPanel:

1. Open **Domains** -> **Zone Editor**.
2. Find the row for `shama.ly` and click **Manage**.
3. Verify there is an `A` record for `admin` pointing to the same IP as the root `shama.ly` record. cPanel usually adds this automatically when the subdomain is created.

If your DNS is managed at the registrar (not in cPanel):

1. Log in to your domain registrar's DNS panel.
2. Add one of these records:
   - `A` record, host `admin`, value = the same IPv4 address as your existing `shama.ly` `A` record.
   - Or `CNAME` record, host `admin`, value = `shama.ly.` (with the trailing dot).

Verify propagation from your terminal:

```bash
dig admin.shama.ly +short
```

You should see the same IP address that `dig shama.ly +short` returns. Propagation is usually a few minutes but can take up to 24 hours.

## Step 3: Enable HTTPS with AutoSSL

The admin panel will not work over plain HTTP because the storefront and Supabase both use HTTPS, so this step is mandatory.

1. In cPanel, open **Security** -> **SSL/TLS Status**.
2. Locate the row for `admin.shama.ly`.
3. Tick the checkbox next to it.
4. Click **Run AutoSSL**.
5. Wait for the status to change from **Pending** to a green padlock.

If AutoSSL fails, the most common cause is that DNS has not yet propagated to Let's Encrypt's validation servers. Wait 5 to 10 minutes after Step 2 finishes, then click **Run AutoSSL** again. Two or three retries are normal on a fresh subdomain.

## Step 4: Deploy the built files

First, build locally:

```bash
npm run build
```

This produces a `dist/` directory containing `index.html`, `assets/`, and `.htaccess` (the SPA rewrite rule). You will upload the **contents** of `dist/` to two destinations:

- The main site root: `public_html/` (or whatever the document root for `shama.ly` is).
- The admin root from Step 1: e.g., `/home/<cpuser>/admin.shama.ly/`.

Do not upload the `dist` folder itself as a wrapper. Open it and select everything inside.

**Option A: cPanel File Manager**

1. Open **Files** -> **File Manager**.
2. Navigate to `public_html/`.
3. Delete the old build's files (keep `cgi-bin/`, `.well-known/`, and any other infra folders).
4. Click **Upload**, drag the contents of your local `dist/` folder, wait for green checkmarks.
5. Go back, navigate to the admin document root, repeat the upload there.
6. Confirm `.htaccess` appears in both locations. If File Manager hides it, click **Settings** in the top right and enable **Show Hidden Files (dotfiles)**.

**Option B: SFTP (FileZilla, Cyberduck, or similar)**

1. Connect using your cPanel username and password on port `22` (or the port your host specifies).
2. On the remote side, navigate to `public_html/` and upload the contents of local `dist/`.
3. Navigate to the admin document root and upload the contents of local `dist/` again.
4. Verify `.htaccess` is present in both folders.

## Step 5: Verify

Open a private/incognito window and check each URL:

1. `https://shama.ly` loads the storefront homepage.
2. `https://admin.shama.ly` loads the admin login dialog (not the cPanel default page, not a 404).
3. `https://shama.ly/admin` redirects to `https://admin.shama.ly` (the app handles this client-side).
4. Refresh on a deep link like `https://admin.shama.ly/dashboard` and confirm it does not return a 404. If it does, `.htaccess` is missing from the admin document root - re-upload it manually.

## Troubleshooting

- **Subdomain shows the cPanel default placeholder page.** The document root is empty or pointing somewhere else. Re-check Step 1 and re-upload the `dist/` contents to the exact path cPanel listed.
- **404 on admin subpaths after refresh.** `.htaccess` is missing or was filtered out by the upload. Re-upload `dist/.htaccess` and ensure hidden files are visible in File Manager.
- **AutoSSL fails with "DCV failure" or "DNS error".** DNS has not propagated to Let's Encrypt. Wait 10 minutes, run `dig admin.shama.ly +short` to confirm the IP resolves, then retry AutoSSL.
- **Browser shows mixed-content warnings.** Some asset is still being loaded over `http://`. Rebuild locally, confirm all URLs in `.env` and any hardcoded links use `https://`, and redeploy.
- **Admin login POST fails or hangs.** `VITE_SUPABASE_URL` in your local `.env` is wrong or pointing to the wrong project. Fix it, run `npm run build` again, and re-upload.
- **CSS or JS files return 404.** You uploaded the `dist` folder as a wrapper instead of its contents. Move the files up one level, or re-upload from inside `dist/`.

## Optional: symlink the admin root to the main root

If Libyan Spider allows symbolic links on your plan, you can avoid the double upload by pointing the admin document root at the main one. Open **Terminal** in cPanel (if available) and run:

```bash
rm -rf ~/admin.shama.ly
ln -s ~/public_html ~/admin.shama.ly
```

After this, every deploy to `public_html/` is automatically reflected at `admin.shama.ly`. Some shared plans disable symlinks for security; if the link is rejected or returns a 403 in the browser, delete it and fall back to the two-target upload from Step 4.

## Deployment checklist

Run this every time you deploy:

1. `npm run build`
2. Upload the **contents** of `dist/` to `public_html/`.
3. Upload the **contents** of `dist/` to the admin document root (skip if symlinked).
4. Confirm `.htaccess` is present in both locations.
5. Open `https://shama.ly` and `https://admin.shama.ly` in a private window and spot-check both.
