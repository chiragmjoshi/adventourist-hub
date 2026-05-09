## Goal

Serve the public site at `adventourist.in` and the admin/CMS at `admin.adventourist.in`, while keeping everything in one Lovable project (and one Lovable Cloud backend). Hostinger is only the domain registrar — nothing gets deployed there.

## Why this approach

- Lovable Cloud (backend, edge functions, DB) is already hosted by Lovable. There is no separate "backend server" to deploy on Hostinger.
- One Lovable project can be served from multiple custom domains. Both domains hit the same React app; we use the hostname to decide what's reachable.
- Splitting into two projects would mean duplicating code, two publish flows, and drift between site and admin. Not worth it.

## What gets built

### 1. Hostname-based route gating (code change)

Add a small `HostnameGuard` wrapper in `src/App.tsx`:

- On `admin.adventourist.in` → only `/admin/*` and `/admin/login` etc. are reachable. Hitting `/`, `/trips`, `/about-us`, `/l/:slug` etc. → redirect to `https://adventourist.in<path>`.
- On `adventourist.in` (and `www.adventourist.in`) → only public routes. Any `/admin/*` request → redirect to `https://admin.adventourist.in<path>`.
- On preview URLs (`*.lovable.app`, `localhost`) → no gating, everything works (so the editor preview still works).

Logic lives in one file, reads `window.location.hostname`, runs before `<Routes>`.

### 2. Auth redirects updated

Anywhere we currently use `window.location.origin` for Supabase auth redirects (login, signup, password reset, accept-invite), make sure on the admin host it stays on `admin.adventourist.in`. Since redirects already use `window.location.origin`, this works automatically once users land on the admin host — no code change needed beyond verifying.

Add `https://admin.adventourist.in/*` and `https://adventourist.in/*` to Supabase Auth → URL Configuration → Redirect URLs (done via Cloud settings).

### 3. SEO / canonical

- Public pages: canonical `https://adventourist.in/...`
- Admin pages: add `<meta name="robots" content="noindex, nofollow">` (admin shouldn't be indexed).
- `robots.txt` / sitemap reference only `adventourist.in`.

### 4. Domain connection in Lovable

After the code change is deployed:

1. Publish the project (required before connecting custom domains).
2. **Project Settings → Domains → Connect Domain** → add `adventourist.in`. Add `www.adventourist.in` as a second entry, set `adventourist.in` as **Primary** (www redirects to apex).
3. Repeat: add `admin.adventourist.in`.
4. At Hostinger DNS, add the records Lovable shows:
   - `A  @       185.158.133.1`
   - `A  www     185.158.133.1`
   - `A  admin   185.158.133.1`
   - `TXT _lovable  lovable_verify=...` (value from Lovable)
5. Wait for verification + SSL (usually minutes, up to 72h).

### 5. Email / DNS on Hostinger

Hostinger continues to host MX, SPF, DKIM, DMARC for email — those records stay untouched. We only add the A records above. Email keeps working.

## Out of scope

- Splitting the repo.
- Deploying anything to Hostinger.
- Changing backend, database, or edge functions.

## Trade-offs

- Both surfaces share one bundle, so the public site downloads admin route code lazily only if you import-split. If you want to hard-strip admin code from the public bundle, that's a follow-up using `React.lazy` per route group (recommended later, not blocking).
- A user who somehow types `/admin` on `adventourist.in` is redirected, not 404'd. Fine for a private CMS.

## Deliverable in implement step

- New `src/lib/hostname.ts` with host constants + helpers.
- Edit `src/App.tsx` to wrap routes with `HostnameGuard`.
- Add `noindex` meta on admin pages (single helper in admin layout).
- Instructions printed in chat for the DNS records to paste into Hostinger.
