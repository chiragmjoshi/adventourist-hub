import nodemailer from "npm:nodemailer@6.9.14";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Validate JWT
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
    if (!toEmail) {
      return new Response(JSON.stringify({ error: "No recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load SMTP settings using service role (bypass RLS)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: rows, error: settingsErr } = await admin
      .from("automation_settings")
      .select("key,value")
      .in("key", [
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "email_from_name",
        "email_from_address",
      ]);

    if (settingsErr) throw settingsErr;

    const cfg: Record<string, string> = {};
    for (const r of rows ?? []) cfg[r.key] = r.value ?? "";

    const host = cfg.smtp_host?.trim();
    const port = parseInt(cfg.smtp_port || "587", 10);
    const user = cfg.smtp_username?.trim();
    const pass = cfg.smtp_password?.trim();
    const fromName = cfg.email_from_name?.trim() || "Adventourist";
    const fromAddress =
      cfg.email_from_address?.trim() || user;

    if (!host || !user || !pass) {
      return new Response(
        JSON.stringify({
          error:
            "SMTP not configured. Please set SMTP host, username and password, then click Save.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587/STARTTLS
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: toEmail,
      subject: "Adventourist CMS — SMTP test email",
      text:
        "This is a test email from the Adventourist CMS. If you received this, your SMTP configuration is working correctly.",
      html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#1A1D2E">
        <h2 style="color:#FF6F4C;margin:0 0 12px">SMTP test successful ✓</h2>
        <p>This is a test email from the <strong>Adventourist CMS</strong>.</p>
        <p style="color:#64748b;font-size:13px">If you received this message, your SMTP configuration is working correctly.</p>
      </div>`,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId, to: toEmail }),
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