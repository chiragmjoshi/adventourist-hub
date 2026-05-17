
ALTER TABLE public.master_values
  ADD COLUMN IF NOT EXISTS parent_value text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_master_values_parent
  ON public.master_values(type, parent_value);

COMMENT ON COLUMN public.master_values.parent_value IS
  'For platform: stores the channel name. For campaign_type: stores the platform name. Null for channel rows.';

DELETE FROM public.master_values
WHERE type IN ('channel', 'platform', 'campaign_type', 'ad_group');

INSERT INTO public.master_values (type, value, sort_order, parent_value, is_active) VALUES
('channel', 'Paid',           1, NULL, true),
('channel', 'Organic',        2, NULL, true),
('channel', 'Content Loops',  3, NULL, true),
('channel', 'Referral',       4, NULL, true);

INSERT INTO public.master_values (type, value, sort_order, parent_value, is_active) VALUES
('platform', 'Google Search',      1,  'Paid', true),
('platform', 'Google YouTube',     2,  'Paid', true),
('platform', 'Meta / Facebook',    3,  'Paid', true),
('platform', 'Instagram (Paid)',   4,  'Paid', true),
('platform', 'Bing / Microsoft',   5,  'Paid', true),
('platform', 'Affiliate',          6,  'Paid', true),
('platform', 'Email',              7,  'Paid', true),
('platform', 'Website',             10, 'Organic', true),
('platform', 'Instagram (Organic)', 11, 'Organic', true),
('platform', 'Google My Business',  12, 'Organic', true),
('platform', 'Facebook (Organic)',  13, 'Organic', true),
('platform', 'WhatsApp',            14, 'Organic', true),
('platform', 'YouTube',          20, 'Content Loops', true),
('platform', 'Blog / Website',   21, 'Content Loops', true),
('platform', 'Instagram',        22, 'Content Loops', true),
('platform', 'Podcast',          23, 'Content Loops', true),
('platform', 'Word of Mouth',    30, 'Referral', true),
('platform', 'Agent / Partner',  31, 'Referral', true),
('platform', 'Online Platform',  32, 'Referral', true);

INSERT INTO public.master_values (type, value, sort_order, parent_value, is_active) VALUES
('campaign_type', 'Search',            1,  'Google Search',     true),
('campaign_type', 'Display',           2,  'Google Search',     true),
('campaign_type', 'Shopping',          3,  'Google Search',     true),
('campaign_type', 'Performance Max',   4,  'Google Search',     true),
('campaign_type', 'In-stream',         5,  'Google YouTube',    true),
('campaign_type', 'Discovery',         6,  'Google YouTube',    true),
('campaign_type', 'Shorts',            7,  'Google YouTube',    true),
('campaign_type', 'Feed Ad',           8,  'Meta / Facebook',   true),
('campaign_type', 'Story Ad',          9,  'Meta / Facebook',   true),
('campaign_type', 'Reel Ad',           10, 'Meta / Facebook',   true),
('campaign_type', 'Lead Form',         11, 'Meta / Facebook',   true),
('campaign_type', 'Feed Ad',           12, 'Instagram (Paid)',  true),
('campaign_type', 'Story Ad',          13, 'Instagram (Paid)',  true),
('campaign_type', 'Reel Ad',           14, 'Instagram (Paid)',  true),
('campaign_type', 'Search',            15, 'Bing / Microsoft',  true),
('campaign_type', 'Display',           16, 'Bing / Microsoft',  true),
('campaign_type', 'Affiliate Link',    17, 'Affiliate',         true),
('campaign_type', 'Coupon',            18, 'Affiliate',         true),
('campaign_type', 'Newsletter',        19, 'Email',             true),
('campaign_type', 'Drip Campaign',     20, 'Email',             true),
('campaign_type', 'Blast',             21, 'Email',             true),
('campaign_type', 'Direct Visit',      30, 'Website',           true),
('campaign_type', 'SEO',               31, 'Website',           true),
('campaign_type', 'Blog',              32, 'Website',           true),
('campaign_type', 'Feed Post',         33, 'Instagram (Organic)', true),
('campaign_type', 'Reel',              34, 'Instagram (Organic)', true),
('campaign_type', 'Story',             35, 'Instagram (Organic)', true),
('campaign_type', 'Bio Link',          36, 'Instagram (Organic)', true),
('campaign_type', 'Search',            37, 'Google My Business', true),
('campaign_type', 'Maps',              38, 'Google My Business', true),
('campaign_type', 'Page Post',         39, 'Facebook (Organic)', true),
('campaign_type', 'Group',             40, 'Facebook (Organic)', true),
('campaign_type', 'Direct Message',    41, 'WhatsApp',          true),
('campaign_type', 'Status',            42, 'WhatsApp',          true),
('campaign_type', 'Long Form Video',   50, 'YouTube',           true),
('campaign_type', 'Shorts',            51, 'YouTube',           true),
('campaign_type', 'Community Post',    52, 'YouTube',           true),
('campaign_type', 'Article',           53, 'Blog / Website',    true),
('campaign_type', 'Travel Guide',      54, 'Blog / Website',    true),
('campaign_type', 'Destination Review',55, 'Blog / Website',    true),
('campaign_type', 'Reel',              56, 'Instagram',         true),
('campaign_type', 'Carousel',          57, 'Instagram',         true),
('campaign_type', 'Episode',           58, 'Podcast',           true),
('campaign_type', 'Guest Feature',     59, 'Podcast',           true),
('campaign_type', 'Past Traveller',    60, 'Word of Mouth',     true),
('campaign_type', 'Family / Friend',   61, 'Word of Mouth',     true),
('campaign_type', 'Travel Agent',      62, 'Agent / Partner',   true),
('campaign_type', 'Corporate Partner', 63, 'Agent / Partner',   true),
('campaign_type', 'Influencer',        64, 'Agent / Partner',   true),
('campaign_type', 'Google Reviews',    65, 'Online Platform',   true),
('campaign_type', 'TripAdvisor',       66, 'Online Platform',   true),
('campaign_type', 'MakeMyTrip',        67, 'Online Platform',   true);
