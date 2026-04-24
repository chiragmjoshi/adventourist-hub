# CMS Production-Launch Overhaul

A single-pass implementation covering all 11 fix areas, followed by an end-to-end test simulation and pass/fail report.

The work is grouped into shared infrastructure first (so every form benefits), then per-module changes, then seed data + E2E validation.

---

## Phase 0 — Shared infrastructure (build once, reuse everywhere)

Create reusable primitives in `src/components/forms/`:

- **`StepProgress.tsx`** — numbered/check dots, clickable, accepts `steps[]`, `current`, `completed[]`, `onJump`.
- **`StepNav.tsx`** — Back / Save Draft / Next (or Save) footer bar with conditional visibility.
- **`useUnsavedChanges.ts`** — hook that:
  - Tracks `isDirty` (deep-equal vs initial snapshot).
  - Blocks in-app navigation via React Router `useBlocker`, shows shadcn AlertDialog ("Stay" / "Leave without saving").
  - Adds `beforeunload` listener for browser back/refresh/close.
  - Exposes `markClean()` after save.
- **`useAutoSaveDraft.ts`** — runs a passed `saveFn` every 60 s while dirty; surfaces `lastSavedAt`.
- **`UnsavedBadge.tsx`** — small "● Unsaved changes" pill for page headers.

Create `src/components/EmptyState.tsx` — centered SVG icon, heading, body copy, CTA button. One component, reused across every list.

Create `src/components/CommandPalette.tsx` — Cmd/Ctrl+K full-screen modal using shadcn `Command`. Mounted once in `AppLayout`. Queries `leads`, `itineraries`, `vendors`, `trip_cashflow` (top 3 each, debounced 200 ms), groups results, navigates on select.

---

## Phase 1 — Multi-tab form upgrades (Fix 1 + Fix 2)

Apply the StepProgress + StepNav + useUnsavedChanges + useAutoSaveDraft pattern to:

- **`VendorEdit.tsx`** — 3 tabs: Basic / Banking & Tax / Contacts.
- **`ItineraryEdit.tsx`** — 5 tabs: Basics / Inclusions / Day Plan / Media & SEO / Publish.
- **`LandingPageEdit.tsx`** — 5 tabs: Basics / Hero & Form / Content / Tracking / Publish.
- **`TripCashflowEdit.tsx`** — gets the unsaved-changes + autosave hook (already tabbed).

Each tab footer renders `<StepNav>`. Header renders `<StepProgress>` + `<UnsavedBadge>`.

---

## Phase 2 — Lead Management power UX (Fix 3)

DB migration: `ALTER TABLE leads ADD COLUMN follow_up_date date;`

In `LeadManagement.tsx`:

- **Row-hover 3-dot menu** (shadcn `DropdownMenu`): Change Status / Change Disposition / Assign to (each with submenu of values), Open WhatsApp, View Details.
- **WhatsApp icon button** in actions column → builds `https://wa.me/<mobile>?text=...` with template using lead name, agent name (from `useAuth`), destination name. Strips non-digits from mobile, prepends `91` if missing.
- **Bulk-select**: checkbox column + select-all header. Floating bottom toolbar appears when ≥1 selected: Assign to, Change status, Mark as Invalid, Export selected (CSV), Deselect all.
- **File-closed prompt**: when `sales_status` mutation succeeds with value `file_closed`, open AlertDialog → "Create Cashflow" navigates to `/trip-cashflow/new?lead_id=<id>`.

In `LeadDetail.tsx` sidebar:

- **Follow-up Date picker** with quick-chips: Today / Tomorrow / Next Week / Custom (shadcn Calendar in Popover). Writes to `leads.follow_up_date`.

`TripCashflowEdit.tsx` already reads `lead_id` from search params — extend to pre-fill traveller_name, mobile, destination_id, itinerary_id, assigned_to from the lead.

---

## Phase 3 — Vendor ↔ Cashflow connection (Fix 4)

DB migration on `trip_cashflow_vendors`:
- Add `payment_status text default 'unpaid'` (unpaid | partial | paid)
- Add `amount_paid numeric default 0`

In `TripCashflowEdit.tsx` vendor lines:
- Replace free-text vendor name with shadcn `Combobox` populated from `vendors` (display: `${name} — ${vendor_code}`).
- On select, auto-fill `service_type` from vendor's `services[0]` and store contact in line description if blank.
- Add Payment Status segmented control + conditional `amount_paid` input when "Partial".
- GST toggle and margin/cost inputs use `useMemo` to recompute selling price + margin amount + margin % live (no save needed).

---

## Phase 4 — Dashboard (Fix 5)

Replace mocked KPI cards in `Dashboard.tsx` with live queries:

