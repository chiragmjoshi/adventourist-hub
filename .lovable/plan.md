# Stories admin module

Add a complete editorial CMS for travel stories that mirrors the existing admin patterns (Itineraries, Landing Pages). The `stories` table is already in place — we still need a public Storage bucket and the routes/UI.

## What I noticed in your spec vs the existing codebase
- The brief asks for **react-quill**. Your admin already uses **TipTap** (`src/components/forms/RichTextEditor.tsx`) for every other rich field (itinerary descriptions, landing-page copy, etc.). I'll **extend the existing TipTap editor** with link / image / blockquote / H3 toolbar buttons rather than introducing a second editor. Same toolbar behaviour, zero new dependency, consistent look-and-feel.
- Auto-save (`useAutoSaveDraft`) and unsaved-changes guard (`useUnsavedChanges` + `UnsavedChangesDialog`) hooks already exist and are used by `LandingPageEdit` — I'll reuse them.
- `ImageUploader` already supports any bucket — I'll point it at the new `stories` bucket.

## 1. Database — Storage bucket only

Migration:
- Create public bucket `stories` (5 MB image cap enforced client-side).
- RLS on `storage.objects`:
  - Public `SELECT` for `bucket_id='stories'`.
  - Authenticated `INSERT/UPDATE/DELETE` for `bucket_id='stories'`.

Table is unchanged.

## 2. Routes (`src/App.tsx`)

```
/admin/stories            → StoryList
/admin/stories/new        → StoryEdit
/admin/stories/:id/edit   → StoryEdit
```

All wrapped in `ProtectedRoute`.

## 3. Sidebar (`src/components/AppSidebar.tsx`)

Add a "Stories" item between **Landing Pages** and **Trip Cashflow**, icon `BookOpen` (lucide), gated by `hasPermission("itineraries")` (same content-team permission as Itineraries — no new role needed).

## 4. List page — `src/pages/StoryList.tsx`

Standard admin shell (`AppLayout`), matches the look of `ItineraryList` / `LandingPageList`:

- Header: "Stories" + subtitle, **[+ New Story]** primary button (Blaze) → `/admin/stories/new`.
- Filters row (sticky):
  - Search by title/excerpt
  - Category dropdown (All + 6 categories)
  - Status dropdown (All / Published / Draft)
- Table columns: **Title** (with cover thumbnail) · **Category** badge · **Author** · **Status** badge (green=Published, grey=Draft) · **Views** with `Eye` icon · **Published** date · **Actions** (Edit link, inline `Switch` to toggle `is_published`, `Trash2` with confirm `AlertDialog`).
- Sort: `published_at desc nulls last, created_at desc`.
- Empty state card: "No stories yet. Create your first one." + CTA button.
- Toggle published switch updates `is_published`; if turning on and `published_at` is null, sets it to `now()`.

Uses TanStack Query + `supabase` client. Toast feedback via `sonner`.

## 5. Editor page — `src/pages/StoryEdit.tsx`

Two-column sticky layout (`grid-cols-12 gap-6`, left `col-span-8`, right `col-span-4 sticky top-20 self-start`).

### Left panel (editor)
- **Title** — large input, `font-display` (Inter Tight already mapped), auto-suggests slug on blur if slug field is empty.
- **Slug** — input with prefix label `adventourist.in/travel-stories/`. Manual edits stick. Slugify on the fly (`a-z0-9-`).
- **Excerpt** — `Textarea` with live `value.length / 200` counter; hard cap at 200.
- **Cover Image** — `ImageUploader` with `bucket="stories" folder={id ?? "drafts"} filename="cover"`.
- **Content** — extended `RichTextEditor`:
  - New toolbar buttons: **H3**, **Link** (prompt for URL → `editor.chain().toggleLink`), **Image** (opens hidden file input → uploads to `stories` bucket → `setImage`), **Blockquote**.
  - Adds `@tiptap/extension-link` + `@tiptap/extension-image` + `Blockquote` (already in StarterKit) extensions to the editor when an `enableMedia` prop is true so other usages stay unchanged.
  - Min height 480px.

### Right panel (settings, sticky)
- **Status** — segmented `Draft | Published` toggle. Toggling to Published sets `published_at = now()` if null (on save).
- **Action buttons** — `[Save Draft]` (outline) and `[Publish]` (Blaze) — Publish forces `is_published=true`.
- **Author** — `Select`: Minal Joshi / Pinky Prajapati / Team Adventourist.
- **Category** — `Select`: Destination Guide / Travel Tips / Client Story / Food & Culture / Adventure / Honeymoon.
- **Tags** — comma-separated `Input` rendered as removable Blaze pill chips below the field; stored as `text[]`.
- **Destination** — `Select` populated from `destinations` table (`is_active=true`), optional, "— None —" first item.
- **Read time** — number `Input`. A `Recalculate from content` icon button derives `Math.max(1, ceil(wordCount / 200))` from the current HTML's plain text.
- **SEO** (collapsible `Collapsible` from shadcn, closed by default):
  - SEO Title (`/60` counter)
  - SEO Description (`/155` counter)
  - OG Image — `ImageUploader` (`bucket=stories folder=… filename=og`)

### Save / autosave / guards
- `useAutoSaveDraft` (existing hook) writes to localStorage every 60s when dirty; toast "Draft auto-saved" surfaces inline (use sonner; existing pattern in `LandingPageEdit`).
- `useUnsavedChanges` + `UnsavedChangesDialog` block route changes when dirty.
- For new records: first save calls `insert`, navigates to `/admin/stories/:id/edit`, replacing history (so subsequent autosaves and image uploads use the real id as the storage folder).
- Slug uniqueness is enforced by the DB; on conflict the toast says "This slug is already taken — try another."
- "Published" header chip + small "Last saved hh:mm" indicator next to the Save button.

## 6. Public site link-up (out of scope for this change but worth flagging)
`/travel-stories` will start showing rows where `is_published=true`. This change only ships the admin; the public page already exists and currently doesn't query the DB — happy to wire it next if you want.

## File summary
- `supabase/migrations/<timestamp>_stories_storage.sql` (new)
- `src/App.tsx` — add 3 routes
- `src/components/AppSidebar.tsx` — add nav item
- `src/pages/StoryList.tsx` (new)
- `src/pages/StoryEdit.tsx` (new)
- `src/components/forms/RichTextEditor.tsx` — opt-in `enableMedia` prop adding H3/Link/Image/Blockquote buttons + image-upload bucket prop
- 1 new dependency: `@tiptap/extension-link` (Image extension is already part of `@tiptap/extension-image` if not present, will install both as needed)

## Open question
Confirm the autosave behaviour:
- **A.** Auto-save to localStorage every 60s (your existing pattern — never touches the DB while drafting), then DB-save only on explicit `Save Draft` / `Publish`. **(Recommended — matches Itinerary/Landing-page editors.)**
- **B.** Auto-save directly to the database every 60s (writes a real `is_published=false` row even mid-edit).

Reply A or B and I'll implement.