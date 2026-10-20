# Adventourist Hub — Rollout plan

This document is the single source of truth for sequencing and safety of changes.
Every PR MUST reference a specific task from this plan.

The CRM is live, so every change follows these rules:

1. **Expand → migrate → contract.** No destructive migration goes out alone.
   Add new column/table first, backfill, dual-write, cut over, then drop.
2. **One concern per PR.** Each PR maps to one numbered task.
3. **Branch model.** `main` (prod) ← `develop` (staging) ← `feat/<id>-<slug>`.
   Every PR targets `develop`. Weekly promotion `develop → main`.
4. **Required checks before merge.** `tsc --noEmit`, ESLint, Vitest, Playwright
   smoke, Supabase migration dry-run, one human review.
5. **DB migrations are append-only once merged.** Never rewrite a committed
   migration — new change = new migration.
6. **RLS changes ship in audit mode first.** Add a parallel permissive policy,
   log denies for ≥7 days, then flip to strict.
7. **Feature flags for anything user-visible.** New modules land dark and are
   enabled per-org/per-user via the `feature_flags` table.
8. **Backup before every prod migration.** Supabase manual snapshot + daily
   backup verified.

---

## Phase 0 — Foundation (unblocks everything else)

| #   | Task                                                               | PR |
| --- | ------------------------------------------------------------------ | -- |
| 0.1 | Harden `.gitignore` + add PR template                              |    |
| 0.2 | GitHub Actions CI (typecheck + lint + test + build)                |    |
| 0.3 | Playwright smoke suite (scaffold)                                  |    |
| 0.4 | Staging Supabase project (manual, outside repo)                    |    |
| 0.5 | `error_logs` table + React `ErrorBoundary`                         |    |
| 0.6 | `feature_flags` table + `useFlag` hook                             |    |
| 0.7 | Supabase types regeneration script (`scripts/gen-supabase-types.sh`) |  |

## Phase 1 — Critical security + user-blocking bugs

| #    | Task                                                                | PR |
| ---- | ------------------------------------------------------------------- | -- |
| 1.1  | RBAC `super_admin` fallback → null (`src/hooks/useRBAC.ts:33-34`)   |    |
| 1.2  | Fix invite / reset-password redirect URLs                           |    |
| 1.3  | CORS allowlist on edge functions                                    |    |
| 1.4  | Sanitize admin-authored HTML with DOMPurify                         |    |
| 1.5  | Consent banner + GTM/pixel gating                                   |    |
| 1.6  | Landing-page conversion filter bug (Title Case)                     |    |
| 1.7  | Normalize status/disposition event names                            |    |
| 1.8  | Delete dead `getStories/getStoryBySlug`                             |    |
| 1.9  | Dedupe toaster (keep Sonner only)                                   |    |
| 1.10 | Preview-host AuthProvider edge case                                 |    |

## Phase 2 — Data integrity + reliability

| #    | Task                                                             | PR |
| ---- | ---------------------------------------------------------------- | -- |
| 2.1  | Additional-docs persistence + orphan-upload fix (`trip_cashflow_documents`) | |
| 2.2  | Transactional vendor save (RPC `upsert_cashflow_vendors`)        |    |
| 2.3  | Server-side automation cron + row claim                          |    |
| 2.4  | Dashboard safety guards + expense delete                         |    |
| 2.5  | Report bugs (timezone, deps, margin math, filter-ignoring charts) |   |
| 2.6  | Normalize platform / status / date labels site-wide              |    |
| 2.7  | Password policy consistency                                      |    |
| 2.8  | Replace native `confirm()` with `AlertDialog`                    |    |
| 2.9  | Enquiry honeypot + Turnstile                                     |    |
| 2.10 | Fix OfflineBanner setTimeout leak                                |    |

## Phase 3 — Type safety + form validation

| #   | Task                                                              | PR |
| --- | ----------------------------------------------------------------- | -- |
| 3.1 | Remove `as any` casts in services/lib                             |    |
| 3.2 | Remove `as any` in page components (1 PR per page)                |    |
| 3.3 | Flip tsconfig to `strict: true`                                   |    |
| 3.4 | Zod + react-hook-form on all forms (1 PR per form)                |    |
| 3.5 | Unit tests for pure modules                                       |    |

