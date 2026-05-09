# Plan: 18 CMS Fixes & Enhancements

This is a very large batch (18 items, including 2 brand-new modules). To deliver safely without regressing existing features, I'll group the work into **4 phases**. Each phase ends in a working, testable state. Please confirm the phase order — or tell me if you want me to do the whole thing in one pass anyway (will take longer and is harder to QA).

---

## Phase 1 — Quick fixes & UX polish (low risk)

1. **Itinerary "+ Add Day" button** moved below last day card (#2)
2. **Lead Management status tabs** redesigned — full background colour, bold active text (#4)
3. **Lead Management table** — add Destination & Itinerary columns (#5)
4. **Lead Management date filter** — auto-close popover on selection (#6)
5. **Add New Lead** — remove Travel Date field (#7)
6. **Sales Report** — add Back/breadcrumb to Reports hub (#11)
7. **Vendor — Add New Vendor white screen** — debug & fix crash (#12)
8. **Itinerary row actions** — wire up Preview / Duplicate / Archive (#3)

## Phase 2 — Form rebuilds (medium risk)

9. **Itinerary Inclusions/Exclusions** rich-text editor (Tiptap) (#1)
10. **Trip Cashflow** — convert to 4-step wizard (#8)
11. **Trip Cashflow Step 1** — DD/MM/YYYY dates + "Customized Trip" with PDF upload (#9)
12. **Trip Cashflow Pricing** — Margin in ₹ instead of % (recompute selling price) (#10)
13. **Landing Pages** — convert to multi-step wizard (#13)
14. **Landing Pages Gallery** — direct image upload with progress + thumbnails (#14)
15. **Landing Pages Testimonials** — search & select up to 3 (#15)
16. **Destinations form** — Best Months / Themes / Suitable For / multi-image upload / testimonials (#16)

## Phase 3 — New module: Reminders & Calendar (#17)

- New table `reminders` (title, type, lead_id, due_date, due_time, notes, status)
- Sidebar entry, list + month/week calendar view
- "Today's Reminders" widget on Dashboard
- Done / Snoozed actions

## Phase 4 — New module: Trips Kanban (#18)

- Sidebar entry "Trips Board"
- New `trip_stage` column on `trip_cashflow` (or reuse `status`)
- Drag-and-drop columns: Trip Sold → Booking Reconfirmation → Briefing Call → On Tour Support → Feedback Call → Trip Completed
- Card → opens lead detail

---

## Technical notes

- Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-highlight`, `@tiptap/extension-text-align`) for #1
- `@dnd-kit/core` for #18 Kanban
- DD/MM/YYYY via `date-fns` `format(d, "dd/MM/yyyy")` + parsing helpers
- Reminders & destination testimonials need DB migrations
- Destination images: extend existing `gallery` array or use `itinerary-images` bucket
- Landing-page direct upload uses existing `itinerary-images` storage bucket
- Customized Trip PDF uses existing `cashflow-docs` bucket

---

## Recommendation

Start with **Phase 1** now (8 items, ~1 pass), then proceed phase-by-phase so you can validate each batch in the preview before I touch the next. Reply with which phase(s) to execute, or say "all" to run end-to-end.
