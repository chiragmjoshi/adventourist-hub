## Goal
Clean up the production lead and customer database before going live: fix typo emails, delete internal/test leads, and remove obviously-fake mobile numbers.

## 1. Fix typo emails (auto-correct in place)

Apply targeted UPDATEs to both `leads.email` and `customers.email` for well-known typos. No row deletion — just text replacement.

| Typo pattern | Corrected to |
|---|---|
| `…@gmail.co` (missing `m`) | `…@gmail.com` |
| `…@gmail.con` | `…@gmail.com` |
| `…@gmailc.com` | `…@gmail.com` |
| `…@gmai.com` | `…@gmail.com` |
| `…@yahoo.co` (only when no further TLD) | `…@yahoo.com` |

Affected rows (verified):
- `leads`: 7 rows (e.g. `udaichib200@gmail.co`, `shankarawate557@gmai.com`, `smahima112@yahoo.co`, `moinhashmi9839@gmai.com`, `rajivmalhotra22110@gmail.co`)
- `customers`: 17 rows (mostly `@gmail.con` variants + `@gmailc.com`)

Other obvious junk (`thisistest@gmail.com`, `Test@test.com`, `rup@pradeep.com`) is not corrected — those rows are deleted in step 2.

## 2. Delete internal / test leads

Delete from `leads` (and their `lead_timeline`, `lead_tracking`, `automations_log`, `lead_comments` rows) where they match clearly-internal/test signatures. Real customers with similar names (e.g. "Pradeep Kumar Jain", "Chirag Mittal", "Minali Sanghvi") are kept.

Deletion targets (~24 leads):
- Any lead with email ending in `@adventourist.in` → 5 leads (Minal Joshi ×4, Pradeep ×1)
- Email `thisistest@gmail.com` → 7 leads ("Pradeep Tets")
- Email `Test@test.com` → 1 lead ("Test")
- Email `rup@pradeep.com` → 1 lead ("Rup 4 Pradeep Test")
- Email `minal.rathod@gmail.com` with name "Minal Chirag Joshi" → 8 leads (test submissions by Minal)
- Name `Chirag Joshi` with NULL email → 2 leads

NOT deleted (look like real customers, please confirm if any should also go):
- "Pradeep" with `pradeep.m1967@gmail.com`, `pg34157@gmail.com`, `sarfaraz1791@gmail.com`, `praddep@gmailc.com` — these are external leads named Pradeep, not the internal Pradeep
- "Chirag" with `chiragshah20011@rediffmail.com` (4 leads) — looks like an external customer
- "Rupesh Tiwari" `rupeshtiwari1998@gmail.com`, "Tejinder Pal Singh", "Minal Singh", "Minal Patel" (aaravconsultancy1) — appear external
- "Rupesh", "Rupesh Khiste", "Rupesh Shinde"

If you want any of these also removed, tell me which and I'll add them.

## 3. Remove dummy mobile numbers

Set `customers.mobile = NULL` (keep the customer record, just blank the bad number) for:
- Repeating-digit patterns: `9999999999`, `1111111111`, `0000000000`, `1234567890`, `0123456789` → 2 rows confirmed (`9999999999` ×1, plus repeating-digit checks)
- Mobile shorter than 10 digits after stripping non-digits → 55 rows (mostly 5-digit fragments like `99870`, `70454`, `92`, `973` — clearly corrupted)

Total: ~57 customer rows get `mobile` blanked. Names/emails/leads preserved.

## Technical notes
- All three steps run as `supabase--insert` SQL (UPDATE + DELETE), not migrations — schema unchanged.
- Deletes are done in dependency order: `lead_timeline` → `lead_tracking` → `automations_log` → `lead_comments` → `leads`.
- Run as one transaction per step so a failure rolls back cleanly.
- After execution I'll output before/after counts for verification.

## Open question
Should I also delete the `@adventourist.in` test leads' associated `customers` rows, or keep them (in case they're linked elsewhere)? Default plan: keep customers, only delete leads.