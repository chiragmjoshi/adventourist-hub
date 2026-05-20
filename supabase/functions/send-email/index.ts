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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow either a valid user JWT OR the service role key (for cron-triggered sends).
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isServiceCaller = bearer && bearer === serviceKey;

    if (!isServiceCaller) {
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
    }

    const body = await req.json().catch(() => ({}));
    const to: string = (body?.to || "").toString().trim();
    const subject: string = (body?.subject || "").toString();
    const html: string = (body?.html || "").toString();
    const text: string | undefined = body?.text ? String(body.text) : undefined;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject) {
      return new Response(JSON.stringify({ error: "Missing subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!html && !text) {
      return new Response(JSON.stringify({ error: "Missing email body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const fromAddress = cfg.email_from_address?.trim() || user;

    if (!host || !user || !pass) {
      return new Response(
        JSON.stringify({
          error:
            "SMTP not configured. Please set SMTP host, username and password in Settings → Email.",
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
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html: html || undefined,
      text: text || (html ? html.replace(/<[^>]+>/g, " ") : undefined),
    });

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId, to }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error)?.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});