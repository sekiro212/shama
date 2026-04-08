import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(htmlPage("Invalid link", "رابط غير صالح", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("email_preferences")
    .update({ email_enabled: false })
    .eq("unsubscribe_token", token)
    .select("user_id")
    .single();

  if (error || !data) {
    return new Response(htmlPage("Link expired or invalid", "الرابط منتهي أو غير صالح", false), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(htmlPage(
    "You have been unsubscribed from Shama emails.",
    "تم إلغاء اشتراكك في رسائل شمة الإلكترونية.",
    true
  ), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

function htmlPage(messageEn: string, messageAr: string, success: boolean): string {
  const color = success ? "#5B8DD9" : "#e74c3c";
  const icon = success ? "&#10003;" : "&#10007;";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Shama - Email Preferences</title>
  <style>
    body { margin:0; padding:0; background:#F8F9FB; font-family:'Segoe UI',Tahoma,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh }
    .card { background:#fff; border-radius:16px; padding:48px 32px; text-align:center; max-width:400px; box-shadow:0 4px 24px rgba(0,0,0,0.08) }
    .icon { width:64px; height:64px; border-radius:50%; background:${color}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 24px }
    h1 { color:#323D50; font-size:24px; margin:0 0 16px; letter-spacing:1px }
    .en { color:#323D50; font-size:15px; margin:0 0 8px }
    .ar { color:#6B7B8D; font-size:14px; direction:rtl; margin:0 }
    .home { display:inline-block; margin-top:24px; color:#5B8DD9; text-decoration:none; font-size:14px }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>SHAMA</h1>
    <p class="en">${messageEn}</p>
    <p class="ar">${messageAr}</p>
    <a href="https://shama-perfumes.netlify.app" class="home">Back to Shama</a>
  </div>
</body>
</html>`;
}
