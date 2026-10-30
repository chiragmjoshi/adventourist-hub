import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Download, FileDown, Info } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { displayPlatform } from "@/lib/formatLabel";
import { useFlag } from "@/hooks/useFlag";
import { useMarketingSpends } from "@/hooks/useMarketingSpends";
import type { FeedbackType } from "@/hooks/useLeadFeedback";
import {
  calcTrip, effectiveDate, endOfSelectedDay,
  fetchCashflows, fetchCashflowVendors, inRange, isClosed, vendorCostMap,
} from "@/lib/reporting";

/* ───────────────────────────────────────────────────────────────────────
   Phase A3 — Ad Feedback report.
   One admin report that aggregates lead_feedback (Phase A1) with the
   financial numbers from Phase M for a given platform + date window.
   Designed to be exported in A4 (PDF + CSV) and handed to a ChatGPT /
   Meta / Google account manager.
   Behind feature:ad_feedback. Admin + super_admin only.
   ─────────────────────────────────────────────────────────────────────── */

type Lead = {
  id: string;
  platform: string | null;
  destination_id: string | null;
  sales_status: string | null;
  disposition: string | null;
  created_at: string;
  traveller_code: string | null;
  name: string | null;
  mobile: string | null;
  email: string | null;
};

type Cashflow = {
  id: string;
  lead_id: string | null;
  traveller_code: string | null;
  pax_count: number | null;
  margin_percent: number | null;
  gst_billing: boolean | null;
  booking_date: string | null;
  travel_start_date: string | null;
  created_at: string;
  destination_id: string | null;
};

type Feedback = {
  id: string;
  lead_id: string;
  feedback_type: FeedbackType;
  reason: string;
  notes: string | null;
  created_at: string;
};

const defaultFrom = () => startOfMonth(new Date());
const defaultTo = () => endOfMonth(new Date());

/* ───────── PII scrub ─────────
   Strips the lead's own name, mobile, email from note text. Also a
   generic 10-digit mobile fallback for anything else that slipped
   through. Deliberately conservative — the goal is "don't leak the
   customer's identity into an external PDF", not "redact every entity
   a human could still infer". */
const PHONE_RE = /\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;

