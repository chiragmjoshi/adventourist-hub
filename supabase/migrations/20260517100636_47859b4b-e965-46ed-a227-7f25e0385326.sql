CREATE POLICY "seq_all_auth" ON public.vendor_code_sequence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "seq_all_auth" ON public.cashflow_code_sequence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "seq_all_auth" ON public.traveller_code_sequence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);