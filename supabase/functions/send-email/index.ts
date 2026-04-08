import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MONTHLY_LIMIT = 2800;
const BATCH_SIZE = 10;
const FROM_EMAIL = "Shama Perfumes <noreply@shama-perfumes.com>";

serve(async (_req) => {
  const supabase = getServiceClient();

  try {
    // Budget guard: check monthly send count
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: monthlySent } = await supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", monthStart.toISOString());

    if ((monthlySent || 0) >= MONTHLY_LIMIT) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Monthly send limit reached", count: monthlySent }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const remaining = MONTHLY_LIMIT - (monthlySent || 0);
    const limit = Math.min(BATCH_SIZE, remaining);

    // Fetch pending email jobs
    const { data: jobs, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError || !jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No pending emails" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Mark as sending
    const jobIds = jobs.map((j) => j.id);
    await supabase
      .from("email_queue")
      .update({ status: "sending" })
      .in("id", jobIds);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      try {
        // Check email preferences
        const { data: prefs } = await supabase
          .from("email_preferences")
          .select("email_enabled, language_pref, unsubscribe_token")
          .eq("user_id", job.user_id)
          .single();

        if (!prefs || !prefs.email_enabled) {
          await supabase
            .from("email_queue")
            .update({ status: "skipped" })
            .eq("id", job.id);
          skipped++;
          continue;
        }

        // Select correct language
        const lang = prefs.language_pref === "ar" ? "ar" : "en";
        const subject = lang === "ar" ? job.subject_ar : job.subject_en;
        const html = lang === "ar" ? job.body_html_ar : job.body_html_en;

        // Replace unsubscribe token placeholder
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const unsubUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=${prefs.unsubscribe_token}`;
        const finalHtml = html.replace(/token=placeholder/g, `token=${prefs.unsubscribe_token}`);

        // Send via Resend
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [job.to_email],
            subject,
            html: finalHtml,
          }),
        });

        if (!resendRes.ok) {
          const errText = await resendRes.text();
          throw new Error(`Resend error ${resendRes.status}: ${errText}`);
        }

        const resendData = await resendRes.json();

        // Mark as sent
        await supabase
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", job.id);

        // Log to email_log
        await supabase.from("email_log").insert({
          user_id: job.user_id,
          email_type: job.email_type,
          subject,
          product_ids: job.product_ids,
          promo_code_id: job.promo_code_id,
          resend_message_id: resendData.id || null,
        });

        sent++;
      } catch (err) {
        // Mark as failed, increment attempts
        await supabase
          .from("email_queue")
          .update({
            status: "pending",
            attempts: job.attempts + 1,
            error_message: String(err),
          })
          .eq("id", job.id);
        failed++;
      }

      // Small delay between sends
      await new Promise((r) => setTimeout(r, 100));
    }

    return new Response(
      JSON.stringify({ sent, failed, skipped, total: jobs.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