## Phase 4 — UX + accessibility + mobile

| #    | Task                                                           | PR |
| ---- | -------------------------------------------------------------- | -- |
| 4.1  | Delete dead files (Index.tsx, PlaceholderPages.tsx, NavLink)   |    |
| 4.2  | Shared `<PageHeader>` + remove per-page back-arrows            |    |
| 4.3  | Shared wizard pattern + unified auto-save                      |    |
| 4.4  | Standardize date/label formatting                              |    |
| 4.5  | Design-token sweep (no inline hex)                             |    |
| 4.6  | Replace hardcoded placeholder strings                          |    |
| 4.7  | Responsive tables + `<ResponsiveTable>` component              |    |
| 4.8  | Accessibility: htmlFor, aria-label, focus rings, skip link     |    |
| 4.9  | Image helper + lazy loading + explicit sizes                   |    |
| 4.10 | Fix testimonials dead-feature in landing templates             |    |

## Phase 5 — Core new features (quote → booking → invoice)

| #   | Task                                                           | PR |
| --- | -------------------------------------------------------------- | -- |
| 5.1 | Multi-currency core (`currencies`, `exchange_rates`, `money.ts`) |  |
| 5.2 | Quotation builder (flag `feature:quotes`)                      |    |
| 5.3 | Lead Kanban (flag `feature:lead_kanban`)                       |    |
| 5.4 | Bookings module (flag `feature:bookings`)                      |    |
| 5.5 | Invoicing + Razorpay (flag `feature:invoicing`)                |    |
| 5.6 | Document vault + expiry alerts                                 |    |
| 5.7 | Audit logs + GDPR/DPDP endpoints                               |    |

## Phase 6 — Growth features

| #   | Task                                                           | PR |
| --- | -------------------------------------------------------------- | -- |
| 6.1 | Customer self-service portal                                   |    |
| 6.2 | Vendor portal + RFQ                                            |    |
| 6.3 | Marketing automation sequences + drip + SMS                    |    |
| 6.4 | Reviews + Google deep-link + sentiment                         |    |
| 6.5 | Bulk import / export / bulk edit                               |    |
| 6.6 | Unified communication log / omnichannel inbox                  |    |
| 6.7 | Calendar across trips/reminders/follow-ups                     |    |
| 6.8 | Commission tracking                                            |    |
| 6.9 | Group bookings                                                 |    |

## Phase 7 — Scale, polish, platformization

| #   | Task                                                           | PR |
| --- | -------------------------------------------------------------- | -- |
| 7.1 | Server-side pagination + dashboard materialized view           |    |
| 7.2 | Memoization + lazy-load heavy libs                             |    |
| 7.3 | PWA / offline support                                          |    |
| 7.4 | i18n (en, hi, mr)                                              |    |
| 7.5 | AI assistant sidebar                                           |    |
| 7.6 | Integration hub + Zoho two-way sync                            |    |
| 7.7 | White-label / multi-tenant                                     |    |
| 7.8 | Final test coverage push                                       |    |

---

## Rollback method

- **Code:** `git revert <merge-commit>` on `main` → auto-deploy. PRs stay small.
- **Schema:** every migration ships with reverse SQL in the PR description. The
  reverse is applied via a new "revert" migration, never by rewriting the file.
- **RLS:** old policy co-exists with the new one until the new one has run in
  audit mode for ≥7 days with zero deny-logs; then drop the old one in a
  follow-up migration.
- **Edge functions:** Supabase keeps the previous deployment — re-deploy the
  prior version in one click.
- **Feature flags:** flip off in `feature_flags` — no deploy needed. This is
  the fastest kill-switch for any Phase 5+ feature.

## Deploy windows

- **Default:** Tue–Thu, 11:00 IST (low traffic, full working day for rollback).
- **Never on:** Friday after 15:00 IST, weekends, holidays, trip-departure days
  (large pre-trip reminder spike at 20:00 IST).
