import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addMonths, format, parse, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatINR } from "@/lib/formatINR";
import { useFlag } from "@/hooks/useFlag";
import {
  ExpenseEntry, useDeleteExpenseEntry, useExpenseEntries, useStopRecurring,
} from "@/hooks/useExpenseEntries";
import ExpenseEntryDialog from "@/components/expenses/ExpenseEntryDialog";

/* ────────────────────────────────────────────────────────────────────────
   Phase E2 — Operating Expenses admin page.
   Behind feature:expense_entries. Admin + super_admin only.
   The month-selector arrows + the ?month=YYYY-MM search param make this
   deep-linkable (Phase E4 switches the Dashboard's expense popover to
   open /admin/expenses?month=... instead of inline-editing).
   ──────────────────────────────────────────────────────────────────────── */

const parseMonthParam = (raw: string | null): Date => {
  if (!raw) return startOfMonth(new Date());
  try {
    const d = parse(raw + "-01", "yyyy-MM-dd", new Date());
    if (isNaN(d.getTime())) return startOfMonth(new Date());
    return startOfMonth(d);
  } catch { return startOfMonth(new Date()); }
};

const Expenses = () => {
  const flagOn = useFlag("feature:expense_entries");
  const [searchParams, setSearchParams] = useSearchParams();
  const monthDate = useMemo(() => parseMonthParam(searchParams.get("month")), [searchParams]);
  const monthKey = format(monthDate, "yyyy-MM");
  const monthLabel = format(monthDate, "MMMM yyyy");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<ExpenseEntry | null>(null);
  const [entryToStopRecurring, setEntryToStopRecurring] = useState<ExpenseEntry | null>(null);

  const entriesQuery = useExpenseEntries(monthKey);
  const deleteEntry = useDeleteExpenseEntry();
  const stopRecurring = useStopRecurring();

  const setMonth = (d: Date) => {
    const next = new URLSearchParams(searchParams);
    next.set("month", format(d, "yyyy-MM"));
    setSearchParams(next, { replace: true });
  };

  /* Group by head for the per-head subtotals. Preserves master_values
     sort_order loosely by alpha-sorting since entries only know their
     head name string. */
  const grouped = useMemo(() => {
    const map = new Map<string, { total: number; rows: ExpenseEntry[] }>();
    (entriesQuery.data ?? []).forEach((e) => {
      if (!map.has(e.head)) map.set(e.head, { total: 0, rows: [] });
      const g = map.get(e.head)!;
      g.total += Number(e.amount);
      g.rows.push(e);
    });
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [entriesQuery.data]);

  const monthTotal = useMemo(
    () => (entriesQuery.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
    [entriesQuery.data]
  );

  if (!flagOn) {
    return (
      <AppLayout title="Operating Expenses">
        <Card className="border shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            This page is behind the <code>feature:expense_entries</code> flag. Enable it from Settings → Features to log line-item operating expenses.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Operating Expenses">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setMonth(subMonths(monthDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 min-w-[160px] text-center">
            <div className="text-base font-semibold">{monthLabel}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{monthKey}</div>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(monthDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 text-xs"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            This month
          </Button>
        </div>
        <Button size="sm" onClick={() => { setEditingEntry(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add expense
        </Button>
      </div>

      <Card className="border shadow-sm mb-6">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Entries for {monthLabel}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entriesQuery.data?.length ?? 0} rows · grouped by head · back-dated entries land in their own month
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Month total</div>
            <div className="text-xl font-bold tabular-nums">{formatINR(Math.round(monthTotal))}</div>
          </div>
        </CardHeader>
        <CardContent>
          {entriesQuery.isLoading ? (
            <div className="h-24 bg-muted/30 animate-pulse rounded" />
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No expenses logged for this month. Click <strong>Add expense</strong> to start.
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(([head, g]) => (
                <div key={head}>
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/60">
                    <h3 className="text-sm font-semibold">{head}</h3>
                    <span className="text-sm font-medium tabular-nums">{formatINR(Math.round(g.total))}</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Sub-head</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-right text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Flags</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                        <TableHead className="w-20 text-right text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.sub_head || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(r.entry_date), "d MMM")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatINR(Math.round(Number(r.amount)))}
                          </TableCell>
                          <TableCell>
                            {r.is_recurring && (
                              <Badge variant="outline" className="text-[10px]">
                                Recurring
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate" title={r.notes ?? ""}>
                            {r.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit expense"
                                onClick={() => { setEditingEntry(r); setDialogOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {r.is_recurring && r.recurring_group_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Stop recurring from this month"
                                  title="Stop recurring from this month"
                                  onClick={() => setEntryToStopRecurring(r)}
                                >
                                  <Repeat className="h-3.5 w-3.5 text-[hsl(var(--horizon))]" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete expense"
                                onClick={() => setEntryToDelete(r)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingEntry}
        defaultEntryDate={`${monthKey}-01`}
      />

      <AlertDialog open={!!entryToStopRecurring} onOpenChange={(open) => !open && setEntryToStopRecurring(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop recurring from this month?</AlertDialogTitle>
            <AlertDialogDescription>
              {entryToStopRecurring && (
                <>
                  This deletes <strong>{entryToStopRecurring.sub_head || entryToStopRecurring.head}</strong>{" "}
                  from <strong>{format(new Date(entryToStopRecurring.entry_date), "MMMM yyyy")}</strong> onward.
                  Past rows in the series stay as history. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopRecurring.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={stopRecurring.isPending}
              onClick={async () => {
                if (!entryToStopRecurring?.recurring_group_id) return;
                try {
                  await stopRecurring.mutateAsync({
                    recurringGroupId: entryToStopRecurring.recurring_group_id,
                    fromDate: entryToStopRecurring.entry_date,
                  });
                  toast.success("Recurring series stopped");
                  setEntryToStopRecurring(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not stop series");
                }
              }}
            >
              {stopRecurring.isPending ? "Stopping…" : "Stop recurring"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {entryToDelete && (
                <>
                  This removes <strong>{formatINR(Math.round(Number(entryToDelete.amount)))}</strong>{" "}
                  under <strong>{entryToDelete.head}</strong> ({entryToDelete.sub_head || "—"}) on{" "}
                  {format(new Date(entryToDelete.entry_date), "d MMM yyyy")}. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteEntry.isPending}
              onClick={async () => {
                if (!entryToDelete) return;
                try {
                  await deleteEntry.mutateAsync(entryToDelete.id);
                  toast.success("Expense deleted");
                  setEntryToDelete(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              {deleteEntry.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Expenses;
