# Make lead and closed-file numbers match everywhere

## What's wrong (checked against the database)
- **"Files Closed" is too high.** It counts every lead with status "File Closed" (306) **plus** every lead with disposition "Query Closed". But 1,136 of the "Query Closed" leads are marked **File Lost**. The dashboard shows 1,448 because of this, and conversion is inflated to 24.6%. The real figure is 306 closed files (about 5.2%), and there are 212 trips in Trip Cashflow.
- **The chip counts in Lead Management are too low.** File Closed 64, File Lost 844 and the other chips add up to far less than the 5,905 leads. The chips only count the first ~1,000 rows loaded, not all the leads that match your filters.
- **Total leads differ slightly** (5,896 on the dashboard vs 5,905 in Lead Management). The two pages use different date limits and treat leads with no date differently.

## Fix
1. **One rule for "closed":** sales status = File Closed. "Query Closed" stays a disposition only. A lead marked File Lost is never counted as closed. I'll make this change once in the shared counting code, so the Dashboard, the Sales, Conversion, Team, Platform ROI and Destination reports all pick it up.
2. **One rule for "lost":** sales status = File Lost, or a disposition of Plan Dropped, Not Interested, Booked Outside or Ghosted, and the lead isn't closed.
3. **Lead Management chips:** count from the full set of leads that match your filters, not just the first page. The sales status chips will then add up to the "leads match" total, with blank statuses shown as "No status".
4. **Same "All Time" window everywhere:** the dashboard, reports and Lead Management will use the same start and end dates, so total leads match.
5. **Revenue:** I'll check that the dashboard revenue, Revenue Report and Trip Cashflow totals use the same trips and the same date (booking date, then travel date) and give the same amount.

## End-to-end check
- I'll get the true numbers straight from the database for All Time, This Month, Last FY and one custom range: total leads, closed, lost, by status, revenue and trip count.
- Then I'll open the Dashboard, Lead Management and every report page in a browser for each of those ranges. Every number shown must match the database. I'll send you a comparison table, and anything that doesn't match gets fixed before I finish.

## Technical notes
- `src/lib/reporting.ts`: `isClosed` = File Closed status only. `isLost` excludes closed leads. Add a shared `countByStatus` helper.
- `LeadManagement.tsx`: work out the chip counts with paged queries over the full filtered set (`fetchAll`, or head-count queries per status).
- Line up the default date range and the handling of missing `created_at` in Dashboard and the reports.
- Nothing is changed in the database itself. This only changes how the numbers are counted.
