// Branded HTML shell for Adventourist automation emails — cinematic editorial layout.
// Table-based, email-client safe. No external deps. Works in both browser and Deno.

export type AccentColor = "blaze" | "horizon" | "lagoon" | "ridge";

export interface BrandShellOptions {
  // Hero
  heroTitle: string;
  heroEyebrow?: string;
  heroSubtitle?: string;
  heroImage?: string;
  heroAccent?: AccentColor;
  // Body
  bodyHtml: string;
  // CTAs
  primaryCtaUrl?: string;
  primaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  secondaryCtaLabel?: string;
  // Signature
  agentName?: string;
  agentRole?: string;
  // Optional feature card
  featureCardEyebrow?: string;
  featureCardTitle?: string;
  featureCardUrl?: string;
  // Legacy aliases (backwards-compat with previous shell signature)
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
  "https://ufjhiqdpshrubephgxrs.supabase.co/storage/v1/object/public/legacy-media/brand%2Femail-logo-white.png";

const DEFAULT_HERO_IMAGE =
  "https://cms2.adventourist.in/storage/brand/email-hero-default.jpg";

const ACCENT_TOP: Record<AccentColor, string> = {
  blaze: "rgba(255,111,76,0)",
  horizon: "rgba(253,196,54,0)",
  lagoon: "rgba(100,203,185,0)",
  ridge: "rgba(5,97,71,0)",
};

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
 * Parse a heading string that may contain <em>...</em> markers and <br>.
 * <em> segments render as italic Blaze; everything else is escaped.
 */
function parseAccentHeading(raw: string): string {
  if (!raw) return "";
  const parts: Array<{ kind: "text" | "em" | "br"; value: string }> = [];
  const re = /<em>([\s\S]*?)<\/em>|<br\s*\/?>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push({ kind: "text", value: raw.slice(last, m.index) });
    if (m[0].toLowerCase().startsWith("<br")) {
      parts.push({ kind: "br", value: "" });
    } else {
      parts.push({ kind: "em", value: m[1] });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push({ kind: "text", value: raw.slice(last) });
  return parts
    .map((p) => {
      if (p.kind === "br") return "<br>";
      if (p.kind === "em")
        return `<em style="font-style:italic;color:${COLORS.blaze};font-weight:inherit;">${escapeHtml(p.value)}</em>`;
      return escapeHtml(p.value);
    })
    .join("");
}

/**
 * Plain text → paragraphs. If body already contains block-level HTML, pass through.
 */
function normalizeBody(raw: string): string {
  const body = raw || "";
  const hasHtml = /<\s*(p|br|div|table)\b/i.test(body);
  if (hasHtml) return body;
  const escaped = escapeHtml(body).trim();
  if (!escaped) return "";
  return escaped
    .split(/\n\s*\n+/)
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function fourColorStripe(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
    <td height="6" style="height:6px;line-height:6px;font-size:0;background:${COLORS.blaze};">&nbsp;</td>
    <td height="6" style="height:6px;line-height:6px;font-size:0;background:${COLORS.horizon};">&nbsp;</td>
    <td height="6" style="height:6px;line-height:6px;font-size:0;background:${COLORS.lagoon};">&nbsp;</td>
    <td height="6" style="height:6px;line-height:6px;font-size:0;background:${COLORS.ridge};">&nbsp;</td>
  </tr></table>`;
}

export function wrapInBrandShell(opts: BrandShellOptions): string {
  // Legacy alias resolution
  const primaryCtaUrl = opts.primaryCtaUrl ?? opts.ctaUrl;
  const primaryCtaLabel = opts.primaryCtaLabel ?? opts.ctaLabel;
  const accent: AccentColor = opts.heroAccent ?? opts.accentColor ?? "blaze";

  const heroImage = opts.heroImage || DEFAULT_HERO_IMAGE;
  const heroEyebrowRaw = (opts.heroEyebrow || "TRAVEL DESIGNED FOR YOU").trim();
  const heroEyebrow = escapeHtml(heroEyebrowRaw);
  const heroTitle = parseAccentHeading(opts.heroTitle || "");
  const heroSubtitle = opts.heroSubtitle ? escapeHtml(opts.heroSubtitle) : "";
  const bodyHtml = normalizeBody(opts.bodyHtml);

  // CTAs
  const showPrimary = !!(primaryCtaUrl && primaryCtaLabel);
  const showSecondary = !!(opts.secondaryCtaUrl && opts.secondaryCtaLabel);
  let primaryLabel = primaryCtaLabel || "";
  if (showPrimary && !/→|&rarr;|->/.test(primaryLabel)) primaryLabel = primaryLabel + " →";
  let secondaryLabel = opts.secondaryCtaLabel || "";
  if (
    showSecondary &&
    /wa\.me|whatsapp/i.test(opts.secondaryCtaUrl || "") &&
    !/💬/.test(secondaryLabel)
  ) {
    secondaryLabel = "💬 " + secondaryLabel;
  }

  // Signature
  const agentName = opts.agentName ? escapeHtml(opts.agentName) : "";
  const agentRole = escapeHtml(opts.agentRole || "Your travel expert");
  const showSignature = !!agentName;

  // Feature card
  const showFeature = !!(opts.featureCardEyebrow && opts.featureCardTitle);
  const featureEyebrow = showFeature ? escapeHtml(opts.featureCardEyebrow!) : "";
  const featureTitle = showFeature ? parseAccentHeading(opts.featureCardTitle!) : "";
  const featureUrl = opts.featureCardUrl ? escapeAttr(opts.featureCardUrl) : "";

  const gradientOverlay = `linear-gradient(180deg, ${ACCENT_TOP[accent]} 0%, rgba(26,29,46,0.85) 100%)`;

  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800;900&family=Jost:wght@400;500;600&display=swap');
body { margin:0; padding:0; background:${COLORS.drift}; }
a { color:${COLORS.blaze}; }
@media screen and (max-width:600px) {
  .container { width:100% !important; border-radius:16px !important; }
  .px-48 { padding-left:28px !important; padding-right:28px !important; }
  .hero-h1 { font-size:32px !important; line-height:1.08 !important; }
  .hero-eyebrow { font-size:10px !important; }
  .hero-pad { padding:40px 28px !important; }
  .stack { display:block !important; width:100% !important; margin-bottom:10px !important; }
  .feature-title { font-size:22px !important; }
}
`;

  const heroCell = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td class="hero-pad" bgcolor="${COLORS.drift}" valign="top"
      style="background-color:${COLORS.drift};background-image:linear-gradient(160deg, #F6EFE2 0%, ${COLORS.drift} 55%, #E6DCC8 100%);padding:64px 48px;border-bottom:3px solid ${COLORS.blaze};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td style="padding:0;">
          <div class="hero-eyebrow" style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.ridge};">— ${heroEyebrow}</div>
          <h1 class="hero-h1" style="margin:18px 0 0;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:44px;line-height:1.05;letter-spacing:-0.025em;color:${COLORS.abyss};">${heroTitle}</h1>
          ${
            heroSubtitle
              ? `<p style="margin:16px 0 0;max-width:460px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-weight:500;font-size:17px;line-height:1.5;color:rgba(26,29,46,0.72);">${heroSubtitle}</p>`
              : ""
          }
          <div style="margin-top:48px;text-align:right;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:900;font-size:14px;letter-spacing:0.3em;color:rgba(255,111,76,0.55);">ADVENTOURIST</div>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;

  const ctaBlock = showPrimary
    ? `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;border-collapse:collapse;">
  <tr>
    <td class="stack" style="padding-right:${showSecondary ? "12px" : "0"};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
        <td bgcolor="${COLORS.blaze}" style="background:${COLORS.blaze};border-radius:14px;">
          <a href="${escapeAttr(primaryCtaUrl!)}" style="display:inline-block;padding:16px 28px;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:0.02em;color:#ffffff;text-decoration:none;">${escapeHtml(primaryLabel)}</a>
        </td>
      </tr></table>
    </td>
    ${
      showSecondary
        ? `<td class="stack">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
        <td style="background:transparent;border:1.5px solid ${COLORS.abyss};border-radius:14px;">
          <a href="${escapeAttr(opts.secondaryCtaUrl!)}" style="display:inline-block;padding:14.5px 26px;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:14px;color:${COLORS.abyss};text-decoration:none;">${escapeHtml(secondaryLabel)}</a>
        </td>
      </tr></table>
    </td>`
        : ""
    }
  </tr>
</table>`
    : "";

  const dividerBlock = showSignature
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;border-collapse:collapse;"><tr><td height="1" width="32" style="height:1px;line-height:1px;font-size:0;background:${COLORS.drift};">&nbsp;</td></tr></table>`
    : "";

  const signatureBlock = showSignature
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="px-48" style="padding:24px 48px 32px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:14px;line-height:22px;color:${COLORS.abyss};">
    Warmly,<br>
    <strong style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;">${agentName}</strong><br>
    <span style="color:#6b6f7f;font-size:13px;">${agentRole} · Adventourist</span>
  </td></tr>
</table>`
    : "";

  const featureInner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="vertical-align:middle;">
      <div style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${COLORS.horizon};">${featureEyebrow}</div>
      <div class="feature-title" style="margin-top:8px;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:26px;line-height:1.2;color:#ffffff;">${featureTitle}</div>
    </td>
    <td width="32" align="right" style="vertical-align:middle;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-size:22px;color:${COLORS.horizon};">→</td>
  </tr>
</table>`;

  const featureBlock = showFeature
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="px-48" style="background:${COLORS.abyss};padding:36px 48px;">
    ${
      featureUrl
        ? `<a href="${featureUrl}" style="text-decoration:none;color:inherit;display:block;">${featureInner}</a>`
        : featureInner
    }
  </td></tr>
</table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Adventourist</title>
<style>${styles}</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.drift};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.drift};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" class="container" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(26,29,46,0.10);border-collapse:separate;">
      <tr><td style="padding:0;">${fourColorStripe()}</td></tr>
      <tr>
        <td style="background:${COLORS.drift};padding:22px 36px;border-bottom:1px solid rgba(26,29,46,0.08);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="vertical-align:middle;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:17px;letter-spacing:0.18em;color:${COLORS.abyss};">
                ADVENTOURIST
              </td>
              <td align="right" style="vertical-align:middle;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.ridge};">
                ${heroEyebrow}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="padding:0;">${heroCell}</td></tr>
      <tr>
        <td class="px-48" style="padding:44px 48px 16px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:16px;line-height:26px;color:${COLORS.abyss};">
          ${bodyHtml}
          ${ctaBlock}
          ${dividerBlock}
        </td>
      </tr>
      ${signatureBlock ? `<tr><td style="padding:0;">${signatureBlock}</td></tr>` : ""}
      ${featureBlock ? `<tr><td style="padding:0;">${featureBlock}</td></tr>` : ""}
      <tr>
        <td class="px-48" style="background:${COLORS.abyss};padding:36px 48px 32px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:13px;line-height:22px;color:rgba(255,255,255,0.7);">
          <div style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:16px;letter-spacing:0.12em;color:${COLORS.horizon};">ADVENTOURIST</div>
          <div style="margin-top:6px;height:1px;width:32px;background:rgba(253,196,54,0.25);font-size:0;line-height:1px;">&nbsp;</div>
          <div style="margin-top:18px;">1 Madhav Kunj, South Pond Road, Vile Parle, Mumbai 400056</div>
          <div style="margin-top:8px;color:rgba(255,255,255,0.82);">
            <a href="tel:+919930400694" style="color:rgba(255,255,255,0.82);text-decoration:none;">📞 +91 99304 00694</a>
            <span style="color:${COLORS.horizon};"> · </span>
            <a href="mailto:support@adventourist.in" style="color:rgba(255,255,255,0.82);text-decoration:none;">✉️ support@adventourist.in</a>
            <span style="color:${COLORS.horizon};"> · </span>
            <a href="https://adventourist.in" style="color:rgba(255,255,255,0.82);text-decoration:none;">🌐 adventourist.in</a>
          </div>
          <div style="margin-top:22px;font-size:11px;color:rgba(255,255,255,0.4);">GST 27ABMFA3990N1ZQ · PAN ABMFA3990N</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);">© Adventourist 2026 · Travel Designed For You</div>
        </td>
      </tr>
      <tr><td style="padding:0;">${fourColorStripe()}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
