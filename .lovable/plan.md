## Where we are
After the last round, Performance moved from **57 → 61**. The remaining drags on the score, in order of impact:

| Issue | Size / time | Where it comes from |
|---|---|---|
| Lovable badge font (`CameraPla.woff2`) + `~flock.js` | 131 KiB + 8 KiB | `cdn.gpteng.co` — injected by Lovable on published sites |
| **Google Tag Manager + Facebook Pixel** | **613 KiB + 142 KiB** | NOT in this codebase — injected externally |
| Hero Unsplash image still oversized | 43 KiB wasted | 800×419 served for a 378×238 slot |
| `users` fetched 3× on initial load | ~3 KiB, but extends critical path to 4.4 s | `AuthProvider` runs on every host, including public; fires once for `getSession`, then again for `INITIAL_SESSION` / `TOKEN_REFRESHED` events |
| Render-blocking Google Fonts CSS | 400 ms FCP delay | `<link rel="stylesheet">` in `index.html` |
| Legacy JS transpile + `fbevents.js` polyfills | 12 KiB | Same FB pixel issue |

## What I'll do

### 1. Hide the Lovable badge
Call `set_badge_visibility(hide_badge: true)`. Removes the 131 KiB font + 8 KiB script from every public page. **Requires Pro plan** — if your workspace isn't Pro the call will be rejected and we skip this step.

### 2. Skip `AuthProvider` on the public host
Wrap `<AuthProvider>` in `src/App.tsx` so it only mounts on `admin` and `preview` hosts (matches what we already did for the automation worker + health check). On `www.adventourist.in` this stops all `supabase.auth.getSession()` traffic and the 3× `users?id=eq…` fetches. Admin routes are unaffected.

### 3. Shrink the hero card image
In `src/site/sections/HeroSection.tsx`, drop the Unsplash `w` from `800` to `480` and quality from `70` to `60`. Displayed slot is 378×238; 480px covers 1.25× DPR. Saves ~45 KiB per image, 4 images = ~180 KiB total on hover/auto-rotate.

### 4. Non-blocking Google Fonts
In `index.html`, switch the Inter stylesheet from a normal `<link rel="stylesheet">` to the standard preload-swap pattern:

```html
<link rel="preload" as="style" href="…/css2?family=Inter…" />
<link rel="stylesheet" href="…/css2?family=Inter…" media="print" onload="this.media='all'" />
<noscript><link rel="stylesheet" href="…/css2?family=Inter…" /></noscript>
```

Removes ~400 ms of render-blocking; text falls back to system fonts for ~1 frame then swaps to Inter.

## What I can't fix from code (needs your action)

### Google Tag Manager + Facebook Pixel
I grepped the entire repo for `GTM-NDHCWP9`, `AW-787`, `G-4K3LTMZZ3B`, `fbq`, `fbevents`, `googletagmanager`, `connect.facebook` — **zero matches**. Also checked the `settings` table in the database — none of those IDs are stored there either.

That means GTM and the Facebook Pixel are being injected outside this app. The likely sources:

1. **Cloudflare → Rules → Configuration Rules / Workers / Zaraz** — most likely. Cloudflare Zaraz often hosts GTM. Check Cloudflare dashboard → Zaraz, and any active Workers on `adventourist.in`.
2. **Cloudflare → Rules → "HTML Modifications" / "Email Obfuscation"** — uncommon but possible.
3. **A legacy script left in your DNS/HTML injection from the WordPress origin** if Cloudflare is still proxying to old infrastructure for some paths.

These two tags together are **755 KiB and ~120 ms of main-thread time** — bigger than every code-side fix combined. Removing them from Cloudflare/Zaraz will jump Performance significantly more than anything I can change in code.

If you want them kept for analytics but deferred, paste the GTM container ID and pixel ID and I'll add a "load on first interaction or after 5 s idle" loader inside `index.html` — but that only works if you also remove the external injection, otherwise both copies will load.

## Expected impact after these changes
- Performance: **61 → ~75** (with badge hidden + auth gated + fonts non-blocking).
- After also removing external GTM/FB pixel: **~90+**.
- LCP: 6.0 s → ~3 s.
- CLS / Best Practices unchanged (those need separate work — mostly the FB pixel polyfills account for the BP 58 score).
