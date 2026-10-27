import { useState, useEffect, useMemo } from "react";
import { Download, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import MarketingSpendDialog from "@/components/MarketingSpendDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { displayPlatform } from "@/lib/formatLabel";
import { useFlag } from "@/hooks/useFlag";
import {
  MarketingSpend,
  useDeleteMarketingSpend,
  useMarketingSpends,
} from "@/hooks/useMarketingSpends";
import {
  calcTrip,
  DEFAULT_REPORT_FROM,
  DEFAULT_REPORT_TO,
  effectiveDate,
  fetchCashflowVendors,
  fetchCashflows,
  fetchLeads,
  inRange,
  isClosed,
  vendorCostMap,
} from "@/lib/reporting";

const PlatformROI = () => {
  const [from, setFrom] = useState(DEFAULT_REPORT_FROM);
  const [to, setTo] = useState(DEFAULT_REPORT_TO);
  const [leads, setLeads] = useState<any[]>([]);
  const [allCashflows, setAllCashflows] = useState<any[]>([]);
  const [cfVendors, setCfVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Phase M2 — the ROI route is already admin+super_admin only (see
  // ROUTE_PERMISSIONS in useRBAC), so the whole page audience is the one
  // we want for the dialog + delete action; we only need the flag gate.
  const marketingSpendOn = useFlag("feature:marketing_spend");
  const [spendDialogOpen, setSpendDialogOpen] = useState(false);
  const [editingSpend, setEditingSpend] = useState<MarketingSpend | null>(null);
  const [spendToDelete, setSpendToDelete] = useState<MarketingSpend | null>(null);
  const spendsQuery = useMarketingSpends();
  const deleteSpend = useDeleteMarketingSpend();

  // Resolve landing_page_id → name once. Includes inactive pages so a spend
  // row for a now-archived page still renders its real name instead of "—".
  const [landingPageNames, setLandingPageNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!marketingSpendOn) return;
    (async () => {
      const { data } = await supabase.from("landing_pages").select("id, name");
      const m = new Map<string, string>();
      (data || []).forEach((lp: { id: string; name: string }) => m.set(lp.id, lp.name));
      setLandingPageNames(m);
    })();
  }, [marketingSpendOn]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [l, cf] = await Promise.all([fetchLeads(from, to), fetchCashflows()]);
      setLeads(l);
      setAllCashflows(cf);
      setCfVendors(await fetchCashflowVendors(cf.map((c: any) => c.id)));
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const cashflows = useMemo(
    () => allCashflows.filter((cf) => inRange(effectiveDate(cf), from, to)),
    [allCashflows, from, to]
  );

  const costByCf = useMemo(() => vendorCostMap(cfVendors), [cfVendors]);

  const leadById = useMemo(() => {
    const map = new Map<string, any>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  /* Only 7 of ~211 trips carry a lead_id, so fall back to traveller_code
     before giving up and bucketing revenue as Unattributed. */
  const leadByTravellerCode = useMemo(() => {
    const map = new Map<string, any>();
    leads.forEach((l) => {
      if (l.traveller_code && !map.has(l.traveller_code)) map.set(l.traveller_code, l);
    });
    return map;
  }, [leads]);

  const attributedLead = (cf: any) =>
    (cf.lead_id ? leadById.get(cf.lead_id) : null) ||
    (cf.traveller_code ? leadByTravellerCode.get(cf.traveller_code) : null) ||
    null;

  const buildTable = (field: string) => {
    const map: Record<string, { key: string; leads: number; closed: number; revenue: number }> = {};
    const bucket = (k: string) => {
      if (!map[k]) map[k] = { key: k, leads: 0, closed: 0, revenue: 0 };
      return map[k];
    };
    // Phase 4B.1: use displayPlatform() so a null value renders as "Direct"
    // consistently across every report. "Unattributed" stays distinct —
    // it marks a cashflow with no linked lead at all.
    leads.forEach((l) => {
      const row = bucket(displayPlatform((l as any)[field]));
      row.leads++;
      if (isClosed(l)) row.closed++;
    });
    cashflows.forEach((cf) => {
      const lead = attributedLead(cf);
      const key = lead ? displayPlatform((lead as any)[field]) : "Unattributed";
      bucket(key).revenue += calcTrip(cf, costByCf.get(cf.id) ?? 0).sellingExGst;
    });
    return Object.values(map).sort((a, b) => b.leads - a.leads || b.revenue - a.revenue);
  };

  const unattributedRevenue = useMemo(
    () => cashflows.filter((cf) => !attributedLead(cf))
      .reduce((s, cf) => s + calcTrip(cf, costByCf.get(cf.id) ?? 0).sellingExGst, 0),
    [cashflows, costByCf, leadById, leadByTravellerCode]
  );

  const sections = [
    { title: "Platform Breakdown", data: buildTable("platform") },
    { title: "Channel Breakdown", data: buildTable("channel") },
    { title: "Campaign Type Breakdown", data: buildTable("campaign_type") },
    { title: "Ad Group Breakdown", data: buildTable("ad_group") },
  ];

  const bestPlatform = sections[0].data.filter((r) => r.key !== "Unattributed")[0]?.key || "—";
  const bestChannel = sections[1].data.filter((r) => r.key !== "Unattributed")[0]?.key || "—";

  return (
    <AppLayout title="Platform ROI Report">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <div className="flex items-center gap-2">
          {marketingSpendOn && (
            <Button
              size="sm"
              onClick={() => { setEditingSpend(null); setSpendDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Marketing Spend
            </Button>
          )}
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Best Platform</p><p className="text-lg font-bold mt-1 truncate">{bestPlatform}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Best Channel</p><p className="text-lg font-bold mt-1 truncate">{bestChannel}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-2xl font-bold mt-1">{leads.length}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Closed</p><p className="text-2xl font-bold mt-1">{leads.filter(isClosed).length}</p></CardContent></Card>
          </div>

          {unattributedRevenue > 0 && (
            <div className="flex items-start gap-2 mb-6 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {formatINR(Math.round(unattributedRevenue))} of revenue could not be matched to a lead
                (mostly legacy trips imported without a lead link) and is shown in the
                <strong className="font-medium"> Unattributed</strong> row.
              </span>
            </div>
          )}

          {sections.map((s) => (
            <Card key={s.title} className="border shadow-sm mb-6">
              <CardHeader className="pb-2"><CardTitle className="text-base">{s.title}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{s.title.split(" ")[0]}</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Closed</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Conversion %</TableHead>
                      <TableHead className="text-right">Avg Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.data.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell className="font-medium">{r.key}</TableCell>
                        <TableCell className="text-right">{r.leads}</TableCell>
                        <TableCell className="text-right">{r.closed}</TableCell>
                        <TableCell className="text-right">{formatINR(Math.round(r.revenue))}</TableCell>
                        <TableCell className="text-right">{r.leads > 0 ? ((r.closed / r.leads) * 100).toFixed(1) : 0}%</TableCell>
                        <TableCell className="text-right">{r.closed > 0 ? formatINR(Math.round(r.revenue / r.closed)) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {/* Phase M2 — spend ledger. Shown only when the flag is on; the
              aggregates that use these rows (CPL/CAC/ROAS) land in M3. */}
          {marketingSpendOn && (
            <Card className="border shadow-sm mb-6">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Marketing Spend History</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Rows are stored once and prorated to any date filter by the ROI tiles (M3).
                      Edits take effect immediately.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {spendsQuery.data && spendsQuery.data.length > 0 && (
                      <>
                        <div><strong className="text-foreground tabular-nums">{formatINR(Math.round(spendsQuery.data.reduce((s, r) => s + Number(r.amount), 0)))}</strong> logged</div>
                        <div>across {spendsQuery.data.length} {spendsQuery.data.length === 1 ? "row" : "rows"}</div>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {spendsQuery.isLoading ? (
                  <div className="h-20 bg-muted/40 animate-pulse rounded" />
                ) : spendsQuery.data && spendsQuery.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>Landing page</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Ad group</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spendsQuery.data.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{displayPlatform(row.platform)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.landing_page_id
                              ? (landingPageNames.get(row.landing_page_id) ?? "—")
                              : <em>— (platform-wide)</em>}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(row.start_date), "d MMM yy")} – {format(new Date(row.end_date), "d MMM yy")}
                          </TableCell>
                          <TableCell className="text-xs">{row.campaign_name || "—"}</TableCell>
                          <TableCell className="text-xs">{row.ad_group || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(Math.round(Number(row.amount)))}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit marketing spend"
                                onClick={() => { setEditingSpend(row); setSpendDialogOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete marketing spend"
                                onClick={() => setSpendToDelete(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No marketing spend logged yet. Click <strong>Add Marketing Spend</strong> above to start.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <MarketingSpendDialog
        open={spendDialogOpen}
        onOpenChange={setSpendDialogOpen}
        initial={editingSpend}
      />

      <AlertDialog open={!!spendToDelete} onOpenChange={(open) => !open && setSpendToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete marketing spend?</AlertDialogTitle>
            <AlertDialogDescription>
              {spendToDelete && (
                <>
                  This removes <strong>{formatINR(Math.round(Number(spendToDelete.amount)))}</strong> of logged
                  spend for <strong>{displayPlatform(spendToDelete.platform)}</strong>
                  {" "}({format(new Date(spendToDelete.start_date), "d MMM yy")} – {format(new Date(spendToDelete.end_date), "d MMM yy")}).
                  This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSpend.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSpend.isPending}
              onClick={async () => {
                if (!spendToDelete) return;
                try {
                  await deleteSpend.mutateAsync(spendToDelete.id);
                  toast.success("Marketing spend deleted");
                  setSpendToDelete(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              {deleteSpend.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default PlatformROI;
