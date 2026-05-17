export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      automation_executions: {
        Row: {
          channel: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          message_preview: string | null
          recipient_contact: string | null
          recipient_type: string | null
          rule_id: string | null
          scheduled_for: string | null
          skip_reason: string | null
          status: string
          trigger_event: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          message_preview?: string | null
          recipient_contact?: string | null
          recipient_type?: string | null
          rule_id?: string | null
          scheduled_for?: string | null
          skip_reason?: string | null
          status?: string
          trigger_event?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          message_preview?: string | null
          recipient_contact?: string | null
          recipient_type?: string | null
          rule_id?: string | null
          scheduled_for?: string | null
          skip_reason?: string | null
          status?: string
          trigger_event?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          condition_channel: string[] | null
          condition_disposition: string[] | null
          condition_platform: string[] | null
          condition_status: string[] | null
          created_at: string
          created_by: string | null
          delay_hours: number
          description: string | null
          email_body: string | null
          email_enabled: boolean
          email_format: string
          email_recipient: string
          email_subject: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          run_count: number
          send_time_window_end: string | null
          send_time_window_start: string | null
          trigger_days_before: number | null
          trigger_event: string
          trigger_inactivity_days: number | null
          updated_at: string
          wa_enabled: boolean
          wa_message_body: string | null
          wa_recipient: string
          wa_template_name: string | null
        }
        Insert: {
          condition_channel?: string[] | null
          condition_disposition?: string[] | null
          condition_platform?: string[] | null
          condition_status?: string[] | null
          created_at?: string
          created_by?: string | null
          delay_hours?: number
          description?: string | null
          email_body?: string | null
          email_enabled?: boolean
          email_format?: string
          email_recipient?: string
          email_subject?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          run_count?: number
          send_time_window_end?: string | null
          send_time_window_start?: string | null
          trigger_days_before?: number | null
          trigger_event: string
          trigger_inactivity_days?: number | null
          updated_at?: string
          wa_enabled?: boolean
          wa_message_body?: string | null
          wa_recipient?: string
          wa_template_name?: string | null
        }
        Update: {
          condition_channel?: string[] | null
          condition_disposition?: string[] | null
          condition_platform?: string[] | null
          condition_status?: string[] | null
          created_at?: string
          created_by?: string | null
          delay_hours?: number
          description?: string | null
          email_body?: string | null
          email_enabled?: boolean
          email_format?: string
          email_recipient?: string
          email_subject?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          run_count?: number
          send_time_window_end?: string | null
          send_time_window_start?: string | null
          trigger_days_before?: number | null
          trigger_event?: string
          trigger_inactivity_days?: number | null
          updated_at?: string
          wa_enabled?: boolean
          wa_message_body?: string | null
          wa_recipient?: string
          wa_template_name?: string | null
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      automations_log: {
        Row: {
          cashflow_id: string | null
          channel: string
          fired_at: string | null
          id: string
          lead_id: string | null
          recipient_email: string | null
          recipient_mobile: string | null
          recipient_name: string | null
          response_payload: Json | null
          status: string | null
          template_id: string | null
          template_name: string | null
          trigger_event: string
          variables: Json | null
        }
        Insert: {
          cashflow_id?: string | null
          channel: string
          fired_at?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string | null
          recipient_mobile?: string | null
          recipient_name?: string | null
          response_payload?: Json | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          trigger_event: string
          variables?: Json | null
        }
        Update: {
          cashflow_id?: string | null
          channel?: string
          fired_at?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string | null
          recipient_mobile?: string | null
          recipient_name?: string | null
          response_payload?: Json | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          trigger_event?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_log_cashflow_id_fkey"
            columns: ["cashflow_id"]
            isOneToOne: false
            referencedRelation: "trip_cashflow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_log_cashflow_id_fkey"
            columns: ["cashflow_id"]
            isOneToOne: false
            referencedRelation: "trip_cashflow_sales_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_code_sequence: {
        Row: {
          last_sequence: number
          year_prefix: string
        }
        Insert: {
          last_sequence?: number
          year_prefix: string
        }
        Update: {
          last_sequence?: number
          year_prefix?: string
        }
        Relationships: []
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string | null
          file_path: string | null
          id: string
          legacy_id: number | null
          meta: Json | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          file_path?: string | null
          id?: string
          legacy_id?: number | null
          meta?: Json | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          file_path?: string | null
          id?: string
          legacy_id?: number | null
          meta?: Json | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tag_customer: {
        Row: {
          customer_id: string
          tag_id: string
        }
        Insert: {
          customer_id: string
          tag_id: string
        }
        Update: {
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_customer_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_customer_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          legacy_id: number | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          legacy_id?: number | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          legacy_id?: number | null
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          anniversary: string | null
          created_at: string
          dob: string | null
          email: string | null
          id: string
          legacy_id: number | null
          mobile: string | null
          name: string | null
          profile_image: string | null
          traveller_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          anniversary?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          id?: string
          legacy_id?: number | null
          mobile?: string | null
          name?: string | null
          profile_image?: string | null
          traveller_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          anniversary?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          id?: string
          legacy_id?: number | null
          mobile?: string | null
          name?: string | null
          profile_image?: string | null
          traveller_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      destinations: {
        Row: {
          about: string | null
          best_months: number[]
          created_at: string
          gallery: Json
          hero_image: string | null
          id: string
          is_active: boolean
          legacy_id: number | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          suitable_for: string[]
          testimonials: Json
          themes: string[]
          updated_at: string
        }
        Insert: {
          about?: string | null
          best_months?: number[]
          created_at?: string
          gallery?: Json
          hero_image?: string | null
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          suitable_for?: string[]
          testimonials?: Json
          themes?: string[]
          updated_at?: string
        }
        Update: {
          about?: string | null
          best_months?: number[]
          created_at?: string
          gallery?: Json
          hero_image?: string | null
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          suitable_for?: string[]
          testimonials?: Json
          themes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          about: string | null
          best_months: number[]
          breakfast_included: boolean | null
          created_at: string
          days: number | null
          destination_id: string | null
          destination_type: string[]
          exclusions: string | null
          faqs: Json
          flights_included: boolean | null
          gallery: Json
          headline: string | null
          hero_image: string | null
          highlights: Json
          id: string
          important_things: string | null
          inclusions: string | null
          itinerary_days: Json
          legacy_id: number | null
          meals_included: boolean | null
          meta_footer: string | null
          meta_header: string | null
          nights: number | null
          no_follow: boolean | null
          no_index: boolean | null
          price_per_person: number | null
          published_at: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          sightseeing_included: boolean | null
          slug: string
          status: string
          stay_included: boolean | null
          suitable_for: string[]
          support_247: boolean | null
          testimonials: Json
          themes: string[]
          transfers_included: boolean | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          about?: string | null
          best_months?: number[]
          breakfast_included?: boolean | null
          created_at?: string
          days?: number | null
          destination_id?: string | null
          destination_type?: string[]
          exclusions?: string | null
          faqs?: Json
          flights_included?: boolean | null
          gallery?: Json
          headline?: string | null
          hero_image?: string | null
          highlights?: Json
          id?: string
          important_things?: string | null
          inclusions?: string | null
          itinerary_days?: Json
          legacy_id?: number | null
          meals_included?: boolean | null
          meta_footer?: string | null
          meta_header?: string | null
          nights?: number | null
          no_follow?: boolean | null
          no_index?: boolean | null
          price_per_person?: number | null
          published_at?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          sightseeing_included?: boolean | null
          slug: string
          status?: string
          stay_included?: boolean | null
          suitable_for?: string[]
          support_247?: boolean | null
          testimonials?: Json
          themes?: string[]
          transfers_included?: boolean | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          about?: string | null
          best_months?: number[]
          breakfast_included?: boolean | null
          created_at?: string
          days?: number | null
          destination_id?: string | null
          destination_type?: string[]
          exclusions?: string | null
          faqs?: Json
          flights_included?: boolean | null
          gallery?: Json
          headline?: string | null
          hero_image?: string | null
          highlights?: Json
          id?: string
          important_things?: string | null
          inclusions?: string | null
          itinerary_days?: Json
          legacy_id?: number | null
          meals_included?: boolean | null
          meta_footer?: string | null
          meta_header?: string | null
          nights?: number | null
          no_follow?: boolean | null
          no_index?: boolean | null
          price_per_person?: number | null
          published_at?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          sightseeing_included?: boolean | null
          slug?: string
          status?: string
          stay_included?: boolean | null
          suitable_for?: string[]
          support_247?: boolean | null
          testimonials?: Json
          themes?: string[]
          transfers_included?: boolean | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          ad_group: string | null
          budget: number | null
          campaign_type: string | null
          channel: string | null
          created_at: string
          custom_exclusions: string | null
          custom_inclusions: string | null
          destination_id: string | null
          destination_type: string[]
          form_after_submit_message: string | null
          form_submit_text: string | null
          form_subtitle: string | null
          form_terms_label: string | null
          form_title: string | null
          gallery: Json
          hero_headline: string | null
          hero_image: string | null
          hero_subtext: string | null
          id: string
          is_active: boolean
          itinerary_id: string | null
          legacy_id: number | null
          meta_footer: string | null
          meta_header: string | null
          name: string | null
          no_follow: boolean | null
          no_index: boolean | null
          platform: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          settings: Json | null
          slug: string
          stay_days: string | null
          suitable_for: string[]
          template_id: string
          testimonial_ids: string[]
          time_to_visit: string[]
          updated_at: string
          view_count: number | null
          why_adventourist: string | null
        }
        Insert: {
          ad_group?: string | null
          budget?: number | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string
          custom_exclusions?: string | null
          custom_inclusions?: string | null
          destination_id?: string | null
          destination_type?: string[]
          form_after_submit_message?: string | null
          form_submit_text?: string | null
          form_subtitle?: string | null
          form_terms_label?: string | null
          form_title?: string | null
          gallery?: Json
          hero_headline?: string | null
          hero_image?: string | null
          hero_subtext?: string | null
          id?: string
          is_active?: boolean
          itinerary_id?: string | null
          legacy_id?: number | null
          meta_footer?: string | null
          meta_header?: string | null
          name?: string | null
          no_follow?: boolean | null
          no_index?: boolean | null
          platform?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          settings?: Json | null
          slug: string
          stay_days?: string | null
          suitable_for?: string[]
          template_id?: string
          testimonial_ids?: string[]
          time_to_visit?: string[]
          updated_at?: string
          view_count?: number | null
          why_adventourist?: string | null
        }
        Update: {
          ad_group?: string | null
          budget?: number | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string
          custom_exclusions?: string | null
          custom_inclusions?: string | null
          destination_id?: string | null
          destination_type?: string[]
          form_after_submit_message?: string | null
          form_submit_text?: string | null
          form_subtitle?: string | null
          form_terms_label?: string | null
          form_title?: string | null
          gallery?: Json
          hero_headline?: string | null
          hero_image?: string | null
          hero_subtext?: string | null
          id?: string
          is_active?: boolean
          itinerary_id?: string | null
          legacy_id?: number | null
          meta_footer?: string | null
          meta_header?: string | null
          name?: string | null
          no_follow?: boolean | null
          no_index?: boolean | null
          platform?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          settings?: Json | null
          slug?: string
          stay_days?: string | null
          suitable_for?: string[]
          template_id?: string
          testimonial_ids?: string[]
          time_to_visit?: string[]
          updated_at?: string
          view_count?: number | null
          why_adventourist?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          lead_id: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          lead_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_timeline: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          lead_id: string | null
          legacy_id: number | null
          metadata: Json | null
          note: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          legacy_id?: number | null
          metadata?: Json | null
          note?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          legacy_id?: number | null
          metadata?: Json | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_timeline_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_timeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tracking: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          af_click_lookback: string | null
          af_siteid: string | null
          campaign_id: string | null
          click_id: string | null
          created_at: string
          creative_name: string | null
          device: string | null
          device_type: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          lead_id: string | null
          legacy_id: number | null
          pid: string | null
          placement: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          af_click_lookback?: string | null
          af_siteid?: string | null
          campaign_id?: string | null
          click_id?: string | null
          created_at?: string
          creative_name?: string | null
          device?: string | null
          device_type?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          lead_id?: string | null
          legacy_id?: number | null
          pid?: string | null
          placement?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          af_click_lookback?: string | null
          af_siteid?: string | null
          campaign_id?: string | null
          click_id?: string | null
          created_at?: string
          creative_name?: string | null
          device?: string | null
          device_type?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          lead_id?: string | null
          legacy_id?: number | null
          pid?: string | null
          placement?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_group: string | null
          assigned_to: string | null
          campaign_type: string | null
          channel: string | null
          created_at: string
          customer_id: string | null
          destination_id: string | null
          disposition: string | null
          email: string | null
          follow_up_date: string | null
          id: string
          is_hot: boolean
          itinerary_id: string | null
          landing_page_id: string | null
          legacy_id: number | null
          mobile: string | null
          name: string | null
          notes: string | null
          pax_count: number | null
          platform: string | null
          remarks: Json | null
          sales_status: string | null
          source: string
          source_id: number | null
          travel_date: string | null
          traveller_code: string
          updated_at: string
        }
        Insert: {
          ad_group?: string | null
          assigned_to?: string | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          destination_id?: string | null
          disposition?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          is_hot?: boolean
          itinerary_id?: string | null
          landing_page_id?: string | null
          legacy_id?: number | null
          mobile?: string | null
          name?: string | null
          notes?: string | null
          pax_count?: number | null
          platform?: string | null
          remarks?: Json | null
          sales_status?: string | null
          source?: string
          source_id?: number | null
          travel_date?: string | null
          traveller_code?: string
          updated_at?: string
        }
        Update: {
          ad_group?: string | null
          assigned_to?: string | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          destination_id?: string | null
          disposition?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          is_hot?: boolean
          itinerary_id?: string | null
          landing_page_id?: string | null
          legacy_id?: number | null
          mobile?: string | null
          name?: string | null
          notes?: string | null
          pax_count?: number | null
          platform?: string | null
          remarks?: Json | null
          sales_status?: string | null
          source?: string
          source_id?: number | null
          travel_date?: string | null
          traveller_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_destinations: {
        Row: {
          about: string
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          about: string
          created_at?: string | null
          id: number
          name: string
          updated_at?: string | null
        }
        Update: {
          about?: string
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      legacy_itineraries: {
        Row: {
          about: string | null
          all_meals_included: boolean
          breakfast_included: boolean
          created_at: string
          days_data: string | null
          destination_id: number | null
          destination_thumbnail_id: number | null
          exclusion: string | null
          flights_included: boolean
          headline: string | null
          id: number
          important_things: string | null
          inclusion: string | null
          meta_description: string | null
          meta_footer: string | null
          meta_header: string | null
          meta_image: string | null
          meta_tags: string | null
          meta_title: string | null
          no_follow: number | null
          no_index: number | null
          pricing_per_person: number | null
          sightseeing_included: boolean
          slug: string
          status: string
          stay_included: boolean
          support_24x7_included: boolean
          transfers_included: boolean
          updated_at: string
          view_count: string | null
        }
        Insert: {
          about?: string | null
          all_meals_included?: boolean
          breakfast_included?: boolean
          created_at: string
          days_data?: string | null
          destination_id?: number | null
          destination_thumbnail_id?: number | null
          exclusion?: string | null
          flights_included?: boolean
          headline?: string | null
          id: number
          important_things?: string | null
          inclusion?: string | null
          meta_description?: string | null
          meta_footer?: string | null
          meta_header?: string | null
          meta_image?: string | null
          meta_tags?: string | null
          meta_title?: string | null
          no_follow?: number | null
          no_index?: number | null
          pricing_per_person?: number | null
          sightseeing_included?: boolean
          slug: string
          status?: string
          stay_included?: boolean
          support_24x7_included?: boolean
          transfers_included?: boolean
          updated_at?: string
          view_count?: string | null
        }
        Update: {
          about?: string | null
          all_meals_included?: boolean
          breakfast_included?: boolean
          created_at?: string
          days_data?: string | null
          destination_id?: number | null
          destination_thumbnail_id?: number | null
          exclusion?: string | null
          flights_included?: boolean
          headline?: string | null
          id?: number
          important_things?: string | null
          inclusion?: string | null
          meta_description?: string | null
          meta_footer?: string | null
          meta_header?: string | null
          meta_image?: string | null
          meta_tags?: string | null
          meta_title?: string | null
          no_follow?: number | null
          no_index?: number | null
          pricing_per_person?: number | null
          sightseeing_included?: boolean
          slug?: string
          status?: string
          stay_included?: boolean
          support_24x7_included?: boolean
          transfers_included?: boolean
          updated_at?: string
          view_count?: string | null
        }
        Relationships: []
      }
      legacy_landing_pages: {
        Row: {
          ad_group_id: number | null
          campaign_type_id: number | null
          channel_id: number | null
          created_at: string
          destination_id: number | null
          destination_thumbnail_id: number | null
          exclusion: string | null
          gallery_template_id: number | null
          headline: string
          id: number
          inclusion: string | null
          itinerary_days_data: string | null
          itinerary_id: number | null
          meta_description: string | null
          meta_footer: string | null
          meta_header: string | null
          meta_image: string | null
          meta_tags: string | null
          meta_title: string | null
          no_follow: number
          no_index: number
          platform_id: number | null
          pricing_per_person: number | null
          settings: string | null
          slug: string
          template_id: number | null
          updated_at: string
          view_count: string | null
        }
        Insert: {
          ad_group_id?: number | null
          campaign_type_id?: number | null
          channel_id?: number | null
          created_at: string
          destination_id?: number | null
          destination_thumbnail_id?: number | null
          exclusion?: string | null
          gallery_template_id?: number | null
          headline: string
          id: number
          inclusion?: string | null
          itinerary_days_data?: string | null
          itinerary_id?: number | null
          meta_description?: string | null
          meta_footer?: string | null
          meta_header?: string | null
          meta_image?: string | null
          meta_tags?: string | null
          meta_title?: string | null
          no_follow?: number
          no_index?: number
          platform_id?: number | null
          pricing_per_person?: number | null
          settings?: string | null
          slug: string
          template_id?: number | null
          updated_at?: string
          view_count?: string | null
        }
        Update: {
          ad_group_id?: number | null
          campaign_type_id?: number | null
          channel_id?: number | null
          created_at?: string
          destination_id?: number | null
          destination_thumbnail_id?: number | null
          exclusion?: string | null
          gallery_template_id?: number | null
          headline?: string
          id?: number
          inclusion?: string | null
          itinerary_days_data?: string | null
          itinerary_id?: number | null
          meta_description?: string | null
          meta_footer?: string | null
          meta_header?: string | null
          meta_image?: string | null
          meta_tags?: string | null
          meta_title?: string | null
          no_follow?: number
          no_index?: number
          platform_id?: number | null
          pricing_per_person?: number | null
          settings?: string | null
          slug?: string
          template_id?: number | null
          updated_at?: string
          view_count?: string | null
        }
        Relationships: []
      }
      legacy_leads: {
        Row: {
          ad_group_id: number | null
          allocated_to: number | null
          campaign_type_id: number | null
          channel_id: number | null
          created_at: string | null
          customer_id: number
          disposition_id: number | null
          email: string | null
          id: number
          is_hot: boolean
          itinerary_id: number | null
          name: string | null
          platform: string | null
          platform_id: number | null
          remarks: string | null
          sales_status: string | null
          sales_status_id: number | null
          source: string
          source_id: number | null
          travel_date: string | null
          updated_at: string | null
        }
        Insert: {
          ad_group_id?: number | null
          allocated_to?: number | null
          campaign_type_id?: number | null
          channel_id?: number | null
          created_at?: string | null
          customer_id: number
          disposition_id?: number | null
          email?: string | null
          id: number
          is_hot?: boolean
          itinerary_id?: number | null
          name?: string | null
          platform?: string | null
          platform_id?: number | null
          remarks?: string | null
          sales_status?: string | null
          sales_status_id?: number | null
          source?: string
          source_id?: number | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_group_id?: number | null
          allocated_to?: number | null
          campaign_type_id?: number | null
          channel_id?: number | null
          created_at?: string | null
          customer_id?: number
          disposition_id?: number | null
          email?: string | null
          id?: number
          is_hot?: boolean
          itinerary_id?: number | null
          name?: string | null
          platform?: string | null
          platform_id?: number | null
          remarks?: string | null
          sales_status?: string | null
          sales_status_id?: number | null
          source?: string
          source_id?: number | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legacy_users: {
        Row: {
          created_at: string | null
          email: string
          id: number
          name: string
          password: string
          remember_token: string | null
          role_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: number
          name: string
          password: string
          remember_token?: string | null
          role_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          name?: string
          password?: string
          remember_token?: string | null
          role_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      master_values: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          legacy_id: number | null
          parent_value: string | null
          sort_order: number | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: number | null
          parent_value?: string | null
          sort_order?: number | null
          type: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: number | null
          parent_value?: string | null
          sort_order?: number | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          done_at: string | null
          due_at: string
          id: string
          lead_id: string | null
          notes: string | null
          reminder_type: string
          status: string
          title: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_at: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          reminder_type?: string
          status?: string
          title: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          reminder_type?: string
          status?: string
          title?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_cashflow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_cashflow_sales_view"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          permission: string
          role: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          permission: string
          role: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          permission?: string
          role?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          author: string | null
          category: string
          content: string | null
          cover_image_url: string | null
          created_at: string | null
          destination_id: string | null
          excerpt: string | null
          id: string
          is_published: boolean | null
          og_image_url: string | null
          published_at: string | null
          read_time_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          destination_id?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          og_image_url?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          destination_id?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          og_image_url?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      travel_stories: {
        Row: {
          author: string | null
          category: string | null
          content_html: string | null
          created_at: string | null
          excerpt: string | null
          focus_keyword: string | null
          id: string
          published_at: string | null
          read_time_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content_html?: string | null
          created_at?: string | null
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content_html?: string | null
          created_at?: string | null
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      traveller_code_merges: {
        Row: {
          email: string
          id: string
          merged_at: string
          new_code: string
          old_code: string
          rows_affected: Json
        }
        Insert: {
          email: string
          id?: string
          merged_at?: string
          new_code: string
          old_code: string
          rows_affected?: Json
        }
        Update: {
          email?: string
          id?: string
          merged_at?: string
          new_code?: string
          old_code?: string
          rows_affected?: Json
        }
        Relationships: []
      }
      traveller_code_sequence: {
        Row: {
          last_sequence: number
          year_prefix: string
        }
        Insert: {
          last_sequence?: number
          year_prefix: string
        }
        Update: {
          last_sequence?: number
          year_prefix?: string
        }
        Relationships: []
      }
      trip_cashflow: {
        Row: {
          agreed_selling_price: number | null
          assigned_to: string | null
          booking_date: string | null
          cashflow_code: string
          created_at: string | null
          created_by: string | null
          custom_itinerary_url: string | null
          destination_id: string | null
          gst_billing: boolean | null
          id: string
          is_customized: boolean | null
          itinerary_id: string | null
          lead_id: string | null
          margin_percent: number | null
          notes: string | null
          pan_card_url: string | null
          pax_count: number | null
          status: string | null
          travel_end_date: string | null
          travel_start_date: string | null
          traveller_code: string
          traveller_name: string
          trip_stage: string
          updated_at: string | null
          zoho_invoice_ref: string | null
        }
        Insert: {
          agreed_selling_price?: number | null
          assigned_to?: string | null
          booking_date?: string | null
          cashflow_code?: string
          created_at?: string | null
          created_by?: string | null
          custom_itinerary_url?: string | null
          destination_id?: string | null
          gst_billing?: boolean | null
          id?: string
          is_customized?: boolean | null
          itinerary_id?: string | null
          lead_id?: string | null
          margin_percent?: number | null
          notes?: string | null
          pan_card_url?: string | null
          pax_count?: number | null
          status?: string | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          traveller_code: string
          traveller_name: string
          trip_stage?: string
          updated_at?: string | null
          zoho_invoice_ref?: string | null
        }
        Update: {
          agreed_selling_price?: number | null
          assigned_to?: string | null
          booking_date?: string | null
          cashflow_code?: string
          created_at?: string | null
          created_by?: string | null
          custom_itinerary_url?: string | null
          destination_id?: string | null
          gst_billing?: boolean | null
          id?: string
          is_customized?: boolean | null
          itinerary_id?: string | null
          lead_id?: string | null
          margin_percent?: number | null
          notes?: string | null
          pan_card_url?: string | null
          pax_count?: number | null
          status?: string | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          traveller_code?: string
          traveller_name?: string
          trip_stage?: string
          updated_at?: string | null
          zoho_invoice_ref?: string | null
        }
        Relationships: []
      }
      trip_cashflow_vendors: {
        Row: {
          amount_paid: number
          cashflow_id: string
          cost_per_pax_incl_gst: number
          created_at: string | null
          description: string | null
          id: string
          invoice_url: string | null
          payment_status: string
          service_type: string
          sort_order: number | null
          vendor_id: string | null
        }
        Insert: {
          amount_paid?: number
          cashflow_id: string
          cost_per_pax_incl_gst?: number
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          payment_status?: string
          service_type: string
          sort_order?: number | null
          vendor_id?: string | null
        }
        Update: {
          amount_paid?: number
          cashflow_id?: string
          cost_per_pax_incl_gst?: number
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          payment_status?: string
          service_type?: string
          sort_order?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_cashflow_vendors_cashflow_id_fkey"
            columns: ["cashflow_id"]
            isOneToOne: false
            referencedRelation: "trip_cashflow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_cashflow_vendors_cashflow_id_fkey"
            columns: ["cashflow_id"]
            isOneToOne: false
            referencedRelation: "trip_cashflow_sales_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_cashflow_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          legacy_id: number | null
          mobile: string | null
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          legacy_id?: number | null
          mobile?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          mobile?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_code_sequence: {
        Row: {
          last_sequence: number
          year_prefix: string
        }
        Insert: {
          last_sequence?: number
          year_prefix: string
        }
        Update: {
          last_sequence?: number
          year_prefix?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          bank_account: string | null
          bank_ifsc: string | null
          bank_micr: string | null
          bank_name: string | null
          bank_swift: string | null
          contact_points: Json | null
          created_at: string | null
          gst: string | null
          id: string
          is_active: boolean | null
          name: string
          nick_name: string | null
          notes: string | null
          office_address_1: string | null
          office_address_2: string | null
          pan: string | null
          serve_destinations: string[] | null
          services: string[] | null
          updated_at: string | null
          vendor_code: string
        }
        Insert: {
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_micr?: string | null
          bank_name?: string | null
          bank_swift?: string | null
          contact_points?: Json | null
          created_at?: string | null
          gst?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nick_name?: string | null
          notes?: string | null
          office_address_1?: string | null
          office_address_2?: string | null
          pan?: string | null
          serve_destinations?: string[] | null
          services?: string[] | null
          updated_at?: string | null
          vendor_code: string
        }
        Update: {
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_micr?: string | null
          bank_name?: string | null
          bank_swift?: string | null
          contact_points?: Json | null
          created_at?: string | null
          gst?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nick_name?: string | null
          notes?: string | null
          office_address_1?: string | null
          office_address_2?: string | null
          pan?: string | null
          serve_destinations?: string[] | null
          services?: string[] | null
          updated_at?: string | null
          vendor_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      trip_cashflow_sales_view: {
        Row: {
          assigned_to: string | null
          booking_date: string | null
          cashflow_code: string | null
          created_at: string | null
          created_by: string | null
          custom_itinerary_url: string | null
          destination_id: string | null
          gst_billing: boolean | null
          id: string | null
          is_customized: boolean | null
          itinerary_id: string | null
          lead_id: string | null
          notes: string | null
          pan_card_url: string | null
          pax_count: number | null
          status: string | null
          travel_end_date: string | null
          travel_start_date: string | null
          traveller_code: string | null
          traveller_name: string | null
          trip_stage: string | null
          updated_at: string | null
          zoho_invoice_ref: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_date?: string | null
          cashflow_code?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_itinerary_url?: string | null
          destination_id?: string | null
          gst_billing?: boolean | null
          id?: string | null
          is_customized?: boolean | null
          itinerary_id?: string | null
          lead_id?: string | null
          notes?: string | null
          pan_card_url?: string | null
          pax_count?: number | null
          status?: string | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          traveller_code?: string | null
          traveller_name?: string | null
          trip_stage?: string | null
          updated_at?: string | null
          zoho_invoice_ref?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_date?: string | null
          cashflow_code?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_itinerary_url?: string | null
          destination_id?: string | null
          gst_billing?: boolean | null
          id?: string | null
          is_customized?: boolean | null
          itinerary_id?: string | null
          lead_id?: string | null
          notes?: string | null
          pan_card_url?: string | null
          pax_count?: number | null
          status?: string | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          traveller_code?: string | null
          traveller_name?: string | null
          trip_stage?: string | null
          updated_at?: string | null
          zoho_invoice_ref?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      generate_adv_traveller_code: { Args: never; Returns: string }
      get_vendor_safe: { Args: { p_vendor_id: string }; Returns: Json }
      increment_story_views: {
        Args: { story_slug: string }
        Returns: undefined
      }
      is_admin_or_higher: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
