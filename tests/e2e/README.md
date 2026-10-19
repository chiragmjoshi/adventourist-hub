# End-to-end smoke suite

These tests exercise the critical user flows against a running staging
deployment. They are **not** run on every PR — they require a live Supabase
backend. Run them manually before promoting `develop → main`, or wire a
GitHub Actions job that spins up a staging deploy and then invokes
`npm run test:e2e`.

## Running locally

1. Start the dev server (and have a Supabase project reachable):

   ```sh
   npm run dev
   ```

2. In another terminal, with env vars set:

   ```sh
   export PLAYWRIGHT_BASE_URL=http://localhost:5173
   export E2E_ADMIN_EMAIL=you@example.com
   export E2E_ADMIN_PASSWORD='<password>'
   npx playwright install chromium   # first time only
   npx playwright test
   ```

3. View the HTML report:

   ```sh
   npx playwright show-report
   ```

## Running against staging

```sh
export PLAYWRIGHT_BASE_URL=https://staging.adventourist.in
export E2E_ADMIN_EMAIL=…
export E2E_ADMIN_PASSWORD=…
npx playwright test
```

## Flows covered

| File                          | Flow                                             |
| ----------------------------- | ------------------------------------------------ |
| `01-public-landing.spec.ts`   | Public homepage loads and primary CTAs render     |
| `02-enquiry-form.spec.ts`     | Submits an enquiry via a landing page             |
| `03-admin-login.spec.ts`      | Signs in to `/admin` and sees the dashboard       |
| `04-create-lead.spec.ts`      | Creates a new lead from the leads table           |
| `05-create-cashflow.spec.ts`  | Creates a trip cashflow with one vendor line      |
| `06-send-test-email.spec.ts`  | Fires the test-email button in Settings           |

Each spec is self-contained — a failing test should never cascade. Tests
that need auth log in programmatically via a reusable `auth.setup.ts`
fixture (not yet wired; it's in Phase 0.3b, see ROLLOUT_PLAN.md).
