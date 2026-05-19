## Add "Any / All Destinations" option to Vendor Service Destinations

For vendors whose services aren't tied to a destination (e.g. flight booking), add an **"Any"** pill at the start of the Service Destinations chip list in `src/pages/VendorEdit.tsx`.

### Behavior
- Renders as a chip labeled **"Any"** before the destination chips, styled like the others (lagoon accent when selected).
- Selecting "Any" sets `serve_destinations = ["ANY"]` and deselects all specific destinations.
- Selecting any specific destination automatically clears "Any".
- Validation still passes (array has 1 entry).
- On the vendor list / detail pages, an `ANY` value renders as the badge text **"Any Destination"** (cosmetic only; no DB changes).

### Technical notes
- `serve_destinations` is `text[]` in the `vendors` table — no schema change needed; we just store the sentinel string `"ANY"`.
- Update the toggle handler so picking "Any" and picking a real destination are mutually exclusive.
- Update `VendorList.tsx` / `VendorDetail.tsx` chip rendering to display "Any Destination" when the value is `ANY`.

No backend/migration work required.