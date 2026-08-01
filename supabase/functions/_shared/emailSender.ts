// Shared email dispatcher: SMTP (nodemailer) + Resend (via Lovable connector gateway)
import nodemailer from "npm:nodemailer@6.9.14";

export type Provider = "smtp" | "resend";

export interface EmailCfg {
  smtp_host?: string;
  smtp_port?: string;
  smtp_username?: string;
  smtp_password?: string;
  email_from_name?: string;
  email_from_address?: string;
  resend_from_address?: string;
  email_provider?: string;
}

export interface SendInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendOutcome {
  success: boolean;
  provider?: Provider;
  messageId?: string;
  error?: string;
  attempts: { provider: Provider; success: boolean; error?: string }[];
}

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

export function fromHeader(cfg: EmailCfg, address?: string) {
  const name = (cfg.email_from_name || "Adventourist").trim();
  const addr = (address || cfg.email_from_address || cfg.smtp_username || "").trim();
  return { name, addr, header: `"${name}" <${addr}>` };
}

export function smtpConfigured(cfg: EmailCfg) {
  return !!(cfg.smtp_host?.trim() && cfg.smtp_username?.trim() && cfg.smtp_password?.trim());
}

export function resendConfigured() {
  return !!(Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("RESEND_API_KEY"));
}

export async function sendViaSmtp(cfg: EmailCfg, input: SendInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!smtpConfigured(cfg)) return { success: false, error: "SMTP not configured" };
  try {
    const port = parseInt(cfg.smtp_port || "587", 10);
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host!.trim(),
      port,
      secure: port === 465,
      auth: { user: cfg.smtp_username!.trim(), pass: cfg.smtp_password!.trim() },
    });
    const info = await transporter.sendMail({
      from: fromHeader(cfg).header,
      to: input.to,
      subject: input.subject,
      html: input.html || undefined,
      text: input.text || (input.html ? input.html.replace(/<[^>]+>/g, " ") : undefined),
    });
    return { success: true, messageId: info.messageId };
  } catch (e) {
    return { success: false, error: (e as Error)?.message || String(e) };
  }
}

export async function sendViaResend(cfg: EmailCfg, input: SendInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) return { success: false, error: "Resend not connected" };
  const { addr, header } = fromHeader(cfg, cfg.resend_from_address);
  if (!addr) return { success: false, error: "Resend from address not set" };
  try {
    const res = await fetch(`${RESEND_GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: header,
        to: [input.to],
        subject: input.subject,
        html: input.html || undefined,
        text: input.text || (input.html ? undefined : " "),
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      console.error(`Resend gateway failed [${res.status}]: ${bodyText}`);
      return { success: false, error: `Resend ${res.status}: ${bodyText.slice(0, 300)}` };
    }
    let id: string | undefined;
    try { id = JSON.parse(bodyText)?.id; } catch { /* ignore */ }
    return { success: true, messageId: id };
  } catch (e) {
    return { success: false, error: (e as Error)?.message || String(e) };
  }
}

export function providerOrder(cfg: EmailCfg): Provider[] {
  switch ((cfg.email_provider || "smtp").trim()) {
    case "resend":
      return ["resend"];
    case "resend_smtp":
      return ["resend", "smtp"];
    case "smtp_resend":
      return ["smtp", "resend"];
    default:
      return ["smtp"];
  }
}

export async function sendEmailWithFallback(cfg: EmailCfg, input: SendInput): Promise<SendOutcome> {
  const attempts: SendOutcome["attempts"] = [];
  for (const p of providerOrder(cfg)) {
    const r = p === "smtp" ? await sendViaSmtp(cfg, input) : await sendViaResend(cfg, input);
    attempts.push({ provider: p, success: r.success, error: r.error });
    if (r.success) return { success: true, provider: p, messageId: r.messageId, attempts };
  }
  return {
    success: false,
    error: attempts.map((a) => `${a.provider}: ${a.error}`).join(" | ") || "No email provider configured",
    attempts,
  };
}

export const EMAIL_SETTING_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_username",
  "smtp_password",
  "email_from_name",
  "email_from_address",
  "resend_from_address",
  "email_provider",
];

export async function loadEmailCfg(admin: any): Promise<EmailCfg> {
  const { data, error } = await admin
    .from("automation_settings")
    .select("key,value")
    .in("key", EMAIL_SETTING_KEYS);
  if (error) throw error;
  const cfg: Record<string, string> = {};
  for (const r of data ?? []) cfg[r.key] = r.value ?? "";
  return cfg as EmailCfg;
}
