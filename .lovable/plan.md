## Plan: Robust User Management — Invite, Reset Password, Delete

### Current State (Issues)
- "Invite User" only inserts a row in `public.users` — no auth account is created, no email sent. The user can never actually log in.
- No way to **delete** a user
- No way to **resend invite** or **reset password**
- No confirmation dialogs for destructive actions
- `public.users.id` is not linked to `auth.users.id`, so RBAC and ownership checks are fragile

### Goal
Make User Management actually functional: real invites via email, password reset, resend invite, and safe delete — all through a secure admin-only edge function (uses service role; never expose to client).

---

### Step 1: Edge Function `admin-user-management` (service-role)

A single edge function with action-based routing, callable only by `super_admin`. It verifies the caller's JWT, looks up their role in `public.users`, and only then performs the privileged action via the Supabase Admin API.

**Actions:**
| Action | What it does |
|---|---|
| `invite` | `auth.admin.inviteUserByEmail(email, { redirectTo: <app>/accept-invite, data: { name, role, mobile } })`. On success, upsert `public.users` row with the returned `auth.users.id` as `id`, `is_active = false`. |
| `resend_invite` | Same as invite — re-sends invitation email. |
| `reset_password` | `auth.admin.generateLink({ type: 'recovery', email })` and email it OR call `auth.resetPasswordForEmail(email, { redirectTo })` from the function. |
| `delete` | `auth.admin.deleteUser(authUserId)` then `DELETE FROM public.users WHERE id = ?`. Block deleting self. Reassign or null FKs first (see Step 2). |
| `update_role` | Update `public.users.role` (already partly possible; centralise it for audit). |
| `toggle_active` | Update `public.users.is_active`. |

Returns clear success/error JSON. Logs each admin action to console for traceability.

`supabase/config.toml` — register the function with `verify_jwt = true` (default; we want the caller's JWT).

### Step 2: Migration — handle FK constraints on user delete

`leads.assigned_to`, `lead_comments.user_id`, `lead_timeline.actor_id`, `trip_cashflow.assigned_to`, `trip_cashflow.created_by` reference `users(id)` without `ON DELETE` actions. Update FKs:
- `leads.assigned_to` → `ON DELETE SET NULL`
- `lead_comments.user_id` → `ON DELETE SET NULL`
- `lead_timeline.actor_id` → `ON DELETE SET NULL`
- `trip_cashflow.assigned_to` → `ON DELETE SET NULL`
- `trip_cashflow.created_by` → `ON DELETE SET NULL`
- `notifications.user_id` already has `ON DELETE CASCADE` ✓

### Step 3: Migration — RLS hardening for `public.users`
Replace the loose policies with:
- SELECT: any authenticated user (unchanged — needed for assignee dropdowns)
- INSERT/UPDATE/DELETE: only via edge function (service role bypasses RLS). Drop the broad `Admins can insert users` and `Users can update own profile` policies, OR keep self-update for `name/avatar/mobile` only.

Keep self-update on profile fields so the existing Profile page still works; restrict role/is_active changes to the edge function.

### Step 4: Frontend — `UserManagementPage.tsx`

Replace direct `supabase.from('users')` writes with `supabase.functions.invoke('admin-user-management', { body: { action, ... } })`.

Add to each row a `DropdownMenu` with:
- Edit role (inline Select that calls `update_role`)
- Activate / Deactivate
- Resend invite (only when `is_active = false`)
- Reset password (only when `is_active = true`)
- Delete user (red, opens `AlertDialog` confirmation; disabled for self)

Update the Invite sheet to call the `invite` action; success toast says "Invitation email sent to X".

### Step 5: `/accept-invite` route

A small public page that handles the Supabase invite redirect (`type=invite` in URL hash). User sets a password, then `supabase.auth.updateUser({ password })`, then we set `public.users.is_active = true` for their id. Redirect to `/dashboard`.

### Technical Notes
- All admin actions go through the edge function — the client never uses the service role key.
- The function reads the caller's JWT via `Authorization` header, calls `supabase.auth.getUser(jwt)`, then queries `public.users` to confirm `role = 'super_admin'`. Reject otherwise with 403.
- Invite email uses Supabase's built-in invite template (works out of the box). Branded auth emails are out of scope for this change.
- Safety: cannot delete or deactivate yourself; cannot demote the last `super_admin`.
- Existing rows in `public.users` whose `id` doesn't match an `auth.users.id` (legacy from previous broken invites) — surface a "Pending Invite" badge with a "Resend Invite" action that creates the auth account on first send.

### Files to Create/Edit
- create `supabase/functions/admin-user-management/index.ts`
- edit `supabase/config.toml` (register function)
- create migration: FK `ON DELETE SET NULL` updates + RLS tightening
- edit `src/pages/UserManagementPage.tsx` (dropdown actions, confirm dialogs, edge function calls)
- create `src/pages/AcceptInvite.tsx` + add route in `src/App.tsx`
