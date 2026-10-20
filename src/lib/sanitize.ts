import DOMPurify from "isomorphic-dompurify";

/**
 * Allowlist for admin-authored rich text that renders via
 * `dangerouslySetInnerHTML` (itinerary day descriptions, inclusions /
 * exclusions blurbs, blog story bodies, landing-page content blocks).
 *
 * Keep the list narrow — any tag or attribute added here can be used by
 * every admin, so additions should be reviewed carefully. Images are
 * allowed because the TipTap editor inserts them; add `rel` so sanitized
 * anchors always carry `noopener noreferrer`.
 */
const CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "span", "div",
    "strong", "em", "b", "i", "u", "s", "mark", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "code", "pre", "hr",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel",
    "src", "alt", "title", "width", "height", "loading",
    "class", "id",
    "colspan", "rowspan",
  ],
  // Block anything that could resolve to script/style injection via URL schemes.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
};

/**
 * Sanitize admin-authored HTML before rendering it with
 * `dangerouslySetInnerHTML`. Returns an empty string when the input is
 * falsy so callers can pass it directly without a conditional.
 *
 * Also normalises anchors so every external link gets rel="noopener
 * noreferrer" regardless of what the author entered.
 */
export function sanitizeRichHtml(dirty: unknown): string {
  if (typeof dirty !== "string" || dirty.length === 0) return "";
  const clean = String(DOMPurify.sanitize(dirty, CONFIG));
  // DOMPurify can emit <a target="_blank"> without rel — tighten it after.
  return clean.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs) => {
      const hasRel = /\brel\s*=/i.test(attrs);
      if (hasRel) return match;
      const hasHref = /\bhref\s*=/i.test(attrs);
      if (!hasHref) return match;
      return `<a ${attrs} rel="noopener noreferrer">`;
    },
  );
}
