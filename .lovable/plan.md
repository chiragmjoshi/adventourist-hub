# Fix Trips Kanban — ops workflow board

The current board is broken because it queries `travel_start` / `travel_end` but the columns are `travel_start_date` / `travel_end_date`. That throws and the page renders empty. We'll fix the bug and turn the board into a proper sales/ops workflow tool — call the traveller, log the call, set follow-ups, mark stage done — without drag-and-drop.

## Stages (unchanged)
Trip Sold → Booking Reconfirmation → Briefing Call → On Tour Support → Feedback Call → Trip Completed

## Card content
- Traveller name + cashflow code
- Destination chip + days remaining to travel start
- Travel dates (`travel_start_date` – `travel_end_date`)
- Pax count + assigned owner avatar
- **Last activity** chip: "Called 2d ago", "Reminder due tomorrow" or "No activity 5d" (red if stale per stage)
- Quick action row at bottom: **Call**, **Log call**, **Reminder**, **Mark stage done**

## Quick actions

### 1. Call (tel: link) + log call
- Phone icon → opens `tel:{mobile}` (mobile pulled from joined `leads` row via `lead_id`)
- Immediately opens "Log call" dialog with: outcome (Connected / No answer / Busy / Switched off), notes textarea, "Set follow-up" checkbox + datetime
- On submit: writes a row to `lead_timeline` (event_type=`call_logged`, links lead_id + metadata: outcome, trip_id, cashflow_code) and optionally creates a `reminders` row (reminder_type=`follow_up`, trip_id set, due_at set)
- Card "Last activity" chip refreshes to "Called just now"

### 2. Mark stage done
- Button advances `trip_stage` to the next column in sequence. Confirmation toast with Undo (5s).
- Logs to `lead_timeline` (event_type=`trip_stage_changed`, metadata: from→to, trip_id).
- Last stage ("Trip Completed") shows a checkmark instead of the button.

### 3. Reminder
- Small "+ Reminder" link → date/time picker → creates `reminders` row tied to `trip_id` so it surfaces on the existing Reminders page.

## Layout & UX
- Horizontal scroll columns (existing) but with sticky column headers and stage-specific accent colors (already defined).
- Column header shows count + a small "stale" indicator (e.g. "3 idle >5d") in red.
- Card click still opens trip detail (`/admin/trip-cashflow/{id}`) — only buttons trigger inline actions (use `e.stopPropagation()`).
- Search bar at top: filter by traveller / cashflow code / destination.
- Toggle: "Mine only" (filters by `assigned_to = current user`) — default ON for sales reps, OFF for admins.
- No drag-drop. Stage moves only via the explicit button. Removes accidental drops on mobile/touch.

## Stale thresholds (per stage, used for the red dot)
- Trip Sold: > 2 days without activity
- Booking Reconfirmation: > 1 day
- Briefing Call: > 3 days before travel_start_date
- On Tour Support: any unanswered call
- Feedback Call: > 2 days after travel_end_date

## Technical changes (single file, plus tiny tweaks)

`src/pages/TripsKanban.tsx` — full rewrite:
- Fix the SELECT: `travel_start_date, travel_end_date, pax_count, lead_id, leads:lead_id(mobile, name), destinations:destination_id(name), users:assigned_to(name, avatar_url)`
- Replace drag handlers with click-only buttons.
- Add `LogCallDialog` (local component) that writes to `lead_timeline` + optionally `reminders`.
- Add stage-advance helper that calls `supabase.from('trip_cashflow').update({ trip_stage: nextStage })` and inserts timeline event.
- Fetch latest `lead_timeline` event per lead in a second query (small leads list) to compute the "last activity" chip; cache via React Query.
- Search + "Mine only" filters operate client-side over the fetched list.

No DB migration needed — `lead_timeline`, `reminders`, and `trip_cashflow.trip_stage` already exist with the right columns. RLS already permits authenticated full access.

## Out of scope
- Sales-stage kanban for raw leads (separate ask)
- WhatsApp send (can be added later as another quick action)
- Inline editing of pax / dates (keep that on the trip detail page)
