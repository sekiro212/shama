#!/bin/bash
# Quick test script for sending a marketing email via Resend API
# Usage: RESEND_API_KEY=re_xxx ./scripts/send-test-email.sh

TO_EMAIL="ninjaam2000@gmail.com"
FROM_EMAIL="Shama Perfumes <noreply@shama.ly>"
SUBJECT="Discover Shama — Luxury Perfumes Delivered to You"

if [ -z "$RESEND_API_KEY" ]; then
  echo "Error: RESEND_API_KEY is not set"
  echo "Usage: RESEND_API_KEY=re_xxx $0"
  exit 1
fi

HTML=$(cat <<'EMAILHTML'
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FB;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:24px;margin-bottom:24px">
  <tr>
    <td style="background:linear-gradient(135deg,#5B8DD9,#3E6BB5);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;letter-spacing:1px">SHAMA</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px;letter-spacing:3px">LUXURY PERFUMES</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px">
      <p style="color:#323D50;font-size:15px;margin:0 0 8px">Hi there,</p>
      <h2 style="color:#323D50;font-size:20px;margin:0 0 20px">Welcome to Shama Perfumes</h2>
      <p style="color:#6B7B8D;font-size:14px;line-height:1.6;margin:0 0 24px">
        Discover our curated collection of luxury fragrances — from fresh citrus to deep oriental ouds.
        Every scent is hand-picked to match your unique taste.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="https://shama.ly/collection" style="display:inline-block;background:linear-gradient(135deg,#5B8DD9,#3E6BB5);color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600">Explore Our Collection</a>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:linear-gradient(135deg,rgba(91,141,217,0.08),rgba(62,107,181,0.08));border:1px dashed #5B8DD9;border-radius:12px">
        <tr>
          <td style="padding:16px;text-align:center;color:#323D50;font-size:14px">
            Use code <strong>WELCOME10</strong> for 10% off your first order
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #eee">
      <p style="color:#999;font-size:11px;margin:0">Shama Perfumes &mdash; shama.ly</p>
    </td>
  </tr>
</table>
</body>
</html>
EMAILHTML
)

echo "Sending test email to $TO_EMAIL..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -d "$(jq -n \
    --arg from "$FROM_EMAIL" \
    --arg to "$TO_EMAIL" \
    --arg subject "$SUBJECT" \
    --arg html "$HTML" \
    '{from: $from, to: [$to], subject: $subject, html: $html}'
  )")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "Sent! Response: $BODY"
else
  echo "Failed (HTTP $HTTP_CODE): $BODY"
fi
