import { createClient } from "npm:@supabase/supabase-js@2";
import { loadEmailCfg, sendEmailWithFallback, sendViaResend, sendViaSmtp, type Provider } from "../_shared/emailSender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const toEmail: string = body?.to || userData.user.email!;
    const forced: Provider | undefined =
      body?.provider === "smtp" || body?.provider === "resend" ? body.provider : undefined;

    if (!toEmail) {
      return new Response(JSON.stringify({ error: "No recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const cfg = await loadEmailCfg(admin);

    const label = forced === "resend" ? "Resend" : forced === "smtp" ? "SMTP" : "Email";
    const input = {
      to: toEmail,
      subject: `Adventourist CMS — ${label} test email`,
      text:
        "This is a test email from the Adventourist CMS. If you received this, your email configuration is working correctly.",
      html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#1A1D2E">
        <h2 style="color:#FF6F4C;margin:0 0 12px">${label} test successful ✓</h2>
        <p>This is a test email from the <strong>Adventourist CMS</strong>.</p>
        <p style="color:#64748b;font-size:13px">If you received this message, your email configuration is working correctly.</p>
      </div>`,
    };

    let result: { success: boolean; provider?: Provider; messageId?: string; error?: string };
    if (forced === "smtp") {
      const r = await sendViaSmtp(cfg, input);
      result = { ...r, provider: "smtp" };
    } else if (forced === "resend") {
      const r = await sendViaResend(cfg, input);
      result = { ...r, provider: "resend" };
    } else {
      const o = await sendEmailWithFallback(cfg, input);
      result = { success: o.success, provider: o.provider, messageId: o.messageId, error: o.error };
    }

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || "Send failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, provider: result.provider, messageId: result.messageId, to: toEmail }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("send-test-email error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
