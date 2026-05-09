## Plan: `submit-lead` Edge Function

Create a public POST endpoint at `supabase/functions/submit-lead/index.ts` for website lead capture.

### Conflict to flag
The `leads` table already has a `generate_traveller_code` trigger that auto-fills `traveller_code` in the format `M2600001` (month-letter + YY + 5-digit seq), using `traveller_code_sequence`. Your spec asks for a different format `ADV-2026-001` generated inside the edge function.

I will follow your spec: the function generates `ADV-YYYY-###` and passes it explicitly on insert (the trigger only runs when the value isn't supplied — actually it always overwrites; see "Technical notes" for how I'll handle that).

If you'd rather keep the existing trigger format, say so and I'll skip the in-function generation.

### Behavior

1. **CORS**: `Access-Control-Allow-Origin: *`, methods `POST, OPTIONS`, headers `authorization, content-type, apikey, x-client-info`. Handle `OPTIONS` preflight.
2. **Validate**: require `name` and `mobile`; otherwise `400 { error: 'Name and mobile are required' }`.
3. **Resolve destination** (optional): if `destination_name` provided, query `destinations` by name (case-insensitive `ilike`), use `id` if found; ignore otherwise.
4. **Generate traveller code**: call a new SQL function `public.generate_adv_traveller_code()` (SECURITY DEFINER) that atomically increments `traveller_code_sequence` keyed by `year_prefix = 'ADV-YYYY'` and returns `ADV-YYYY-001` (zero-padded to 3, grows beyond if needed). Atomicity via `INSERT ... ON CONFLICT DO UPDATE ... RETURNING last_sequence`.
5. **Insert lead** with service-role client (bypasses RLS); `channel` defaults to `'website'` if missing → maps to organic per your earlier requirement.
6. **Insert timeline row**: `event_type='lead_created'`, `note='Lead submitted from website'`, `metadata={channel, landing_page_id, utm_*}`.
7. **Respond** `200 { success: true, traveller_code, lead_id }`.
8. **Errors**: log with `console.error`, return `500 { error: 'Failed to create lead' }`.

### Technical notes

- **Trigger override**: The existing `generate_traveller_code` trigger overwrites `NEW.traveller_code` unconditionally. To honor your ADV format, the migration will modify the trigger to skip when `NEW.traveller_code` is already set (matching the pattern used by `generate_cashflow_code` / `generate_vendor_code`). Existing leads are unaffected.
- **Migration created in same task**:
  - New SQL function `generate_adv_traveller_code()` returning text.
  - Patch `generate_traveller_code` trigger to early-return when `NEW.traveller_code IS NOT NULL`.
- **Edge function config**: `verify_jwt = false` in `supabase/config.toml` (public endpoint).
- **Env**: uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (already configured).
- **Validation**: lightweight inline checks (no Zod) — only `name`/`mobile` required per spec.
- **No new dependencies.**

### Files
- `supabase/migrations/<ts>_adv_traveller_code.sql` (new)
- `supabase/functions/submit-lead/index.ts` (new)
- `supabase/config.toml` (add `[functions.submit-lead] verify_jwt = false`)

### Open question
Confirm the traveller-code conflict resolution: **(A)** use ADV-YYYY-### as you specified (I'll patch the existing trigger to allow it), or **(B)** keep the current `M2600001` style and have the function just return whatever the trigger generated.