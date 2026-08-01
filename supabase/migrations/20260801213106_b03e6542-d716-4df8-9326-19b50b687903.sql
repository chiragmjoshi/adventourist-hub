UPDATE public.travel_stories SET thumbnail_url = m.img
FROM (VALUES
 ('bali-sri-lanka-luxury-wellness-retreats','/site-images/stories/bali-wellness.webp'),
 ('luxury-wellness-retreats-bali-from-india','/site-images/stories/sri-lanka-wellness.webp'),
 ('best-time-to-visit-rajasthan-festivals','/site-images/stories/rajasthan-festival.webp'),
 ('custom-europe-family-tour-packages-india-switzerland-france','/site-images/stories/europe-family.webp'),
 ('custom-europe-family-tours-switzerland-france','/site-images/stories/europe-family.webp'),
 ('famous-festivals-of-rajasthan','/site-images/stories/rajasthan-festival.webp'),
 ('georgia-travel-guide-for-indians','/site-images/stories/georgia.webp'),
 ('hemis-festival-leh-ladakh','/site-images/stories/hemis-festival.webp'),
 ('kailash-mansarovar-yatra-eligibility-permits','/site-images/stories/kailash.webp'),
 ('kailash-mansarovar-yatra-helicopter-guide','/site-images/stories/kailash-mansarovar.webp'),
 ('kasol-vs-spiti-vs-tirthan-valley','/site-images/stories/himachal-valleys.webp'),
 ('kerala-backwaters-custom-trip-guide','/site-images/stories/kerala-backwaters.webp'),
 ('ladakh-winter-vs-summer','/site-images/stories/ladakh-winter.webp'),
 ('local-festivals-of-udaipur','/site-images/stories/udaipur.webp'),
 ('luxury-bhutan-travel-cost-guide','/site-images/stories/bhutan-luxury.webp'),
 ('magnetic-hill-to-leh-distance','/site-images/stories/magnetic-hill.webp'),
 ('offbeat-ladakh-turtuk-nubra','/site-images/stories/nubra-turtuk.webp'),
 ('offbeat-odisha-temples-beaches-tribal-culture','/site-images/stories/odisha.webp'),
 ('premium-ladakh-customized-itinerary-mpi45r9l','/site-images/stories/ladakh-premium.webp'),
 ('premium-ladakh-trip-cost-guide-2026','/site-images/stories/ladakh-premium.webp'),
 ('rajasthani-culture-cuisine-traditions','/site-images/stories/rajasthan-culture.webp'),
 ('royal-rajasthan-7-day-itinerary','/site-images/stories/rajasthan-royal.webp'),
 ('things-to-do-in-spiti-valley','/site-images/stories/spiti-valley.webp')
) AS m(slug, img)
WHERE public.travel_stories.slug = m.slug;