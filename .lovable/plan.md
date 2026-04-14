

## Adventourist CMS — Sprint 1 Plan

### Brand & Design System Setup
- Configure Tailwind with brand colors: Blaze (#FF6F4C), Horizon (#FDC436), Abyss (#1A1D2E), Lagoon (#64CBB9), Ridge (#056147), Drift (#EEE5D5)
- Set Inter as the global font (14px body, 13px table data)
- Create reusable UI patterns: status badges, card styles, table styles per spec

### Database (Lovable Cloud / Supabase)
Create all 10 tables as specified:
- `users`, `master_values`, `destinations`, `itineraries`, `landing_pages`, `leads`, `lead_timeline`, `vendors`, `trip_cashflow`, `automations_log`
- Enable RLS on all tables
- Note: Roles will be stored on the `users` table as requested

### Authentication
- **Login page**: Centered card on Abyss background, Adventourist logo (4-quadrant sun/mountains/waves/heart icon built with SVG), "Welcome back" heading, email + password fields, Blaze-colored sign-in button
- Supabase Auth with email/password
- Role-based route protection — redirect unauthenticated users to login
- After login → redirect to Dashboard

### App Shell & Layout
- **Dark sidebar** (#1A1D2E): All 10 nav items with Lucide icons, active state with #FF6F4C left border + subtle highlight, collapsible
- **Top bar**: Dynamic page title, reminders bell with badge count, user avatar + name + role pill, logout button
- White content area

### Pages Built in Sprint 1

#### 1. Dashboard (full)
- **4 KPI cards**: Total Leads (with trend arrow vs last month), Files Closed, Revenue This Month, Avg Margin %
- **Lead funnel chart**: New → Contacted → Qualified → Proposal → Closed (bar or funnel visualization)
- **Revenue trend line chart**: Last 6 months
- **Recent activity feed**: Latest lead timeline events

#### 2. Lead Management (full CRUD)
- Table view with columns: Traveller Code, Name, Destination, Status, Disposition, Assigned To, Created Date
- Search, filter by status/disposition/destination/assigned_to
- Add/Edit lead drawer or modal form
- Lead detail view with timeline/activity log
- Status and disposition updates with color-coded badges

#### 3. DB Management — Destinations (full CRUD)
- Table listing all destinations with name, themes, active status
- Add/Edit form: name, slug (auto-generated), about, best months, themes, suitable for, hero image upload, gallery, testimonials
- Toggle active/inactive

#### 4. DB Management — Master Values (full CRUD)
- Grouped tabs or filter by type (platform, channel, campaign_type, etc.)
- Add/edit/deactivate values
- Drag or manual sort order

#### 5. Remaining pages (shell only)
- Itineraries, Landing Pages, Trip Cashflow, Vendors, Reports, User Management, Role Management — placeholder pages with title and "Coming soon" state, wired into sidebar navigation

### Charts Library
- Use Recharts (already compatible with shadcn/ui chart component) for the dashboard visualizations

