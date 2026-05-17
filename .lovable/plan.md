## Lead Detail — full QC + restructure

Scope: `/admin/leads/:id`. Three real bugs + four structural changes.

---

### 1. Bugs to fix

**A. Cashflow modal doesn't update the lead.**
`QuickCashflowModal` only inserts into `trip_cashflow`. The lead row's `travel_date`, `destination_id`, `itinerary_id`, `pax_count` stay blank, so the "Current Enquiry" card looks empty even after Save.
Fix: in the same mutation, also `UPDATE leads SET destination_id, itinerary_id, travel_date, pax_count` for the source lead, and invalidate `["lead", id]`.

**B. Dead fields in Current Enquiry.**
`Proposed Price`, `Vendor Cost Price`, `Margin`, `Vendor` are hard-coded inputs with no state, no save, no DB column. They are confusing the user into thinking saved cashflow data should appear here.
Fix: remove them. Cost / margin / vendor live on Trip Cashflow only and are already shown in the Trips tab.

**C. Reminder added on lead detail isn't on /admin/reminders.**
Insert + invalidation are correct, but global react-query config is `staleTime: 5 min`, `refetchOnWindowFocus: false`. If the Reminders page was opened earlier in the session, the cached empty list can stick.
Fix on the Reminders page query:
- `staleTime: 0`
- `refetchOnMount: "always"`
- `refetchOnWindowFocus: true`

Also: `LeadDetail` references a `customer_tag` column that doesn't exist on `leads`. Remove the field (silent update failure today).

---

### 2. Tab restructure

Tabs become: **Current Enquiry · Trips · Activity**.

**Current Enquiry** (slimmed):
Destination · Itinerary · Travel Date · Pax · Created On · Internal Notes (existing textarea, now clearing after save so a fresh note can be typed).
Drop the cost/vendor block (point 1B).

**Trips** — convert the existing cards to a real table:
Columns: Destination · Itinerary · Booking Date · Travel Date · Pax · Selling Price · Cost · Margin (₹ + %) · Status · Cashflow Code → links to `/admin/trip-cashflow/:id`.
Keep the existing loyalty summary bar (Trips · Total Spend · Avg / Trip · Since). For `sales` role keep hiding Cost / Margin columns.
Data source unchanged — already gathers every cashflow for this traveller across all of their leads via traveller_code + email + mobile.

**Activity** (replaces Comments):
Move the existing Activity Timeline (currently rendered as a separate card below the tabs) into this tab. Delete the standalone timeline card. Comments tab + `lead_comments` reads removed — Internal Notes covers that need.

---

### 3. New Inquiry action

Header button "New Inquiry" next to "Remind". Creates a new row in `leads`:
- copy `traveller_code`, `name`, `email`, `mobile`, `customer_id`
- blank `destination_id`, `itinerary_id`, `travel_date`, `pax_count`, `notes`
- `sales_status: "New Lead"`, `disposition: "Not Contacted"`, `source: "crm"`, `assigned_to` = current user
- log `lead_created` in `lead_timeline`
- navigate to the new lead's detail page

That same traveller's Trips tab will continue to show all past trips because the trip query already pivots on traveller_code + email + mobile.

---

### Files touched

- `src/pages/LeadDetail.tsx` — drop dead fields, drop Comments tab + `lead_comments` query, move Timeline into Activity tab, clear notes textarea after save, add New Inquiry button + mutation, remove `customer_tag` field.
- `src/components/QuickCashflowModal.tsx` — also update parent lead row; invalidate `["lead", id]`.
- `src/pages/Reminders.tsx` — query options: `staleTime: 0`, `refetchOnMount: "always"`, `refetchOnWindowFocus: true`.

No schema migration. No changes to public site, no changes to other pages.

### Verification
- Mark a lead File Closed → fill modal → Save → lead detail's Destination / Itinerary / Travel Date / Pax now show those values and Trips tab shows the new row.
- Add a reminder from lead detail → open Reminders page → it appears in Today/Upcoming.
- Click "New Inquiry" on a lead with traveller_code ADV-… → lands on new lead, traveller_code preserved, Trips tab on either lead shows the same past trips.
- Type a note → Save Notes → textarea clears, lead.notes persisted (visible after refresh).
