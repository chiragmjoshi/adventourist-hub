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
      automations_log: {
        Row: {
          channel: string
          fired_at: string | null
          id: string
          lead_id: string | null
          recipient_email: string | null
          recipient_mobile: string | null
          response_payload: Json | null
          status: string | null
          template_name: string | null
          trigger_event: string
        }
        Insert: {
          channel: string
          fired_at?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string | null
          recipient_mobile?: string | null
          response_payload?: Json | null
          status?: string | null
          template_name?: string | null
          trigger_event: string
        }
        Update: {
          channel?: string
          fired_at?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string | null
          recipient_mobile?: string | null
          response_payload?: Json | null
          status?: string | null
          template_name?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      destinations: {
        Row: {
          about: string | null
          best_months: string[] | null
          created_at: string | null
          gallery: string[] | null
          hero_image: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          suitable_for: string[] | null
          testimonials: Json | null
          themes: string[] | null
        }
        Insert: {
          about?: string | null
          best_months?: string[] | null
          created_at?: string | null
          gallery?: string[] | null
          hero_image?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          suitable_for?: string[] | null
          testimonials?: Json | null
          themes?: string[] | null
        }
        Update: {
          about?: string | null
          best_months?: string[] | null
          created_at?: string | null
          gallery?: string[] | null
          hero_image?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          suitable_for?: string[] | null
          testimonials?: Json | null
          themes?: string[] | null
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          about: string | null
          best_months: string[] | null
          breakfast_included: boolean | null
          created_at: string | null
          days: number | null
          destination_id: string | null
          destination_type: string | null
          exclusions: string | null
          flights_included: boolean | null
          gallery: string[] | null
          headline: string
          hero_image: string | null
          highlights: string[] | null
          id: string
          inclusions: string | null
          itinerary_days: Json | null
          meals_included: boolean | null
          nights: number | null
          price_per_person: number | null
          published_at: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          sightseeing_included: boolean | null
          slug: string
          status: string | null
          stay_included: boolean | null
          suitable_for: string[] | null
          support_247: boolean | null
          themes: string[] | null
          transfers_included: boolean | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          best_months?: string[] | null
          breakfast_included?: boolean | null
          created_at?: string | null
          days?: number | null
          destination_id?: string | null
          destination_type?: string | null
          exclusions?: string | null
          flights_included?: boolean | null
          gallery?: string[] | null
          headline: string
          hero_image?: string | null
          highlights?: string[] | null
          id?: string
          inclusions?: string | null
          itinerary_days?: Json | null
          meals_included?: boolean | null
          nights?: number | null
          price_per_person?: number | null
          published_at?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          sightseeing_included?: boolean | null
          slug: string
          status?: string | null
          stay_included?: boolean | null
          suitable_for?: string[] | null
          support_247?: boolean | null
          themes?: string[] | null
          transfers_included?: boolean | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          best_months?: string[] | null
          breakfast_included?: boolean | null
          created_at?: string | null
          days?: number | null
          destination_id?: string | null
          destination_type?: string | null
          exclusions?: string | null
          flights_included?: boolean | null
          gallery?: string[] | null
          headline?: string
          hero_image?: string | null
          highlights?: string[] | null
          id?: string
          inclusions?: string | null
          itinerary_days?: Json | null
          meals_included?: boolean | null
          nights?: number | null
          price_per_person?: number | null
          published_at?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          sightseeing_included?: boolean | null
          slug?: string
          status?: string | null
          stay_included?: boolean | null
          suitable_for?: string[] | null
          support_247?: boolean | null
          themes?: string[] | null
          transfers_included?: boolean | null
          updated_at?: string | null
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
          created_at: string | null
          custom_exclusions: string | null
          custom_inclusions: string | null
          destination_id: string | null
          destination_type: string[] | null
          form_after_submit_message: string | null
          form_submit_text: string | null
          form_subtitle: string | null
          form_terms_label: string | null
          form_title: string | null
          gallery: string[] | null
          hero_headline: string | null
          hero_image: string | null
          hero_subtext: string | null
          id: string
          is_active: boolean | null
          itinerary_id: string | null
          name: string
          platform: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          stay_days: string | null
          suitable_for: string[] | null
          template: string | null
          testimonial_ids: string[] | null
          time_to_visit: string[] | null
          updated_at: string | null
          why_adventourist: string | null
        }
        Insert: {
          ad_group?: string | null
          budget?: number | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string | null
          custom_exclusions?: string | null
          custom_inclusions?: string | null
          destination_id?: string | null
          destination_type?: string[] | null
          form_after_submit_message?: string | null
          form_submit_text?: string | null
          form_subtitle?: string | null
          form_terms_label?: string | null
          form_title?: string | null
          gallery?: string[] | null
          hero_headline?: string | null
          hero_image?: string | null
          hero_subtext?: string | null
          id?: string
          is_active?: boolean | null
          itinerary_id?: string | null
          name: string
          platform?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          stay_days?: string | null
          suitable_for?: string[] | null
          template?: string | null
          testimonial_ids?: string[] | null
          time_to_visit?: string[] | null
          updated_at?: string | null
          why_adventourist?: string | null
        }
        Update: {
          ad_group?: string | null
          budget?: number | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string | null
          custom_exclusions?: string | null
          custom_inclusions?: string | null
          destination_id?: string | null
          destination_type?: string[] | null
          form_after_submit_message?: string | null
          form_submit_text?: string | null
          form_subtitle?: string | null
          form_terms_label?: string | null
          form_title?: string | null
          gallery?: string[] | null
          hero_headline?: string | null
          hero_image?: string | null
          hero_subtext?: string | null
          id?: string
          is_active?: boolean | null
          itinerary_id?: string | null
          name?: string
          platform?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          stay_days?: string | null
          suitable_for?: string[] | null
          template?: string | null
          testimonial_ids?: string[] | null
          time_to_visit?: string[] | null
          updated_at?: string | null
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
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_timeline: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          lead_id: string | null
          metadata: Json | null
          note: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          note?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
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
      leads: {
        Row: {
          ad_group: string | null
          address: string | null
          assigned_to: string | null
          campaign_type: string | null
          channel: string | null
          created_at: string | null
          customer_tag: string | null
          destination_id: string | null
          disposition: string | null
          email: string | null
          id: string
          itinerary_id: string | null
          landing_page_id: string | null
          mobile: string | null
          name: string
          notes: string | null
          platform: string | null
          sales_status: string | null
          travel_date: string | null
          traveller_code: string
          updated_at: string | null
        }
        Insert: {
          ad_group?: string | null
          address?: string | null
          assigned_to?: string | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string | null
          customer_tag?: string | null
          destination_id?: string | null
          disposition?: string | null
          email?: string | null
          id?: string
          itinerary_id?: string | null
          landing_page_id?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          platform?: string | null
          sales_status?: string | null
          travel_date?: string | null
          traveller_code: string
          updated_at?: string | null
        }
        Update: {
          ad_group?: string | null
          address?: string | null
          assigned_to?: string | null
          campaign_type?: string | null
          channel?: string | null
          created_at?: string | null
          customer_tag?: string | null
          destination_id?: string | null
          disposition?: string | null
          email?: string | null
          id?: string
          itinerary_id?: string | null
          landing_page_id?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          platform?: string | null
          sales_status?: string | null
          travel_date?: string | null
          traveller_code?: string
          updated_at?: string | null
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
      master_values: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          type: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          type?: string
          value?: string
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
          assigned_to: string | null
          booking_date: string | null
          cashflow_code: string
          created_at: string | null
          created_by: string | null
          destination_id: string | null
          gst_billing: boolean | null
          id: string
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
          updated_at: string | null
          zoho_invoice_ref: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_date?: string | null
          cashflow_code?: string
          created_at?: string | null
          created_by?: string | null
          destination_id?: string | null
          gst_billing?: boolean | null
          id?: string
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
          updated_at?: string | null
          zoho_invoice_ref?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_date?: string | null
          cashflow_code?: string
          created_at?: string | null
          created_by?: string | null
          destination_id?: string | null
          gst_billing?: boolean | null
          id?: string
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
          updated_at?: string | null
          zoho_invoice_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_cashflow_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_cashflow_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_cashflow_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_cashflow_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_cashflow_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_cashflow_vendors: {
        Row: {
          cashflow_id: string
          cost_per_pax_incl_gst: number
          created_at: string | null
          description: string | null
          id: string
          invoice_url: string | null
          service_type: string
          sort_order: number | null
          vendor_id: string | null
        }
        Insert: {
          cashflow_id: string
          cost_per_pax_incl_gst?: number
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          service_type: string
          sort_order?: number | null
          vendor_id?: string | null
        }
        Update: {
          cashflow_id?: string
          cost_per_pax_incl_gst?: number
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
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
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          role: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
