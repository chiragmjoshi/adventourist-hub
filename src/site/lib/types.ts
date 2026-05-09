export interface Highlight {
  icon: string;
  label: string;
  description: string;
}

export interface ItineraryDay {
  day: number;
  city: string;
  activities: string[];
  stayType: "Boutique Hotel" | "Luxury Villa" | "Homestay" | "Resort" | "Guesthouse";
  stayName?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface HotelCard {
  name: string;
  image: string;
  stars: number;
  type: string;
}

export interface Itinerary {
  id: string;
  slug: string;
  title: string;
  destination: string;
  heroImage: string;
  duration: number;          // days
  nights: number;
  budgetFrom: number;        // INR
  budgetTo?: number;
  tags: string[];            // ["Honeymoon", "Beach"]
  bestMonths: number[];      // [10, 11, 12, 1, 2]
  suitableFor: string[];     // ["Couples", "Families"]
  travelStyle: string[];     // ["Leisure", "Adventure"]
  isPopular?: boolean;
  isNew?: boolean;
  badge?: string;            // "Popular" | "Bestseller" | "New" | "Premium"
  status: "published" | "draft";
  seoTitle: string;
  seoDescription: string;
  overview: string;
  highlights: Highlight[];
  days: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  faqs: FAQ[];
  hotels?: HotelCard[];
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  heroImage: string;
  tagline: string;
  region: string;
  itineraryCount: number;
  bestMonths: number[];
  expertTip: string;
  expertName: string;
  experiences: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  destination: string;
  rating: number;
  text: string;
  avatar: string;
  avatarUrl?: string;
}

export interface TravelStory {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  readTime: string;
  href: string;
  featured?: boolean;
}

export interface Lead {
  name: string;
  phone: string;
  email?: string;
  destinationInterest: string[];
  travelDates?: string;
  groupSize?: number;
  budget?: string;
  message?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
  submitted_at: string;
}

export interface FilterState {
  destination: string;   // single-select → destination.name
  duration: string;      // single-select → parsed from days_and_nights
  budget: string;        // single-select → pricing_per_person ranges
  themes: string[];      // multi-select → destination.types[].master_type.value
  suitableFor: string[]; // multi-select → destination.suitable_types[].master_type.value
}
