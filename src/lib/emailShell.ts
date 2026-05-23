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

const DEFAULT_HERO_TITLE = "Custom trips, <em>without the copy-paste</em>";
const DEFAULT_HERO_SUBTITLE =
  "No fixed packages. No call-centre scripts. Just a crisp trip note from real humans who care about the route, the pace, and the tiny details.";
const DEFAULT_BODY_NOTE =
  "We’ve pulled the next useful step into one tidy note — clear enough to act on, warm enough to not feel like it escaped from a CRM.";

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

function stripHtml(s: string): string {
  return (s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericHeroTitle(raw: string): boolean {
  const plain = stripHtml(raw).toLowerCase();
  return !plain || /^(from\s+)?(a\s+note\s+from\s+)?(adventourist|edventurous)$/.test(plain);
}

function cleanBodyCopy(raw: string): string {
  const body = raw || "";
  const withoutSlogans = body
    .replace(/<\s*(p|div)\b[^>]*>\s*(?:—\s*)?(?:travel\s+designed\s+for\s+you|adventourist|edventurous)\s*<\/\s*\1\s*>/gi, "")
    .replace(/^\s*(?:—\s*)?(?:travel\s+designed\s+for\s+you|adventourist|edventurous)\s*$/gim, "")
    .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return withoutSlogans;
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
  const heroEyebrowRaw = (opts.heroEyebrow || "BUILT AROUND YOUR PEOPLE, PACE & PLANS").trim();
  const heroEyebrow = escapeHtml(heroEyebrowRaw);
  const resolvedHeroTitle = isGenericHeroTitle(opts.heroTitle) ? DEFAULT_HERO_TITLE : opts.heroTitle;
  const heroTitle = parseAccentHeading(resolvedHeroTitle);
  const heroSubtitle = escapeHtml(opts.heroSubtitle || DEFAULT_HERO_SUBTITLE);
  const cleanedBody = cleanBodyCopy(opts.bodyHtml);
  const bodyHtml = normalizeBody(stripHtml(cleanedBody).length ? cleanedBody : DEFAULT_BODY_NOTE);

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

  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800;900&family=Jost:wght@400;500;600&display=swap');
body { margin:0; padding:0; background:${COLORS.drift}; }
a { color:${COLORS.blaze}; }
@media screen and (max-width:600px) {
  .container { width:100% !important; border-radius:16px !important; }
  .px-48 { padding-left:28px !important; padding-right:28px !important; }
  .brand-kicker { display:none !important; }
  .hero-h1 { font-size:32px !important; line-height:1.08 !important; }
  .hero-eyebrow { font-size:10px !important; }
  .hero-pad { padding:42px 28px 34px !important; }
  .hero-stamp { text-align:left !important; margin-top:32px !important; }
  .stack { display:block !important; width:100% !important; margin-bottom:10px !important; }
  .feature-title { font-size:22px !important; }
}
`;

  const heroCell = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td class="hero-pad" bgcolor="#F6EFE2" valign="top"
      style="background-color:#F6EFE2;background-image:linear-gradient(135deg, #F8F1E5 0%, ${COLORS.drift} 54%, #D8EEE8 100%);padding:60px 48px 46px;border-bottom:3px solid ${COLORS.blaze};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td style="padding:0;">
          <div class="hero-eyebrow" style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.ridge};">— ${heroEyebrow}</div>
          <h1 class="hero-h1" style="margin:20px 0 0;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:900;font-size:46px;line-height:0.98;letter-spacing:0;color:${COLORS.abyss};">${heroTitle}</h1>
          ${
            heroSubtitle
              ? `<p style="margin:18px 0 0;max-width:500px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-weight:500;font-size:17px;line-height:1.55;color:rgba(26,29,46,0.76);">${heroSubtitle}</p>`
              : ""
          }
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:34px;border-collapse:collapse;">
            <tr>
              <td style="background:rgba(255,111,76,0.12);border:1px solid rgba(255,111,76,0.35);border-radius:999px;padding:8px 12px;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.blaze};">No copy-paste trips</td>
              <td width="10" style="font-size:0;line-height:0;">&nbsp;</td>
              <td style="background:rgba(5,97,71,0.10);border:1px solid rgba(5,97,71,0.24);border-radius:999px;padding:8px 12px;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.ridge};">Real humans</td>
            </tr>
          </table>
          <div class="hero-stamp" style="margin-top:42px;text-align:right;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:900;font-size:13px;letter-spacing:0.26em;color:rgba(255,111,76,0.52);">PLAN IT LIKE YOU MEAN IT</div>
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
              <td align="left" style="vertical-align:middle;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;color:${COLORS.abyss};">
                <span style="display:inline-block;width:10px;height:10px;background:${COLORS.blaze};border-radius:999px;margin-right:10px;vertical-align:1px;">&nbsp;</span><span style="font-weight:900;font-size:17px;letter-spacing:0.18em;">ADVENTOURIST</span>
              </td>
              <td class="brand-kicker" align="right" style="vertical-align:middle;font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.ridge};">
                Mumbai-born · made-to-measure
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="padding:0;">${heroCell}</td></tr>
      <tr>
        <td class="px-48" style="padding:42px 48px 18px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:16px;line-height:27px;color:${COLORS.abyss};">
          <div style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:800;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${COLORS.blaze};margin-bottom:14px;">The useful bit</div>
          <div style="font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:16px;line-height:27px;color:rgba(26,29,46,0.86);">
            ${bodyHtml}
          </div>
          ${ctaBlock}
          ${dividerBlock}
        </td>
      </tr>
      ${signatureBlock ? `<tr><td style="padding:0;">${signatureBlock}</td></tr>` : ""}
      ${featureBlock ? `<tr><td style="padding:0;">${featureBlock}</td></tr>` : ""}
      <tr>
        <td class="px-48" style="background:${COLORS.abyss};padding:36px 48px 32px;font-family:'Jost','Segoe UI',Arial,sans-serif;font-size:13px;line-height:22px;color:rgba(255,255,255,0.7);">
          <div style="font-family:'Inter Tight','Segoe UI',Arial,sans-serif;font-weight:900;font-size:16px;letter-spacing:0.12em;color:${COLORS.horizon};">ADVENTOURIST</div>
          <div style="margin-top:6px;height:1px;width:32px;background:rgba(253,196,54,0.25);font-size:0;line-height:1px;">&nbsp;</div>
          <div style="margin-top:18px;">Small team. Real recommendations. Trips planned around actual humans.</div>
          <div style="margin-top:8px;">1 Madhav Kunj, South Pond Road, Vile Parle, Mumbai 400056</div>
          <div style="margin-top:8px;color:rgba(255,255,255,0.82);">
            <a href="tel:+919930400694" style="color:rgba(255,255,255,0.82);text-decoration:none;">📞 +91 99304 00694</a>
            <span style="color:${COLORS.horizon};"> · </span>
            <a href="mailto:support@adventourist.in" style="color:rgba(255,255,255,0.82);text-decoration:none;">✉️ support@adventourist.in</a>
            <span style="color:${COLORS.horizon};"> · </span>
            <a href="https://adventourist.in" style="color:rgba(255,255,255,0.82);text-decoration:none;">🌐 adventourist.in</a>
          </div>
          <div style="margin-top:22px;font-size:11px;color:rgba(255,255,255,0.4);">GST 27ABMFA3990N1ZQ · PAN ABMFA3990N</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);">© Adventourist 2026</div>
        </td>
      </tr>
      <tr><td style="padding:0;">${fourColorStripe()}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
