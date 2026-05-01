# 13-Bug Production Fix Plan

> Note: your message was truncated mid–Bug 4. I'm reconstructing bugs 5–13 from the original 11-fix scope we agreed on (Batches 2 & 3). I'll list them explicitly below — please correct any that don't match before approving.

---

## Bug 1 — Lead Mgmt: date filter not working

`src/pages/LeadManagement.tsx`

- Add `fromDate` / `toDate` state, render `DateRangePicker` (already exists in `src/components/DateRangePicker.tsx`).
- In the leads `useQuery`, include `fromDate`/`toDate` in `queryKey`.
- Apply `.gte('created_at', fromDate.toISOString().slice(0,10))` and `.lte('created_at', toDate.toISOString().slice(0,10) + 'T23:59:59.999Z')`.
- Default range = last 90 days. "Reset" button clears to default.

## Bug 2 — Lead Mgmt: dropdown filters not working

- Audit each filter (Destination, Channel, Platform, Campaign, Disposition, Sales Status). Each must:
  - Be in `queryKey` so React Query refetches on change.
  - Apply `.eq()` only when value is not `"all"` / empty.
- Combine with date filter using AND (chained `.eq()` calls).
- "Reset filters" button resets all dropdown state + date range.

## Bug 3 — Itinerary editor: Next/Back navigation

`src/pages/ItineraryEdit.tsx`

- Replace plain `<Tabs>` with `StepProgress` (top) + `StepNav` (bottom of each `TabsContent`) using the shared components already built.
- Steps: `summary | media | details | days | seo`.
- Next scrolls form to top; last step shows "Save & Publish".
- Track `completedSteps` (Set) — mark step done when user clicks Next.
- Wire `useUnsavedChanges` + `useAutoSaveDraft`.

## Bug 4 — Itinerary > Media: image upload broken (file + URL)

- Create migration: bucket `itinerary-images` (public) + RLS:
  - public SELECT, authenticated INSERT/UPDATE/DELETE.
- Build `<ImageUploader>` component in `src/components/forms/ImageUploader.tsx`:
  - Drag-and-drop + click-to-upload → uploads to `itinerary-images/{id}/hero.{ext}` via `supabase.storage.from('itinerary-images').upload(..., { upsert: true })`, gets `getPublicUrl`, writes to `hero_image`.
  - URL paste field with "Use URL" button → validates http(s), writes directly to `hero_image`.
  - Shows preview thumbnail + Remove button.
- Reuse for `gallery[]` (multi-upload, append to array).
- Wire into Itinerary Media tab; same component used by Destinations/Landing later.

## Bug 5 — Landing Page editor: Next/Back navigation (5 tabs)

`src/pages/LandingPageEdit.tsx`

- Same `StepProgress` + `StepNav` treatment as Bug 3.
- Steps: `basics | hero | content | form | seo` (verify against existing tab keys; adjust to match).
- Last step CTA: "Save & Publish".

## Bug 6 — Trip Cashflow editor: Next/Back + payment status UI

`src/pages/TripCashflowEdit.tsx`

- Multi-step layout (Traveller → Vendors → Billing → Review).
- In Vendors step, surface new `payment_status` (Unpaid/Partial/Paid badge) + `amount_paid` numeric input per vendor row. Auto-flip status when `amount_paid >= cost_per_pax_incl_gst * pax`.

## Bug 7 — Itinerary Day-by-Day Plan: not rendering

- Current `itinerary_days` is `jsonb`. The editor likely treats it as text.
- New `<DayPlanEditor>`: array of `{ day, title, description, meals, stay }` with add/remove/reorder.
- On save, persist as JSON array. On load, parse; if string, attempt `JSON.parse` then fallback to empty.
- Detail view (`PublicItineraryDetail`, admin preview) renders ordered cards Day 1 … Day N.

## Bug 8 — Lead Mgmt power UX (bulk + WhatsApp + follow-up)

- Add row checkboxes + header "select all (filtered)".
- Bulk action bar: Assign to user, Change disposition, Change sales_status, Send WhatsApp template (logged via existing `automation_queue`, no live send), Export CSV.
- "Follow-up" date column using new `follow_up_date` field; inline date picker; overdue rows highlighted.
- Hot-lead toggle (`is_hot`) inline.

## Bug 9 — Dashboard widgets + role-gated revenue KPI

`src/pages/Dashboard.tsx`

- KPIs: Total Leads (period), Hot Leads, Conversions, Revenue (₹). Revenue card hidden when `useRBAC().role === 'sales'`.
- Charts: Leads-over-time (line), Leads-by-platform (bar), Disposition funnel.
- Date range filter shared with Lead Mgmt.
- Empty states using `EmptyState`.

## Bug 10 — Cmd+K global command palette

- New `src/components/CommandPalette.tsx` using `cmdk` (already in shadcn `command.tsx`).
- Hotkey listener in `AppLayout`: `Cmd/Ctrl+K`.
- Searches: leads (by name/mobile/traveller_code), itineraries, destinations, vendors, landing pages. Routes to detail page on select.
- Quick actions: "Create lead", "New itinerary", "New cashflow".

## Bug 11 — Empty states everywhere

- Audit list pages (Leads, Destinations, Itineraries, Landing Pages, Vendors, Cashflow, Reports). Replace bare empty tables with `<EmptyState>` (icon + title + helper + primary CTA).

## Bug 12 — User Management polish + role enforcement

`src/pages/UserManagementPage.tsx`

- Inline role editor (Admin/Sales/Ops) with confirm dialog.
- Activate/deactivate toggle.
- Invite user flow already exists — verify it returns proper error on duplicate email.
- Block last-admin demotion at UI + via check in `admin-user-management` edge function.

## Bug 13 — Automations cron + E2E walkthrough

- Edge function `process-automation-queue` (already wired? verify) — runs every 5 min, picks `automation_queue` rows where `scheduled_for <= now() AND status='pending'`, logs to `automations_log`, marks `sent` (no live AiSensy call — log payload only, per earlier decision).
- Add `supabase/config.toml` cron block for the function.
- E2E: walk all 14 steps from the original spec, screenshot each, fix on the fly, then output a pass/fail table.

---

## Technical notes

- All editors use shared `StepProgress`, `StepNav`, `useUnsavedChanges`, `useAutoSaveDraft`, `UnsavedChangesDialog` already created in Batch 1.
- New shared components: `ImageUploader`, `DayPlanEditor`, `CommandPalette`, `BulkActionBar`.
- Migration adds `itinerary-images` storage bucket + RLS only — no schema changes (follow_up_date, payment_status already migrated).
- No live WhatsApp — payloads logged to `automations_log` only.
- Revenue KPI gated via `useRBAC()` (already available).

## Delivery order (single pass, but file-by-file)

1. Migration: `itinerary-images` bucket + RLS.
2. Shared components: `ImageUploader`, `DayPlanEditor`, `BulkActionBar`, `CommandPalette`.
3. LeadManagement (Bugs 1, 2, 8).
4. ItineraryEdit (Bugs 3, 4, 7).
5. LandingPageEdit (Bug 5).
6. TripCashflowEdit (Bug 6).
7. Dashboard (Bug 9).
8. AppLayout: Cmd+K wiring (Bug 10).
9. List pages: empty states (Bug 11).
10. UserManagementPage (Bug 12).
11. Automation cron + config.toml (Bug 13).
12. E2E walkthrough + pass/fail table.

## Confirm before I proceed

- Bugs 5–13 above are reconstructed from our prior agreed scope because your message was cut off. If your real bugs 5–13 differ, paste the rest and I'll revise this plan before coding.