- **Total Leads** + green "+X today" sub-count.
- **Conversion Rate** card — `(file_closed / total) * 100`, 30-day delta. Hidden for role `sales` via `useRBAC`.
- **Revenue This Month** — hidden for role `sales`.
- **Today's Follow-ups** widget — list of leads where `follow_up_date = today` AND `assigned_to = currentUser`. Each row shows name + WhatsApp icon button.

---

## Phase 5 — Empty states (Fix 6)

Drop `<EmptyState>` into: `LeadManagement`, `ItineraryList`, `VendorList`, `LandingPageList`, `TripCashflowList`, `Automations` log tab. CTA routes to the respective `/new` page.

---

## Phase 6 — Global search Cmd+K (Fix 7)

Mount `<CommandPalette>` in `AppLayout`. Global keydown listener. Handled in Phase 0.

---

## Phase 7 — Automations reliability (Fix 8)

- Create edge function `supabase/functions/process-automations/index.ts` (verify_jwt = false). Logic mirrors `src/services/queueProcessor.ts` but server-side using service role key and AiSensy credentials from secrets.
- Enable `pg_cron` + `pg_net` extensions; insert cron job (every 15 min) via `supabase--read_query`/insert tool with the function URL + anon key. Per skill rules: use the insert tool, not migrations.
- In `Automations.tsx` template card: add "Send test message" button → prompt for mobile → POST to `process-automations` with `{test: true, template_id, mobile}`.
- Confirm AiSensy API key secret exists; if missing, request it via `add_secret`.

---

## Phase 8 — User management polish (Fix 9)

In `UserManagementPage.tsx` table:
- Add **Last Login** column — query `auth.users.last_sign_in_at` via existing `admin-user-management` edge function (extend its list endpoint).
- Add **Status** badge (Active / Inactive) using `users.is_active`.
- After role change mutation succeeds: toast + inline notice "User must log out and back in for changes to take effect."
- **Force Logout** button → calls extended admin edge function which runs `supabase.auth.admin.signOut(userId)`.

---

## Phase 9 — Itinerary Day-by-Day display fix (Fix 11)

Audit `ItineraryEdit.tsx` Day-by-Day Plan tab:
- Confirm it reads `form.itinerary_days` (jsonb array). On load, parse `existing.itinerary_days` (Supabase returns it already-parsed as JS array, but guard against string).
- Render each day in shadcn `Accordion`, collapsed by default. Header = `Day {n} — {title}`. Body = description + meal icons (B/L/D) + accommodation.
- Empty state: "No day plan added yet. Click + Add Day to start building the itinerary."
- Verify CSV import path actually persists to `itinerary_days` column (likely the bug — it may be writing to a different field or returning string instead of jsonb).

---

## Phase 10 — Seed dummy E2E data (Fix 10)

Use the **insert tool** (not migrations) to seed:
- 3 vendors (Desert Camp Jaisalmer, Royal Rajasthan Tours, Taj View Hotel Agra) with full bank/GST/contact details.
- 1 trip_cashflow record linked to the most recent `file_closed` lead (or create a test lead if none exists), with 2 vendor lines, 25% margin, status `in_progress`.
- 1 landing_page (Rajasthan Heritage Tour) linked to the matching destination + itinerary.

---

## Phase 11 — E2E test execution & report

After all code is deployed, run a manual simulation by:
1. Querying the database to confirm seed rows exist and FK references resolve.
2. Calling the public-api and admin edge functions with curl to confirm endpoints respond.
3. Visiting key preview routes via the browser tool only if a step's correctness is otherwise unverifiable.
4. Producing a numbered pass/fail table for all 14 E2E steps and addressing any failure inline.

Final message: **"CMS is ready for production"** once every step passes.

---

## Technical notes (for implementation phase)

- All new DB columns added via the migration tool; all data inserts via the insert tool.
- `useUnsavedChanges` will use React Router v6's `useBlocker` (already on v6 per existing routing).
- Combobox for vendor selection: build on shadcn `Command` + `Popover` (no new dep).
- Edge function `process-automations` uses `corsHeaders`, validates body with Zod, reads `AISENSY_API_KEY` from secrets.
- `AppLayout` will mount CommandPalette inside `<TooltipProvider>` to keep keyboard handlers global.
- Role gating uses existing `useRBAC().role`; no new permission strings needed.

## Out of scope (call out before approving)

- No redesign of brand/colors — uses existing tokens from `mem://design/brand`.
- No new auth providers — Google OAuth status unchanged.
- Reports pages other than Conversion are not touched (Conversion already exists).

---

**Approve this plan and I will execute all 11 fixes, seed the test data, run the E2E flow, and report pass/fail per step in a single build pass.**