function scrubText(text: string | null, lead: Lead | undefined): string {
  if (!text) return "";
  let out = text;
  if (lead?.name && lead.name.trim().length > 1) {
    // Match first name and surname separately so partial-match still redacts.
    const parts = lead.name.trim().split(/\s+/).filter((p) => p.length >= 3);
    parts.forEach((p) => {
      const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      out = out.replace(re, "[name]");
    });
  }
  if (lead?.mobile) {
    const clean = String(lead.mobile).replace(/[^\d]/g, "").slice(-10);
    if (clean.length === 10) {
      out = out.replace(new RegExp(clean, "g"), "[phone]");
    }
  }
  if (lead?.email) {
    out = out.replace(new RegExp(lead.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[email]");
  }
  out = out.replace(PHONE_RE, "[phone]").replace(EMAIL_RE, "[email]");
  return out;
}

const AdFeedbackReport = () => {
  const adFeedbackOn = useFlag("feature:ad_feedback");

  const [from, setFrom] = useState<Date>(defaultFrom);
  const [to, setTo] = useState<Date>(defaultTo);
  const [platformFilter, setPlatformFilter] = useState("all");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [costByCf, setCostByCf] = useState<Map<string, number>>(new Map());
  const [destinationNames, setDestinationNames] = useState<Map<string, string>>(new Map());
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const spendsQuery = useMarketingSpends();

  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [leadsRes, cfRes, destsRes, feedbackRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, platform, destination_id, sales_status, disposition, created_at, traveller_code, name, mobile, email"),
        fetchCashflows(
          "id, lead_id, traveller_code, pax_count, margin_percent, gst_billing, booking_date, travel_start_date, created_at, destination_id"
        ) as Promise<Cashflow[]>,
        supabase.from("destinations").select("id, name"),
        supabase
          .from("lead_feedback" as never)
          .select("id, lead_id, feedback_type, reason, notes, created_at")
          .order("created_at", { ascending: false }),
      ]);
      const cashflowRows = cfRes;
      const vendors = await fetchCashflowVendors(
        cashflowRows.map((c) => c.id),
        "cashflow_id, cost_per_pax_incl_gst"
      );
      setLeads((leadsRes.data as unknown as Lead[]) || []);
      setCashflows(cashflowRows);
      setCostByCf(vendorCostMap(vendors as unknown as { cashflow_id: string; cost_per_pax_incl_gst: number | string | null }[]));
      const dmap = new Map<string, string>();
      (destsRes.data || []).forEach((d: { id: string; name: string }) => dmap.set(d.id, d.name));
      setDestinationNames(dmap);
      setFeedback((feedbackRes.data as unknown as Feedback[]) || []);
      setLoading(false);
    })();
  }, []);

  const leadById = useMemo(() => {
    const m = new Map<string, Lead>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);
  const leadByTravellerCode = useMemo(() => {
    const m = new Map<string, Lead>();
    leads.forEach((l) => { if (l.traveller_code && !m.has(l.traveller_code)) m.set(l.traveller_code, l); });
    return m;
  }, [leads]);

  /* ─── Platform options ─── */
  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => set.add(displayPlatform(l.platform)));
    (spendsQuery.data || []).forEach((s) => set.add(displayPlatform(s.platform)));
    return Array.from(set).sort();
  }, [leads, spendsQuery.data]);

  const matchesPlatform = (plat: string | null | undefined) =>
    platformFilter === "all" || displayPlatform(plat) === platformFilter;

  /* ─── Volume + financial KPIs for the current filter ─── */
  const kpis = useMemo(() => {
    const fromMs = from.getTime();
    const toMs = endOfSelectedDay(to).getTime();

    let totalLeads = 0;
    let invalidCount = 0;
    let closedWonCount = 0;
    let closedLostCount = 0;

    leads.forEach((l) => {
      if (!matchesPlatform(l.platform)) return;
      const createdMs = new Date(l.created_at).getTime();
      if (createdMs < fromMs || createdMs > toMs) return;
      totalLeads += 1;
      if (l.sales_status === "Invalid Lead") invalidCount += 1;
      if (l.sales_status === "File Closed") closedWonCount += 1;
      if (l.sales_status === "File Lost") closedLostCount += 1;
    });

    let revenue = 0;
    let vendorCost = 0;
    cashflows.forEach((cf) => {
      if (!inRange(effectiveDate(cf), from, to)) return;
      const lead =
        (cf.lead_id ? leadById.get(cf.lead_id) : null) ||
        (cf.traveller_code ? leadByTravellerCode.get(cf.traveller_code) : null);
      if (!lead || !matchesPlatform(lead.platform)) return;
      const trip = calcTrip(cf, costByCf.get(cf.id) ?? 0);
      revenue += trip.sellingExGst;
      vendorCost += trip.totalVendorCost;
    });

    let spend = 0;
    (spendsQuery.data || []).forEach((s) => {
      if (!matchesPlatform(s.platform)) return;
      const rs = new Date(s.start_date).getTime();
      const re = new Date(s.end_date).getTime();
      const span = Math.floor((re - rs) / 86_400_000) + 1;
      if (span <= 0) return;
      const os = Math.max(rs, fromMs);
      const oe = Math.min(re, toMs);
      const overlap = Math.floor((oe - os) / 86_400_000) + 1;
      if (overlap <= 0) return;
      spend += Number(s.amount) * (overlap / span);
    });

    const grossMargin = revenue - vendorCost;
    return {
      totalLeads,
      invalidCount,
      closedWonCount,
      closedLostCount,
      conversionPct: totalLeads > 0 ? (closedWonCount / totalLeads) * 100 : null,
      spend,
      revenue,
      vendorCost,
      grossMargin,
      cpl: totalLeads > 0 && spend > 0 ? spend / totalLeads : null,
      cac: closedWonCount > 0 && spend > 0 ? spend / closedWonCount : null,
      roas: spend > 0 ? revenue / spend : null,
      netMargin: grossMargin - spend,
    };
  }, [leads, cashflows, costByCf, spendsQuery.data, platformFilter, from, to, leadById, leadByTravellerCode]);

  /* ─── Feedback breakdowns ─── */
  const feedbackInWindow = useMemo(() => {
    const fromMs = from.getTime();
    const toMs = endOfSelectedDay(to).getTime();
    return feedback.filter((f) => {
      const lead = leadById.get(f.lead_id);
      if (!lead || !matchesPlatform(lead.platform)) return false;
      const createdMs = new Date(f.created_at).getTime();
      return createdMs >= fromMs && createdMs <= toMs;
    });
  }, [feedback, leadById, platformFilter, from, to]);

  const invalidReasons = useMemo(() => {
    const counts = new Map<string, number>();
    feedbackInWindow.forEach((f) => {
      if (f.feedback_type !== "invalid_lead") return;
      counts.set(f.reason, (counts.get(f.reason) ?? 0) + 1);
    });
    return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [feedbackInWindow]);

  const lostReasons = useMemo(() => {
    const counts = new Map<string, number>();
    feedbackInWindow.forEach((f) => {
      if (f.feedback_type !== "closed_lost") return;
      counts.set(f.reason, (counts.get(f.reason) ?? 0) + 1);
    });
    return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [feedbackInWindow]);

  const representativeNotes = useMemo(() => {
    return feedbackInWindow
      .filter((f) => f.notes && f.notes.trim().length > 0)
      .slice(0, 10)
      .map((f) => {
        const lead = leadById.get(f.lead_id);
        return {
          id: f.id,
          feedbackType: f.feedback_type,
          reason: f.reason,
          notes: scrubText(f.notes, lead),
          when: new Date(f.created_at),
          platform: displayPlatform(lead?.platform ?? null),
        };
      });
  }, [feedbackInWindow, leadById]);

  const topDestinations = useMemo(() => {
    const fromMs = from.getTime();
    const toMs = endOfSelectedDay(to).getTime();
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      if (!matchesPlatform(l.platform)) return;
      if (!isClosed(l)) return;
      if (!l.destination_id) return;
      const createdMs = new Date(l.created_at).getTime();
      if (createdMs < fromMs || createdMs > toMs) return;
      const name = destinationNames.get(l.destination_id);
      if (!name) return;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [leads, destinationNames, platformFilter, from, to]);

  /* ─── Exports ─── */

  const platformLabel = platformFilter === "all" ? "All platforms" : platformFilter;
  const dateRangeLabel = `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
  const fileStem = `ad-feedback_${platformFilter === "all" ? "all" : platformFilter.toLowerCase().replace(/\s+/g, "-")}_${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}`;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = (...vals: unknown[]) => vals.map(esc).join(",");
    const out: string[] = [];
    out.push(line("Ad Feedback Report"));
    out.push(line("Platform", platformLabel));
    out.push(line("Date range", dateRangeLabel));
    out.push(line("Generated at", format(new Date(), "d MMM yyyy, HH:mm")));
    out.push("");

    out.push(line("Section", "Metric", "Value"));
    out.push(line("Volume", "Leads", kpis.totalLeads));
    out.push(line("Volume", "Closed Won", kpis.closedWonCount));
    out.push(line("Volume", "Closed Lost", kpis.closedLostCount));
    out.push(line("Volume", "Invalid", kpis.invalidCount));
    out.push(line("Volume", "Conversion %", kpis.conversionPct !== null ? kpis.conversionPct.toFixed(1) : ""));
    out.push(line("Financial", "Spend", Math.round(kpis.spend)));
    out.push(line("Financial", "Revenue", Math.round(kpis.revenue)));
    out.push(line("Financial", "CPL", kpis.cpl !== null ? Math.round(kpis.cpl) : ""));
    out.push(line("Financial", "CAC", kpis.cac !== null ? Math.round(kpis.cac) : ""));
    out.push(line("Financial", "ROAS", kpis.roas !== null ? kpis.roas.toFixed(2) : ""));
    out.push(line("Financial", "Gross Margin", Math.round(kpis.grossMargin)));
    out.push(line("Financial", "Net Margin", Math.round(kpis.netMargin)));
    out.push("");

    out.push(line("Reason type", "Reason", "Count"));
    invalidReasons.forEach((r) => out.push(line("Invalid", r.reason, r.count)));
    lostReasons.forEach((r) => out.push(line("Lost", r.reason, r.count)));
    out.push("");

    out.push(line("Note type", "Reason", "Date", "Note (PII scrubbed)"));
    representativeNotes.forEach((n) => out.push(
      line(
        n.feedbackType === "invalid_lead" ? "Invalid" : n.feedbackType === "closed_lost" ? "Lost" : "Won",
        n.reason,
        format(n.when, "yyyy-MM-dd"),
        n.notes,
      ),
    ));
    out.push("");

    out.push(line("Destination", "Closed Won"));
    topDestinations.forEach((d) => out.push(line(d.name, d.count)));

    triggerDownload(
      new Blob([out.join("\n")], { type: "text/csv;charset=utf-8" }),
      `${fileStem}.csv`,
    );
  };

  const downloadPdf = async () => {
    try {
      setPdfBusy(true);
      const [{ pdf }, { AdFeedbackPdfDoc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/reports/AdFeedbackPdfDoc"),
      ]);
      const data = {
        platform: platformLabel,
        dateRange: dateRangeLabel,
        generatedAt: format(new Date(), "d MMM yyyy, HH:mm"),
        kpis: {
          totalLeads: kpis.totalLeads,
          invalidCount: kpis.invalidCount,
          closedWonCount: kpis.closedWonCount,
          closedLostCount: kpis.closedLostCount,
          conversionPct: kpis.conversionPct,
          spend: kpis.spend,
          revenue: kpis.revenue,
          cpl: kpis.cpl,
          cac: kpis.cac,
          roas: kpis.roas,
          netMargin: kpis.netMargin,
        },
        invalidReasons,
        lostReasons,
        notes: representativeNotes.map((n) => ({
          feedbackType: n.feedbackType,
          reason: n.reason,
          notes: n.notes,
          when: format(n.when, "d MMM yyyy"),
        })),
        topDestinations,
      };
      const blob = await pdf(<AdFeedbackPdfDoc data={data} />).toBlob();
      triggerDownload(blob, `${fileStem}.pdf`);
      toast.success("PDF ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setPdfBusy(false);
    }
  };

  if (!adFeedbackOn) {
    return (
      <AppLayout title="Ad Feedback">
        <Card className="border shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            This report is behind the <code>feature:ad_feedback</code> flag. Enable it from Settings → Features to view feedback aggregation + representative notes.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Ad Feedback">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
          <Button size="sm" onClick={downloadPdf} disabled={loading || pdfBusy}>
            <FileDown className="h-4 w-4 mr-2" />
            {pdfBusy ? "Preparing PDF…" : "PDF"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Volume</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <KpiTile label="Leads" value={kpis.totalLeads.toString()} />
            <KpiTile label="Closed Won" value={kpis.closedWonCount.toString()} tone="good" />
            <KpiTile label="Closed Lost" value={kpis.closedLostCount.toString()} tone="warn" />
            <KpiTile label="Invalid" value={kpis.invalidCount.toString()} tone="bad" />
            <KpiTile label="Conversion %" value={kpis.conversionPct !== null ? `${kpis.conversionPct.toFixed(1)}%` : "—"} />
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Financial</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <KpiTile label="Spend" value={kpis.spend > 0 ? formatINR(Math.round(kpis.spend)) : "—"} />
            <KpiTile label="Revenue" value={formatINR(Math.round(kpis.revenue))} />
            <KpiTile label="CPL" value={kpis.cpl !== null ? formatINR(Math.round(kpis.cpl)) : "—"} />
            <KpiTile label="CAC" value={kpis.cac !== null ? formatINR(Math.round(kpis.cac)) : "—"} />
            <KpiTile label="ROAS" value={kpis.roas !== null ? `${kpis.roas.toFixed(1)}x` : "—"} />
            <KpiTile
              label="Net Margin"
              value={kpis.spend > 0 || kpis.revenue > 0 ? formatINR(Math.round(kpis.netMargin)) : "—"}
              tone={kpis.netMargin < 0 ? "bad" : kpis.spend > 0 ? "good" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ReasonsCard
              title="Why leads were marked INVALID"
              rows={invalidReasons}
              empty="No invalid-lead feedback captured in this window."
            />
            <ReasonsCard
              title="Why files were LOST"
              rows={lostReasons}
              empty="No closed-lost feedback captured in this window."
            />
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2 flex-row justify-between items-center">
              <CardTitle className="text-base">Representative notes</CardTitle>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Names, phone numbers and emails are scrubbed before display
              </div>
            </CardHeader>
            <CardContent>
              {representativeNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No free-text notes in this window.
                </p>
              ) : (
                <ul className="space-y-3">
                  {representativeNotes.map((n) => (
                    <li key={n.id} className="pl-3 border-l-2 border-border/60">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Badge variant="outline" className="text-[9px]">
                          {n.feedbackType === "invalid_lead" ? "Invalid" :
                           n.feedbackType === "closed_lost" ? "Lost" : "Won"}
                        </Badge>
                        <span>{n.reason}</span>
                        <span>·</span>
                        <span>{n.platform}</span>
                        <span>·</span>
                        <span>{format(n.when, "dd MMM")}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/90 italic">&ldquo;{n.notes}&rdquo;</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Top destinations driving conversion</CardTitle></CardHeader>
            <CardContent>
              {topDestinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No closed-won conversions for this platform in this window.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destination</TableHead>
                      <TableHead className="text-right">Closed Won</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topDestinations.map((d) => (
                      <TableRow key={d.name}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

/* ───────── tiny components ───────── */

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const color =
    tone === "good" ? "text-[hsl(var(--ridge))]" :
    tone === "warn" ? "text-[hsl(var(--horizon))]" :
    tone === "bad"  ? "text-destructive" :
    "text-foreground";
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ReasonsCard({ title, rows, empty }: { title: string; rows: { reason: string; count: number }[]; empty: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.reason}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{r.reason}</span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold tabular-nums">{r.count}</span>
                    {total > 0 && <> · {((r.count / total) * 100).toFixed(0)}%</>}
                  </span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--blaze))] rounded"
                    style={{ width: total > 0 ? `${(r.count / total) * 100}%` : 0 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default AdFeedbackReport;
