

## Plan: Fix Issues Found in UX Audit

### Issues to fix

**1. Lead Management table — format snake_case labels**
In `src/pages/LeadManagement.tsx`, the Disposition and Status columns display raw values like `not_contacted` and `new_lead`. Apply the existing `formatLabel()` utility to these columns.

**2. Lead Detail — Disposition/Status dropdowns not showing selected value**  
In `src/pages/LeadDetail.tsx`, the top-right disposition and sales status dropdowns appear to have empty/invisible selected values. Need to check the select components are properly showing the current value.

**3. Automation template seed values**
Run a migration to update `automation_templates` rows where `aisensy_template_name = 'REPLACE_WITH_YOUR_TEMPLATE_NAME'` to the correct placeholder names (`adventourist_trip_confirmed`, `adventourist_pre_trip_reminder`, etc.) as specified in the Sprint 7 spec.

### Technical details

- **File 1**: `src/pages/LeadManagement.tsx` — wrap disposition and status column renders with `formatLabel()`
- **File 2**: `src/pages/LeadDetail.tsx` — inspect the disposition/status select components for missing value display
- **File 3**: Migration SQL to update template names

### Out of scope
- Mobile header cramping is minor and cosmetic
- Template names will be updated by admin in production — the seed fix is just for better defaults

