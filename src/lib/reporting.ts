import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────────────────────
   Canonical reporting helpers.
   Every report page must use these so numbers reconcile.
   ───────────────────────────────────────────────────────────── */

export const GST_RATE = 5;

/** Canonical sales_status values as stored in the database (Title Case). */
export const SALES_STATUS = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUOTE_SENT: "Quote Sent",
  FILE_CLOSED: "File Closed",
  FILE_LOST: "File Lost",
  INVALID_LEAD: "Invalid Lead",
  ONGOING: "Ongoing Discussions",
  REFUND_ISSUED: "Refund Issued",
} as const;

export const FUNNEL_STATUSES = [
  SALES_STATUS.NEW_LEAD,
  SALES_STATUS.CONTACTED,
  SALES_STATUS.QUOTE_SENT,
  SALES_STATUS.FILE_CLOSED,
] as const;

const CANONICAL_BY_KEY: Record<string, string> = Object.values(SALES_STATUS).reduce(
  (acc, value) => {
    acc[normaliseKey(value)] = value;
    return acc;
  },
  {} as Record<string, string>,
);

function normaliseKey(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Accepts legacy snake_case (`file_closed`) or Title Case (`File Closed`)
 * and returns the canonical Title Case value.
 */
export function normaliseStatus(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  return CANONICAL_BY_KEY[normaliseKey(value)] ?? value;
}

export function statusIs(lead: any, ...statuses: string[]): boolean {
  const s = normaliseStatus(lead?.sales_status);
  return statuses.some((target) => s === normaliseStatus(target));
}

/** A lead counts as converted when the file is closed OR the query was closed. */
export function isClosed(lead: any): boolean {
  return statusIs(lead, SALES_STATUS.FILE_CLOSED) || lead?.disposition === "Query Closed";
}

export function isContacted(lead: any): boolean {
  return (
    statusIs(
      lead,
      SALES_STATUS.CONTACTED,
      SALES_STATUS.QUOTE_SENT,
      SALES_STATUS.FILE_CLOSED,
      SALES_STATUS.ONGOING,
      SALES_STATUS.REFUND_ISSUED,
    ) || isClosed(lead)
  );
}

export function isQuoted(lead: any): boolean {
  return statusIs(lead, SALES_STATUS.QUOTE_SENT, SALES_STATUS.FILE_CLOSED) || isClosed(lead);
}

export const LOST_DISPOSITIONS = ["Plan Dropped", "Not Interested", "Booked Outside", "Ghosted"];

export function isLost(lead: any): boolean {
  return LOST_DISPOSITIONS.includes(lead?.disposition) || statusIs(lead, SALES_STATUS.FILE_LOST);
}

/* ───────── dates ───────── */

/**
 * Trips are dated by booking date first; legacy imports often only carry a
 * travel date, and created_at is just the import timestamp.
 */
export function effectiveDate(cf: any): Date | null {
  const raw = cf?.booking_date ?? cf?.travel_start_date ?? cf?.created_at ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function endOfSelectedDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function inRange(date: Date | null, from: Date, to: Date): boolean {
  if (!date) return false;
  return date >= from && date <= endOfSelectedDay(to);
}

/** Shared default reporting window: covers all historic data through next year. */
export const DEFAULT_REPORT_FROM = () => new Date(2018, 0, 1);
export const DEFAULT_REPORT_TO = () => new Date(new Date().getFullYear() + 1, 11, 31);

/* ───────── money ───────── */

export type TripTotals = {
  vendorCostPerPax: number;
  totalVendorCost: number;
  marginAmount: number;
  sellingExGst: number;
  gstAmount: number;
  finalPrice: number;
  grossMarginPct: number;
};

/** Sum vendor line costs per cashflow id. */
export function vendorCostMap(lines: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines || []) {
    map.set(
      line.cashflow_id,
      (map.get(line.cashflow_id) ?? 0) + Number(line.cost_per_pax_incl_gst ?? 0),
    );
  }
  return map;
}

/**
 * Canonical trip economics — mirrors the Trip Cashflow editor exactly:
 * vendor cost x pax, margin applied as a markup on cost, 5% GST when billed.
 */
export function calcTrip(cf: any, vendorCostPerPax: number): TripTotals {
  const pax = Number(cf?.pax_count ?? 1) || 1;
  const totalVendorCost = vendorCostPerPax * pax;
  const marginPct = Number(cf?.margin_percent ?? 0) || 0;
  const marginAmount = totalVendorCost * (marginPct / 100);
  const sellingExGst = totalVendorCost + marginAmount;
  const gstAmount = cf?.gst_billing ? sellingExGst * (GST_RATE / 100) : 0;
  return {
    vendorCostPerPax,
    totalVendorCost,
    marginAmount,
    sellingExGst,
    gstAmount,
    finalPrice: sellingExGst + gstAmount,
    grossMarginPct: sellingExGst > 0 ? (marginAmount / sellingExGst) * 100 : 0,
  };
}

/* ───────── paged fetching ───────── */

const PAGE_SIZE = 1000;

/**
 * PostgREST caps responses at 1000 rows. This pages through the full result
 * set so reports never silently truncate.
 */
export async function fetchAll<T = any>(
  build: () => any,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await build().range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) {
      console.error("Report fetch failed", error);
      break;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export function fetchLeads(from?: Date, to?: Date) {
  return fetchAll(() => {
    let q = supabase.from("leads").select("*");
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) q = q.lte("created_at", endOfSelectedDay(to).toISOString());
    return q.order("created_at", { ascending: false });
  });
}

export function fetchCashflows(columns = "*") {
  return fetchAll(() =>
    supabase.from("trip_cashflow").select(columns).order("created_at", { ascending: false }),
  );
}

export async function fetchCashflowVendors(cashflowIds: string[], columns = "*") {
  if (!cashflowIds.length) return [] as any[];
  const chunks: string[][] = [];
  for (let i = 0; i < cashflowIds.length; i += 75) chunks.push(cashflowIds.slice(i, i + 75));
  const results = await Promise.all(
    chunks.map((ids) => fetchAll(() => supabase.from("trip_cashflow_vendors").select(columns).in("cashflow_id", ids))),
  );
  return results.flat();
}

/** id → name lookup for destinations (no FK exists on trip_cashflow.destination_id). */
export async function fetchDestinationMap(): Promise<Map<string, string>> {
  const rows = await fetchAll<{ id: string; name: string }>(() =>
    supabase.from("destinations").select("id, name"),
  );
  const map = new Map<string, string>();
  rows.forEach((d) => map.set(d.id, d.name));
  return map;
}