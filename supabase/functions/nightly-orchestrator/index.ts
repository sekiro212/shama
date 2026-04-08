import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

serve(async (_req) => {
  const supabase = getServiceClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const log: string[] = [];

  try {
    // 1. Read processing metadata
    const { data: meta } = await supabase
      .from("processing_metadata")
      .select("key, value")
      .in("key", ["last_profile_analysis", "last_digest_run", "last_reengagement_check"]);

    const metaMap: Record<string, Record<string, string>> = {};
    for (const m of meta || []) {
      metaMap[m.key] = m.value;
    }

    const lastAnalysis = metaMap.last_profile_analysis?.timestamp || "2000-01-01T00:00:00Z";
    const lastWeekly = metaMap.last_digest_run?.weekly || "2000-01-01T00:00:00Z";
    const lastMonthly = metaMap.last_digest_run?.monthly || "2000-01-01T00:00:00Z";
    const lastReengagement = metaMap.last_reengagement_check?.timestamp || "2000-01-01T00:00:00Z";

    // 2. Find users with new events since last analysis
    const { data: usersWithEvents } = await supabase
      .from("user_events")
      .select("user_id")
      .gt("created_at", lastAnalysis)
      .order("user_id");

    const uniqueUserIds = [...new Set((usersWithEvents || []).map((e) => e.user_id))];
    log.push(`Users with new events: ${uniqueUserIds.length}`);

    // 3. Batch users and call analyze-user-profile
    const batchSize = 10;
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/analyze-user-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ user_ids: batch }),
        });
        const result = await res.json();
        log.push(`Batch ${i / batchSize + 1}: ${JSON.stringify(result.results?.map((r: { user_id: string; success: boolean }) => r.success))}`);
      } catch (err) {
        log.push(`Batch ${i / batchSize + 1} failed: ${err}`);
      }
    }

    // 4. Check for new products since last analysis
    const { data: newProducts } = await supabase
      .from("perfumes")
      .select("id")
      .gt("created_at", lastAnalysis)
      .eq("is_active", true);

    if (newProducts && newProducts.length > 0) {
      log.push(`New products found: ${newProducts.length}`);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/match-new-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ product_ids: newProducts.map((p) => p.id) }),
        });
        const result = await res.json();
        log.push(`Product matching: ${result.matched || 0} emails queued`);
      } catch (err) {
        log.push(`Product matching failed: ${err}`);
      }
    }

    // 5. Check digest schedule
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday
    const dayOfMonth = now.getUTCDate();

    // Weekly digest on Sundays
    if (dayOfWeek === 0) {
      const weekAgo = new Date(lastWeekly);
      if (now.getTime() - weekAgo.getTime() > 6 * 24 * 60 * 60 * 1000) {
        log.push("Generating weekly digest emails...");
        await generateDigestEmails(supabase, supabaseUrl, serviceKey, "weekly_digest", log);
        await supabase
          .from("processing_metadata")
          .update({ value: { weekly: now.toISOString(), monthly: lastMonthly } })
          .eq("key", "last_digest_run");
      }
    }

    // Monthly digest on 1st
    if (dayOfMonth === 1) {
      const monthAgo = new Date(lastMonthly);
      if (now.getTime() - monthAgo.getTime() > 25 * 24 * 60 * 60 * 1000) {
        log.push("Generating monthly digest emails...");
        await generateDigestEmails(supabase, supabaseUrl, serviceKey, "monthly_digest", log);
        await supabase
          .from("processing_metadata")
          .update({ value: { weekly: lastWeekly, monthly: now.toISOString() } })
          .eq("key", "last_digest_run");
      }
    }

    // 6. Re-engagement check
    const reengagementThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const lastReCheck = new Date(lastReengagement);
    if (now.getTime() - lastReCheck.getTime() > 24 * 60 * 60 * 1000) {
      log.push("Checking re-engagement candidates...");
      await generateReEngagementEmails(supabase, supabaseUrl, serviceKey, reengagementThreshold, log);
      await supabase
        .from("processing_metadata")
        .update({ value: { timestamp: now.toISOString() } })
        .eq("key", "last_reengagement_check");
    }

    // 7. Update last analysis timestamp
    await supabase
      .from("processing_metadata")
      .update({ value: { timestamp: now.toISOString() } })
      .eq("key", "last_profile_analysis");

    // 8. Trigger email queue processing
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: "{}",
      });
      log.push("Email queue processing triggered");
    } catch (err) {
      log.push(`Email queue trigger failed: ${err}`);
    }

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), log }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function generateDigestEmails(
  supabase: ReturnType<typeof getServiceClient>,
  supabaseUrl: string,
  serviceKey: string,
  emailType: "weekly_digest" | "monthly_digest",
  log: string[]
) {
  const prefField = emailType === "weekly_digest" ? "weekly_digest" : "monthly_digest";

  // Find users with profiles who opted in
  const { data: eligibleUsers } = await supabase
    .from("email_preferences")
    .select("user_id, language_pref")
    .eq("email_enabled", true)
    .eq(prefField, true);

  if (!eligibleUsers || eligibleUsers.length === 0) {
    log.push(`No users opted in for ${emailType}`);
    return;
  }

  // Get profiles for these users
  const userIds = eligibleUsers.map((u) => u.user_id);
  const { data: profiles } = await supabase
    .from("user_taste_profiles")
    .select("user_id, scent_families, preferred_notes, gender_pref, price_range")
    .in("user_id", userIds)
    .gt("total_events_analyzed", 0);

  if (!profiles || profiles.length === 0) {
    log.push("No profiles with data for digest");
    return;
  }

  // Get top products
  const { data: products } = await supabase
    .from("perfumes")
    .select("id, name, price, gender, rating, images:perfume_images(image_url)")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .order("rating", { ascending: false })
    .limit(20);

  if (!products || products.length === 0) return;

  // For each eligible user with a profile, queue a digest
  for (const profile of profiles) {
    const userPref = eligibleUsers.find((u) => u.user_id === profile.user_id);
    if (!userPref) continue;

    // Get user email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
    if (!authUser?.user?.email) continue;

    // Pick top 3 products (simple matching by top scent family)
    const topProducts = products.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.images?.[0]?.image_url || "",
    }));

    const period = emailType === "weekly_digest" ? "week" : "month";
    const subjectEn = `Your fragrance picks this ${period}`;
    const subjectAr = `اختياراتك العطرية لهذا ${period === "week" ? "الأسبوع" : "الشهر"}`;

    // Generate promo code
    const { generatePromoCode } = await import("../_shared/promo-generator.ts");
    const promo = await generatePromoCode(supabase, 10, 7);

    // Build email HTML
    const { buildDigestEmail } = await import("../_shared/email-templates.ts");
    const siteUrl = "https://shama-perfumes.netlify.app";
    const unsubUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=placeholder`;

    const bodyEn = buildDigestEmail(
      topProducts.map((p) => ({ ...p, reason: "Matches your taste profile" })),
      promo?.code || "SHAMA10",
      10,
      siteUrl,
      "en",
      unsubUrl,
      emailType === "weekly_digest" ? "weekly" : "monthly"
    );
    const bodyAr = buildDigestEmail(
      topProducts.map((p) => ({ ...p, reason: "يتوافق مع ذوقك العطري" })),
      promo?.code || "SHAMA10",
      10,
      siteUrl,
      "ar",
      unsubUrl,
      emailType === "weekly_digest" ? "weekly" : "monthly"
    );

    await supabase.from("email_queue").insert({
      user_id: profile.user_id,
      email_type: emailType,
      to_email: authUser.user.email,
      subject_en: subjectEn,
      subject_ar: subjectAr,
      body_html_en: bodyEn,
      body_html_ar: bodyAr,
      product_ids: topProducts.map((p) => p.id),
      promo_code_id: promo?.id || null,
    });
  }

  log.push(`Queued ${profiles.length} ${emailType} emails`);
}

async function generateReEngagementEmails(
  supabase: ReturnType<typeof getServiceClient>,
  _supabaseUrl: string,
  _serviceKey: string,
  threshold: string,
  log: string[]
) {
  // Find users who haven't had events in 30+ days
  const { data: staleProfiles } = await supabase
    .from("user_taste_profiles")
    .select("user_id, last_event_at")
    .lt("last_event_at", threshold)
    .gt("total_events_analyzed", 0);

  if (!staleProfiles || staleProfiles.length === 0) {
    log.push("No re-engagement candidates");
    return;
  }

  // Check email preferences
  const userIds = staleProfiles.map((p) => p.user_id);
  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("user_id, language_pref")
    .eq("email_enabled", true)
    .eq("re_engagement", true)
    .in("user_id", userIds);

  if (!prefs || prefs.length === 0) return;

  // Check we haven't sent a re-engagement email in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentEmails } = await supabase
    .from("email_log")
    .select("user_id")
    .eq("email_type", "re_engagement")
    .gt("sent_at", thirtyDaysAgo)
    .in("user_id", userIds);

  const recentEmailUserIds = new Set((recentEmails || []).map((e) => e.user_id));
  const eligibleUsers = prefs.filter((p) => !recentEmailUserIds.has(p.user_id));

  if (eligibleUsers.length === 0) return;

  // Get trending products
  const { data: products } = await supabase
    .from("perfumes")
    .select("id, name, price, images:perfume_images(image_url)")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!products || products.length === 0) return;

  const { generatePromoCode } = await import("../_shared/promo-generator.ts");
  const { buildReEngagementEmail } = await import("../_shared/email-templates.ts");
  const siteUrl = "https://shama-perfumes.netlify.app";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  for (const userPref of eligibleUsers) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userPref.user_id);
    if (!authUser?.user?.email) continue;

    const promo = await generatePromoCode(supabase, 15, 7);
    const topProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.images?.[0]?.image_url || "",
    }));

    const unsubUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=placeholder`;

    const bodyEn = buildReEngagementEmail(
      topProducts.map((p) => ({ ...p, reason: "Trending at Shama right now" })),
      promo?.code || "SHAMA15",
      15,
      siteUrl,
      "en",
      unsubUrl
    );
    const bodyAr = buildReEngagementEmail(
      topProducts.map((p) => ({ ...p, reason: "الأكثر رواجاً في شمة الآن" })),
      promo?.code || "SHAMA15",
      15,
      siteUrl,
      "ar",
      unsubUrl
    );

    await supabase.from("email_queue").insert({
      user_id: userPref.user_id,
      email_type: "re_engagement",
      to_email: authUser.user.email,
      subject_en: "We miss you! Come discover what's new",
      subject_ar: "اشتقنا لك! تعال واكتشف الجديد",
      body_html_en: bodyEn,
      body_html_ar: bodyAr,
      product_ids: topProducts.map((p) => p.id),
      promo_code_id: promo?.id || null,
    });
  }

  log.push(`Queued ${eligibleUsers.length} re-engagement emails`);
}
