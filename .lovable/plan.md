## Fix RLS on sequence tables

The `generate_vendor_code` trigger runs as the calling user and inserts into `vendor_code_sequence`, which has RLS enabled but no policies — so every vendor insert fails. Same risk exists on `cashflow_code_sequence` and `traveller_code_sequence` (there is no `lead_sequence` table in this project).

### Changes

Single migration adding permissive policies for authenticated users on all three sequence tables. Keeping RLS on (rather than disabling) is safer and consistent with the rest of the schema.

```sql
-- vendor_code_sequence
CREATE POLICY "seq_all_auth" ON public.vendor_code_sequence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cashflow_code_sequence
CREATE POLICY "seq_all_auth" ON public.cashflow_code_sequence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- traveller_code_sequence
CREATE POLICY "seq_all_auth" ON public.traveller_code_sequence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Verification

1. Create a test vendor from the Vendors page → confirm row inserts without RLS error.
2. Confirm `vendor_code` matches `V26XXXX` format (current year prefix `V26`, 4-digit zero-padded sequence).
3. Check browser console + network tab → no 403 / RLS errors.

No frontend code changes required.
