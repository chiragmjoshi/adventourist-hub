<!--
Before opening this PR, read docs/CONTRIBUTING.md (if present) and the phased
rollout plan in docs/ROLLOUT_PLAN.md.
-->

## What

<!-- One or two sentences describing the change. -->

- Linked plan item: `#` (phase/task from `docs/ROLLOUT_PLAN.md`)
- Linked issue: `Fixes #` / `Refs #`

## Risk level

- [ ] **Low** — UI/code only, no schema change, no edge function, no RLS, no auth
- [ ] **Medium** — additive schema change (new table/column), new edge function, or new RLS policy that only adds access
- [ ] **High** — destructive schema change, auth flow, RLS tightening, cron schedule, or any change that could lock users out

High-risk PRs must be deployed behind a feature flag or in audit mode for ≥48 h on staging before promoting.

## Pre-merge checks

- [ ] `tsc --noEmit` passes locally
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Playwright smoke suite passes (CI)
- [ ] Any new user-visible behaviour is behind a `feature_flags` entry
- [ ] Supabase migration (if any) runs cleanly on a shadow DB
- [ ] If RLS/auth change: audit-mode / permissive policy left in place for one release cycle
- [ ] Secrets added via Supabase project secrets, **not** committed anywhere

## Rollback plan

<!--
How do we revert this cleanly?
- Code-only change → `git revert <merge-commit>`.
- Schema change → paste the reverse SQL here; it will ship as a follow-up migration.
- Edge function → previous version is still deployable in the Supabase dashboard.
- Feature-flagged change → flip the flag off (no deploy needed).
-->

## Testing done

<!--
- Manual flows exercised
- Screenshots / recordings
- Which org/user you tested against
-->

## Notes for reviewer

<!-- Anything surprising, follow-up tasks, known gaps. -->
