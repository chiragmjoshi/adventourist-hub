// Branded HTML shell for Adventourist automation emails.
// Wraps any rendered body (plain text or HTML) in a brand-consistent,
// table-based, email-client safe template. No external deps.

export type AccentColor = "blaze" | "horizon" | "lagoon" | "ridge";

export interface BrandShellOptions {
  heroTitle: string;
  heroSubtitle?: string;
  bodyHtml: string;
  agentName?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  accentColor?: AccentColor;
}

const COLORS = {
  blaze: "#FF6F4C",
  horizon: "#FDC436",
  abyss: "#1A1D2E",
  lagoon: "#64CBB9",
  ridge: "#056147",
  drift: "#EEE5D5",
} as const;

const LOGO_URL =
  "https://www.adventourist.in/logo/logo-horizontal-white.svg";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/**
 * If body looks like plain text (no <p, <br, <div, <table tag),
 * escape it and convert blank lines to paragraphs and single newlines to <br>.
 * Otherwise pass through untouched (rule authors who already wrote HTML keep
 * full control over their markup).
 */
function normalizeBody(raw: string): string {
  const body = raw || "";
  const hasHtml = /<\s*(p|br|div|table)\b/i.test(body);
  if (hasHtml) return body;
  const escaped = escapeHtml(body).trim();
  if (!escaped) return "";
  const paragraphs = escaped.split(/\n\s*\n+/);
  return paragraphs
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function wrapInBrandShell(opts: BrandShellOptions): string {
  const accentKey = opts.accentColor || "blaze";
  const accent = COLORS[accentKey];
  const bodyHtml = normalizeBody(opts.bodyHtml);
  const heroTitle = escapeHtml(opts.heroTitle || "");
  const heroSubtitle = opts.heroSubtitle ? escapeHtml(opts.heroSubtitle) : "";
  const agentName = opts.agentName ? escapeHtml(opts.agentName) : "";
  const ctaUrl = opts.ctaUrl ? escapeAttr(opts.ctaUrl) : "";
  const ctaLabel = opts.ctaLabel ? escapeHtml(opts.ctaLabel) : "";
  const showCta = !!(ctaUrl && ctaLabel);
  const showSignature = !!agentName;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${heroTitle || "Adventourist"}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Jost:wght@400;500;600&display=swap');
body { margin:0; padding:0; background:${COLORS.drift}; }
a { color:${COLORS.blaze}; }
@media (max-width:600px) {
  .av-hero { padding:32px 24px !important; }
  .av-hero-title { font-size:28px !important; }
  .av-body { padding:28px 24px !important; }
  .av-header { padding:18px 24px !important; }
  .av-footer { padding:28px 24px !important; }
  .av-tagline { display:none !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.drift};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.drift};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(26,29,46,0.08);">
      <tr>
        <td class="av-header" style="background:${COLORS.abyss};padding:20px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="vertical-align:middle;">
                <img src="${LOGO_URL}" width="140" alt="Adventourist" style="display:block;border:0;outline:none;text-decoration:none;height:auto;">
              </td>
              <td align="right" class="av-tagline" style="vertical-align:middle;color:${COLORS.horizon};font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">
                Travel Designed For You
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="av-hero" style="background:${accent};padding:48px 48px;">
          <h1 class="av-hero-title" style="margin:0;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:36px;line-height:1.1;letter-spacing:-0.02em;color:#ffffff;">${heroTitle}</h1>
          ${
            heroSubtitle
              ? `<p style="margin:12px 0 0;font-family:'Jost','Segoe UI',Arial,sans-serif;font-weight:500;font-size:16px;line-height:1.45;color:rgba(255,255,255,0.92);">${heroSubtitle}</p>`
              : ""
          }
        </td>
      </tr>
      <tr>
        <td class="av-body" style="padding:36px 48px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:15px;line-height:24px;color:${COLORS.abyss};">
          ${bodyHtml}
          ${
            showCta
              ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
            <tr><td style="background:${COLORS.blaze};border-radius:12px;">
              <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:14px;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${ctaLabel}</a>
            </td></tr>
          </table>`
              : ""
          }
          ${
            showSignature
              ? `
          <hr style="border:none;border-top:1px solid ${COLORS.drift};margin:28px 0 20px;">
          <p style="margin:0;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:14px;line-height:22px;color:${COLORS.abyss};">
            Warmly,<br>
            <strong style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;">${agentName}</strong><br>
            <span style="color:#6b6f7f;font-size:13px;">Your travel expert · Adventourist</span>
          </p>`
              : ""
          }
        </td>
      </tr>
      <tr>
        <td class="av-footer" style="background:${COLORS.abyss};padding:32px 48px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:13px;line-height:21px;color:#c8ccda;">
          <div style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.horizon};margin-bottom:10px;">Adventourist</div>
          <div style="margin-bottom:6px;">1 Madhav Kunj, South Pond Road, Vile Parle, Mumbai 400056</div>
          <div style="margin-bottom:10px;">📞 +91 99304 00694 &nbsp;·&nbsp; ✉️ support@adventourist.in &nbsp;·&nbsp; 🌐 adventourist.in</div>
          <div style="font-size:11px;color:#8a8fa3;margin-bottom:6px;">GST 27ABMFA3990N1ZQ · PAN ABMFA3990N</div>
          <div style="font-size:11px;color:#8a8fa3;">© Adventourist 2026 · Travel Designed For You</div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}