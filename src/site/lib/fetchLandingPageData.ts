export interface LandingPageResponse {
  status: string;
  message: string;
  data: LandingPageData;
}

export interface LandingPageData {
  id: number;
  slug: string;
  itinerary_id: number | null;
  headline: string;
  platform_id: number;
  campaign_type_id: number;
  ad_group_id: number | null;
  channel_id: number | null;
  template_id: number | null;
  destination_id: number;
  destination_thumbnail_id: number;
  pricing_per_person: number | null;
  gallery_template_id: number | null;
  itinerary_days_data: Itinerary[];
  inclusion: string;
  exclusion: string;
  settings: Settings;
  created_at: string;
  updated_at: string;
  destination: Destination;
  thumbnail: Thumbnail;
  pictures: any[]; // Adjust type if you have structure for pictures
  template: any; // Adjust type if available
  gallery_template: any; // Adjust type if available
}

export interface Itinerary {
  name: string;
  days: Day[];
}

export interface Day {
  title: string;
  description: string;
}

export interface Settings {
  fields: {
    name: number;
    email: number;
    mobile: number;
    package: number;
  };
  options: {
    why_adventourist: number;
    testimonials: number;
    talk_to_us: number;
    rating: number;
    whatsapp_cta: number;
  };
}

export interface Destination {
  id: number;
  name: string;
  about: string;
  created_at: string;
  updated_at: string;
  time_to_visits: TimeToVisit[];
  types: DestinationType[];
  suitable_types: DestinationType[];
}

export interface TimeToVisit {
  id: number;
  destination_id: number;
  time: string;
  created_at: string;
  updated_at: string;
}

export interface DestinationType {
  id: number;
  destination_id: number;
  category: string;
  type: number;
  created_at: string;
  updated_at: string;
}

export interface Thumbnail {
  id: number;
  destination_id: number;
  title: string;
  alt_tag: string;
  file_path: string;
  created_at: string;
  updated_at: string;
}
