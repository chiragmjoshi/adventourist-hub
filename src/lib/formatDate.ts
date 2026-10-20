import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Canonical date formatting helpers.
 *
 * Phase 4B.1 — collapse scattered `new Date(x).toLocaleDateString()` calls
 * (which pick up the browser's locale + timezone and render inconsistently
 * across the app) into one place with explicit formats. All helpers return
 * an em-dash for null / undefined / unparseable input so templates can call
 * them directly without conditional guards.
 *
 * Timezone: formatting is wall-clock in the user's browser timezone, which
 * is the correct default for date-only columns (travel_start_date,
 * follow_up_date) that are already stored tz-naive. For timestamptz columns
 * we also format in the browser's local tz — change `withTz` if a future
 * phase needs to render in a fixed IST view.
 */

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

/** "18 Oct 2026" — the canonical display format for a date-only value. */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  return d ? format(d, "dd MMM yyyy") : "—";
}

/** "18 Oct 2026, 02:47 PM" — for timestamps the user needs to the minute. */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  return d ? format(d, "dd MMM yyyy, hh:mm a") : "—";
}

/** "Oct 2026" — month + year, for monthly aggregates on charts and reports. */
export function formatMonthYear(value: DateInput): string {
  const d = toDate(value);
  return d ? format(d, "MMM yyyy") : "—";
}

/** "in 3 days" / "2 hours ago" — relative wording for timelines + reminders. */
export function formatRelative(value: DateInput): string {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

/** "2026-10-18" — ISO date for machine readers (CSV export, date inputs). */
export function formatIsoDate(value: DateInput): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd") : "";
}
