import { format, formatDistanceToNow, isToday, isTomorrow, isThisYear } from "date-fns";

/** All times below are computed in the user's local timezone (IST for Adventourist team). */

function atHour(d: Date, hour: number, minute = 0) {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x;
}

export function tomorrowAt(hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return atHour(d, hour, minute);
}

export function todayAt(hour: number, minute = 0) {
  return atHour(new Date(), hour, minute);
}

export function inHours(h: number) {
  return new Date(Date.now() + h * 3600 * 1000);
}

export function inDaysAt(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return atHour(d, hour, minute);
}

export function fromDateAt(iso: string | Date, hour: number, minute = 0, addDays = 0) {
  const d = typeof iso === "string" ? new Date(iso) : new Date(iso);
  if (addDays) d.setDate(d.getDate() + addDays);
  return atHour(d, hour, minute);
}

/** Human-friendly relative date label for chips. */
export function friendlyDateLabel(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const time = format(d, "h:mm a");
  if (isToday(d)) return `Today ${time}`;
  if (isTomorrow(d)) return `Tomorrow ${time}`;
  if (isThisYear(d)) return format(d, "d MMM, h:mm a");
  return format(d, "d MMM yyyy, h:mm a");
}

export function fullDateLabel(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "EEE d MMM yyyy 'at' h:mm a");
}

export function timeUntil(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Normalise master_value string like "Busy Call Back" → "busy_call_back". */
export function dispKey(v?: string | null) {
  return (v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** datetime-local default value (yyyy-MM-ddTHH:mm) — used as form defaults. */
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}