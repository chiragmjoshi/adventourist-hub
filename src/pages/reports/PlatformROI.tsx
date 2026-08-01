import { useState, useEffect, useMemo } from "react";
import { Download, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
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
    leads.forEach((l) => {
      const row = bucket((l as any)[field] || "Direct");
      row.leads++;
      if (isClosed(l)) row.closed++;
    });
    cashflows.forEach((cf) => {
      const lead = attributedLead(cf);
      const key = lead ? ((lead as any)[field] || "Direct") : "Unattributed";
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
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
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
        </>
      )}
    </AppLayout>
  );
};

export default PlatformROI;
