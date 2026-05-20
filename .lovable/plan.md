## Problem

In Lead Management, after adding a lead, toggling Hot, or editing a lead, the list does not update until a manual refresh.

Two root causes:

1. **Query-key mismatch.** The list fetches with keys `["leads_page", ...]` and `["leads_chip_counts", ...]`, but mutations call `queryClient.invalidateQueries({ queryKey: ["leads"] })`. React Query treats this as a different key, so nothing is refetched.
2. **No realtime subscription.** Changes made elsewhere (other tabs, other users, automations, public form submissions via the edge function) never reach the open list.

## Fix

### 1. Correct the invalidations (LeadManagement.tsx, LeadDetail.tsx)
Replace every `invalidateQueries({ queryKey: ["leads"] })` with invalidations that actually match the list queries:

```ts
queryClient.invalidateQueries({ queryKey: ["leads_page"] });
queryClient.invalidateQueries({ queryKey: ["leads_chip_counts"] });
```

(React Query does prefix matching, so passing the base key is enough — no need to list filter args.)

Apply at the 4 invalidation sites: create lead, hot toggle in list, save in LeadDetail, hot toggle in LeadDetail.

### 2. Add a Supabase realtime subscription on the `leads` table

Create a small hook `src/hooks/useRealtimeInvalidate.ts`:

```ts
useEffect(() => {
  const ch = supabase
    .channel(`rt-${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      keys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
    })
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [table]);
```

Use it in:
- `LeadManagement.tsx` → table `leads`, invalidate `["leads_page"]` and `["leads_chip_counts"]`.
- `LeadDetail.tsx` → table `leads` (filtered by id) and `lead_timeline` (filtered by lead_id), invalidate `["lead", id]` and `["lead_timeline", id]`.

### 3. Enable realtime on the tables (migration)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_timeline;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_timeline REPLICA IDENTITY FULL;
```

(Guarded with `DO $$ ... EXCEPTION WHEN duplicate_object` so re-running is safe.)

## Result

- Add lead / hot toggle / edit / disposition change → list and detail update instantly without a page refresh.
- Updates from other users, other browser tabs, and incoming leads via the public form also appear live.

## Out of scope

No UI changes, no schema changes beyond enabling realtime, no changes to other modules (cashflow, vendors, etc.) — can be extended later using the same hook if you want.
