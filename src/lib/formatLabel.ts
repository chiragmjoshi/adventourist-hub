/**
 * Display-label helpers.
 *
 * The original `formatLabel(value)` turns snake_case DB values into
 * Title-Case display strings and preserves a custom-override map for cases
 * where the derived string isn't what we want (e.g. "wrong_number" →
 * "Wrong Number / Invalid Lead"). Many pages depend on it; keep as-is.
 *
 * Phase 4B.1 — add new focused helpers that collapse the audit-flagged
 * `|| "Unknown"` / `|| "Direct"` inconsistency across reports. These are
 * additive — the original formatLabel is unchanged.
 */

const CUSTOM_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  file_closed: "File Closed",
  file_lost: "File Lost",
  new_lead: "New Lead",
  quote_sent: "Quote Sent",
  busy_call_back: "Busy Call Back",
  not_reachable_call_back: "Not Reachable Call Back",
  wrong_number: "Wrong Number / Invalid Lead",
  ongoing_discussions: "Ongoing Discussions",
  not_interested: "Not Interested",
  follow_up_needed: "Follow Up Needed",
  contacted: "Contacted",
};

export const formatLabel = (value: string): string => {
  if (!value) return "";
  if (CUSTOM_LABELS[value]) return CUSTOM_LABELS[value];
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ─── Phase 4B.1 additions ───────────────────────────────────────────── */

const EMPTY_PLATFORM_LABEL  = "Direct";
const EMPTY_CHANNEL_LABEL   = "Unattributed";
const EMPTY_DISPOSITION     = "No disposition";
const EMPTY_STATUS          = "New Lead";
const EMPTY_FIELD_FALLBACK  = "—";

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/**
 * Platform (how the lead reached us). "Direct" means organic — enquiry
 * came in without an attributed campaign source. Audit found reports used
 * `|| "Unknown"` in one place and `|| "Direct"` in another for the same
 * null value; this helper fixes that.
 */
export function displayPlatform(value: unknown): string {
  if (isBlank(value)) return EMPTY_PLATFORM_LABEL;
  return String(value);
}

/** Marketing channel (website, instagram, meta ads, google, etc.). */
export function displayChannel(value: unknown): string {
  if (isBlank(value)) return EMPTY_CHANNEL_LABEL;
  return String(value);
}

/** Sales status display — reuses formatLabel for snake_case transforms. */
export function displaySalesStatus(value: unknown): string {
  if (isBlank(value)) return EMPTY_STATUS;
  return formatLabel(String(value));
}

/** Lead disposition display — reuses formatLabel for snake_case transforms. */
export function displayDisposition(value: unknown): string {
  if (isBlank(value)) return EMPTY_DISPOSITION;
  return formatLabel(String(value));
}

/**
 * Generic "field is empty" rendering — single em-dash. Use for optional
 * table cell values that should still occupy space in a row.
 */
export function displayField(value: unknown): string {
  if (isBlank(value)) return EMPTY_FIELD_FALLBACK;
  return String(value);
}
