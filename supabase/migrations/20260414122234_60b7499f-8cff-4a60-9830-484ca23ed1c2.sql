
-- Allow anonymous users to read landing_pages
CREATE POLICY "Public can view active landing_pages"
ON public.landing_pages FOR SELECT TO anon
USING (is_active = true);

-- Allow anonymous users to read destinations
CREATE POLICY "Public can view active destinations"
ON public.destinations FOR SELECT TO anon
USING (is_active = true);

-- Allow anonymous users to read itineraries
CREATE POLICY "Public can view published itineraries"
ON public.itineraries FOR SELECT TO anon
USING (status = 'published');

-- Allow anonymous users to insert leads (enquiry form)
CREATE POLICY "Public can submit leads"
ON public.leads FOR INSERT TO anon
WITH CHECK (true);
