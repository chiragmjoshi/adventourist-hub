

## Plan: Insert Dummy Test Data for Landing Page

Since the database has no destinations or itineraries yet, I need to create seed data in this order:

### Step 1: Insert a dummy destination
- **Name**: "Rajasthan" / **Slug**: "rajasthan"
- Themes: Adventure, Culture, Heritage
- Best months: Oct, Nov, Dec, Jan, Feb
- Suitable for: Couples, Family

### Step 2: Insert a dummy itinerary linked to that destination
- **Headline**: "Royal Rajasthan Explorer"
- 5 days / 4 nights, ₹18,500 per person
- Day-by-day plan with 5 days of content
- Inclusions & exclusions text

### Step 3: Insert a dummy landing page
- **Name**: "City of Palaces: A Royal Rajasthan Story"
- **Slug**: "city-of-palaces-a-royal-rajasthan-story"
- Hero headline, subtext, budget ₹18,500
- Attribution: Platform=Meta, Channel=Paid Social, Campaign=Conversion, Ad Group=Couples
- Stay days: "5 Days & 4 Nights"
- Best time, suitable for, destination type filled
- SEO title and description
- Status: active, published

All three inserts will use the Supabase insert tool. No schema changes needed.

### Technical details
- Destination ID will be referenced by itinerary and landing page
- Itinerary ID will be referenced by landing page
- `itinerary_days` JSONB will contain 5 day objects with title, description, meals, accommodation

