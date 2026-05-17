## Goal
Run a full E2E pass across all 10 modules using disposable seed data, produce a pass/fail report, fix any failures, then clean everything up.

## Approach

Pure UI clicking through 10 modules in the browser would take 100+ tool calls and is fragile (modals, async, dropdowns). Instead I'll use a **hybrid strategy** that matches what the test is actually verifying:

| Layer | What it proves | How |
|---|---|---|
| **DB seed** | Records exist with correct FKs and column values | `supabase--insert` SQL |
| **Code audit** | Auto-populate logic, tab navigation, pre-fill, trigger prompts work | `code--view` on the relevant page/component files (already in context: `LeadDetail.tsx`, `LeadManagement.tsx`, `ItineraryEdit.tsx`, `VendorEdit.tsx`, `LandingPageEdit.tsx`, `TripCashflowEdit.tsx`, `Automations.tsx`, `Dashboard.tsx`, reports, `UserManagementPage.tsx`) |
| **DB verify** | Triggers, generated codes, foreign-key hydration, cascades work | `supabase--read_query` |
| **Targeted UI** | Only for items that can ONLY be proven in browser (e.g. info-box renders, badge colors, tab navigation, KPI cards load) | `browser--navigate_to_sandbox` + `browser--act` for ~6–8 spot checks, not all 40 |

This gives the same confidence as full UI E2E at ~20% the tool-call cost.

## Execution plan

### Phase 1 — Seed (5 SQL inserts)
1. Insert destination `Test Destination E2E` with months/themes/suitable_for
2. Insert itinerary `Test E2E Trip 4 Nights & 5 Days` (status published, 3 days, highlights, SEO)
3. Insert vendor `Test Vendor E2E` (let trigger generate vendor_code)
4. Insert landing page `Test Landing Page E2E` with destination_id + itinerary_id FKs
5. Insert leads 1 & 2 with proper destination_id/itinerary_id, then insert `lead_timeline` "lead_created" rows

Verify seed: SELECT counts + FK resolution.

### Phase 2 — Module tests (groups A–J)

For each group, run the most efficient combination:

- **A. Destination** — DB verify columns saved
- **B. Itinerary** — DB verify + read `ItineraryEdit.tsx` to confirm destination autopopulate logic exists; UI spot-check the editor for the info box
- **C. Vendor** — DB verify all tabs' fields persisted; read `VendorEdit.tsx` Next-button logic
- **D. Landing page** — DB verify FKs + attribution; read `LandingPageEdit.tsx` for tab nav
- **E. Lead** — UI spot-check list (verify destination + itinerary columns now render after the earlier fix); simulate E4/E5 status+disposition changes via DB UPDATE + check `lead_timeline` triggers; E8 "file_closed prompt" verified by reading `LeadDetail.tsx`
- **F. Cashflow** — Insert cashflow + vendor line via SQL with the documented math (verify selling price calc in `TripCashflowEdit.tsx` source); verify cashflow_code generated
- **G. Automations** — Insert rule via SQL; verify `Automations.tsx` lists it (UI spot check); test-send button: code review only (sending real WA to 9999999999 would be wasteful — note as "manual verify" in report)
- **H. Reports** — DB query the same aggregations the reports use; spot-check one report renders
- **I. Dashboard** — UI spot-check KPI cards load and lead count includes seeds
- **J. User management** — DB query users table, verify 5 expected accounts and roles

### Phase 3 — Report
Print the standard format report. Each row: PASS / FAIL with specific evidence. Failures list every issue found with the file/line to fix.

### Phase 4 — Fix failures
For every FAIL, switch to build mode (the user will), make the code fix, re-verify. **In this plan-mode pass I will only enumerate fixes; I won't edit files.**

### Phase 5 — Cleanup (1 SQL block, FK-safe order)
Delete in order: automation rule → trip_cashflow_vendors → trip_cashflow → lead_timeline + lead_tracking + automations_log + lead_comments → leads → landing_pages → vendors → itineraries → destinations. Verify with 5 count queries that every test row is gone.

## What I need from you before starting

**One confirmation:** Are you okay with the hybrid (DB + code audit + spot-UI) approach above, or do you specifically want me to drive every single test (A1 through J2) through the browser UI? The hybrid is faster and equally rigorous for catching schema/logic bugs; full-UI is slower but exercises every click path including dropdowns and toast messages.

Default if you just say "go": **hybrid**. Total est: ~25–35 tool calls end-to-end including cleanup.