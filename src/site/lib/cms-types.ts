export interface CMSItinerary {
  id: number;
  slug: string;
  headline: string;
  about?: string;
  days_and_nights?: string;
  pricing_per_person?: number;
  thumbnail?: { file_path?: string; alt_tag?: string };
  pictures?: Array<{ file_path?: string; alt_tag?: string }>;
  days_data?: Array<{ title: string; detail: string }>;
  inclusion?: string;
  exclusion?: string;
  important_things?: string;
  destination?: {
    id: number;
    name: string;
    pictures?: Array<{ file_path?: string }>;
    types?: Array<{ master_type: { id: number; value: string } }>;
    suitable_types?: Array<{ master_type: { id: number; value: string } }>;
    time_to_visits?: Array<{ id: number; time: string }>;
  };
  testimonials?: Array<{ name?: string; review?: string; rating?: number }>;
  status?: string;
  time_to_visit?: string;
  faqs?: Array<{ q: string; a: string }>;
}

export interface CMSDestination {
  id: number;
  name: string;
  pictures?: Array<{ file_path?: string }>;
}

export interface CMSMasterData {
  destinations: CMSDestination[];
  destination_type: Array<{ id: number; value: string }>;
  destination_suitable_type: Array<{ id: number; value: string }>;
  time_to_visit: string[];
}