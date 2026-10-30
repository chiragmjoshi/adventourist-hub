import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { FeedbackType } from "@/hooks/useLeadFeedback";

/* ────────────────────────────────────────────────────────────────────
   Phase A4 — PDF document for the Ad Feedback report.
   Pure data in, PDF tree out. Deliberately shipped as its own module
   so the heavy @react-pdf/renderer bundle can be dynamically imported
   from AdFeedbackReport only when the user clicks Download PDF.
   ──────────────────────────────────────────────────────────────────── */

export interface PdfData {
  platform: string;
  dateRange: string;
  generatedAt: string;
  kpis: {
    totalLeads: number;
    invalidCount: number;
    closedWonCount: number;
    closedLostCount: number;
    conversionPct: number | null;
    spend: number;
    revenue: number;
    cpl: number | null;
    cac: number | null;
    roas: number | null;
    netMargin: number;
  };
  invalidReasons: { reason: string; count: number }[];
  lostReasons: { reason: string; count: number }[];
  notes: { feedbackType: FeedbackType; reason: string; notes: string; when: string }[];
  topDestinations: { name: string; count: number }[];
}

const colors = {
  fg: "#1A1D2E",
  muted: "#6B7280",
  subtle: "#9CA3AF",
  border: "#EBE4D7",
  blaze: "#FF6F4C",
  horizon: "#FDC436",
  ridge: "#056147",
  bad: "#DC2626",
};

const S = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.fg,
  },
  brandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { fontSize: 10, fontFamily: "Helvetica-Bold", color: colors.blaze, letterSpacing: 1 },
  brandSmall: { fontSize: 8, color: colors.subtle, textTransform: "uppercase", letterSpacing: 0.8 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 9, color: colors.muted, marginBottom: 10 },
  section: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  row: { flexDirection: "row", gap: 6, marginBottom: 6 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 7,
  },
  kpiLabel: { fontSize: 7, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  kpiValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  twoCol: { flexDirection: "row", gap: 10 },
  halfCol: { flex: 1 },
  reasonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  reasonLabel: { fontSize: 9 },
  reasonCount: { fontSize: 9, fontFamily: "Helvetica-Bold", color: colors.muted },
  note: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: 8,
    marginBottom: 8,
  },
  noteMeta: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  noteText: { fontSize: 9, fontStyle: "italic", lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: colors.subtle,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  destRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
});

const fINR = (n: number): string => {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

const feedbackLabel: Record<FeedbackType, string> = {
  invalid_lead: "Invalid",
  closed_lost: "Lost",
  closed_won: "Won",
};

export const AdFeedbackPdfDoc = ({ data }: { data: PdfData }) => {
  const k = data.kpis;
  const netMarginText = k.spend > 0 || k.revenue > 0 ? fINR(k.netMargin) : "—";
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.brandBar}>
          <Text style={S.brand}>ADVENTOURIST</Text>
          <Text style={S.brandSmall}>Ad feedback · internal</Text>
        </View>

        <Text style={S.h1}>Ad Feedback Report</Text>
        <Text style={S.subtitle}>
          {data.platform} · {data.dateRange} · Generated {data.generatedAt}
        </Text>

        <Text style={S.section}>Volume</Text>
        <View style={S.row}>
          <View style={S.kpi}><Text style={S.kpiLabel}>Leads</Text><Text style={S.kpiValue}>{k.totalLeads}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Closed Won</Text><Text style={[S.kpiValue, { color: colors.ridge }]}>{k.closedWonCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Closed Lost</Text><Text style={[S.kpiValue, { color: colors.horizon }]}>{k.closedLostCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Invalid</Text><Text style={[S.kpiValue, { color: colors.bad }]}>{k.invalidCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Conversion %</Text><Text style={S.kpiValue}>{k.conversionPct !== null ? `${k.conversionPct.toFixed(1)}%` : "—"}</Text></View>
        </View>

        <Text style={S.section}>Financial</Text>
        <View style={S.row}>
          <View style={S.kpi}><Text style={S.kpiLabel}>Spend</Text><Text style={S.kpiValue}>{k.spend > 0 ? fINR(k.spend) : "—"}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Revenue</Text><Text style={S.kpiValue}>{fINR(k.revenue)}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>CPL</Text><Text style={S.kpiValue}>{k.cpl !== null ? fINR(k.cpl) : "—"}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>CAC</Text><Text style={S.kpiValue}>{k.cac !== null ? fINR(k.cac) : "—"}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>ROAS</Text><Text style={S.kpiValue}>{k.roas !== null ? `${k.roas.toFixed(1)}x` : "—"}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Net Margin</Text><Text style={[S.kpiValue, { color: k.netMargin < 0 ? colors.bad : k.spend > 0 ? colors.ridge : colors.fg }]}>{netMarginText}</Text></View>
        </View>

        <View style={S.twoCol}>
          <View style={S.halfCol}>
            <Text style={S.section}>Why leads were marked invalid</Text>
            {data.invalidReasons.length === 0 ? (
              <Text style={{ fontSize: 9, color: colors.muted }}>No invalid-lead feedback.</Text>
            ) : data.invalidReasons.map((r) => (
              <View key={r.reason} style={S.reasonRow}>
                <Text style={S.reasonLabel}>{r.reason}</Text>
                <Text style={S.reasonCount}>{r.count}</Text>
              </View>
            ))}
          </View>
          <View style={S.halfCol}>
            <Text style={S.section}>Why files were lost</Text>
            {data.lostReasons.length === 0 ? (
              <Text style={{ fontSize: 9, color: colors.muted }}>No closed-lost feedback.</Text>
            ) : data.lostReasons.map((r) => (
              <View key={r.reason} style={S.reasonRow}>
                <Text style={S.reasonLabel}>{r.reason}</Text>
                <Text style={S.reasonCount}>{r.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={S.section}>Representative notes (anonymised)</Text>
        {data.notes.length === 0 ? (
          <Text style={{ fontSize: 9, color: colors.muted }}>No free-text notes captured in this window.</Text>
        ) : data.notes.map((n, i) => (
          <View key={i} style={S.note} wrap={false}>
            <Text style={S.noteMeta}>
              {feedbackLabel[n.feedbackType]} · {n.reason} · {n.when}
            </Text>
            <Text style={S.noteText}>&ldquo;{n.notes}&rdquo;</Text>
          </View>
        ))}

        <Text style={S.section}>Top destinations driving conversion</Text>
        <View style={S.tableHeader}>
          <Text style={{ flex: 1 }}>Destination</Text>
          <Text style={{ width: 60, textAlign: "right" }}>Closed Won</Text>
        </View>
        {data.topDestinations.length === 0 ? (
          <Text style={{ fontSize: 9, color: colors.muted, marginTop: 4 }}>No conversions in this window.</Text>
        ) : data.topDestinations.map((d) => (
          <View key={d.name} style={S.destRow}>
            <Text style={{ flex: 1 }}>{d.name}</Text>
            <Text style={{ width: 60, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{d.count}</Text>
          </View>
        ))}

        <View style={S.footer} fixed>
          <Text>Adventourist · Private feedback for ad-platform optimisation.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
