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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_builder_proposals: {
        Row: {
          applied_at: string | null
          apply_result: Json | null
          business_id: string | null
          created_at: string
          dry_run_report: Json | null
          id: string
          kind: Database["public"]["Enums"]["ai_builder_proposal_kind"]
          payload: Json
          project_id: string | null
          proposed_by: string
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ai_builder_proposal_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          apply_result?: Json | null
          business_id?: string | null
          created_at?: string
          dry_run_report?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["ai_builder_proposal_kind"]
          payload?: Json
          project_id?: string | null
          proposed_by: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ai_builder_proposal_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          apply_result?: Json | null
          business_id?: string | null
          created_at?: string
          dry_run_report?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["ai_builder_proposal_kind"]
          payload?: Json
          project_id?: string | null
          proposed_by?: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ai_builder_proposal_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_builder_proposals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_builder_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_code_patterns: {
        Row: {
          code_snippet: string
          created_at: string | null
          description: string | null
          id: string
          pattern_type: string
          success_rate: number | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          code_snippet: string
          created_at?: string | null
          description?: string | null
          id?: string
          pattern_type: string
          success_rate?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          code_snippet?: string
          created_at?: string | null
          description?: string | null
          id?: string
          pattern_type?: string
          success_rate?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      ai_learning_sessions: {
        Row: {
          ai_response: string
          code_generated: string | null
          created_at: string | null
          feedback_score: number | null
          id: string
          session_type: string
          technologies_used: string[] | null
          user_id: string | null
          user_prompt: string
          was_successful: boolean | null
        }
        Insert: {
          ai_response: string
          code_generated?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          session_type: string
          technologies_used?: string[] | null
          user_id?: string | null
          user_prompt: string
          was_successful?: boolean | null
        }
        Update: {
          ai_response?: string
          code_generated?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          session_type?: string
          technologies_used?: string[] | null
          user_id?: string | null
          user_prompt?: string
          was_successful?: boolean | null
        }
        Relationships: []
      }
      ai_request_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number | null
          provider: string
          status_code: number | null
          success: boolean
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          prompt_tokens?: number | null
          provider: string
          status_code?: number | null
          success?: boolean
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number | null
          provider?: string
          status_code?: number | null
          success?: boolean
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          business_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          event_id: string | null
          id: string
          input_payload: Json
          latency_ms: number | null
          output_payload: Json | null
          plugin_instance_id: string | null
          status: string
          tokens_used: number | null
          tool_calls: Json | null
        }
        Insert: {
          business_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          input_payload?: Json
          latency_ms?: number | null
          output_payload?: Json | null
          plugin_instance_id?: string | null
          status?: string
          tokens_used?: number | null
          tool_calls?: Json | null
        }
        Update: {
          business_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          input_payload?: Json
          latency_ms?: number | null
          output_payload?: Json | null
          plugin_instance_id?: string | null
          status?: string
          tokens_used?: number | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      app_components: {
        Row: {
          application_id: string
          code: string
          created_at: string | null
          css: string | null
          data_source: Json | null
          dependencies: string[] | null
          description: string | null
          id: string
          imports: string[] | null
          is_reusable: boolean | null
          language: string | null
          name: string
          path: string
          props_schema: Json | null
          tags: string[] | null
          tailwind_classes: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          application_id: string
          code: string
          created_at?: string | null
          css?: string | null
          data_source?: Json | null
          dependencies?: string[] | null
          description?: string | null
          id?: string
          imports?: string[] | null
          is_reusable?: boolean | null
          language?: string | null
          name: string
          path: string
          props_schema?: Json | null
          tags?: string[] | null
          tailwind_classes?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          code?: string
          created_at?: string | null
          css?: string | null
          data_source?: Json | null
          dependencies?: string[] | null
          description?: string | null
          id?: string
          imports?: string[] | null
          is_reusable?: boolean | null
          language?: string | null
          name?: string
          path?: string
          props_schema?: Json | null
          tags?: string[] | null
          tailwind_classes?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_components_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "generated_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      app_data_sources: {
        Row: {
          application_id: string
          cache_duration: number | null
          cache_enabled: boolean | null
          computation: string | null
          config: Json
          created_at: string | null
          data: Json | null
          endpoint: string | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          method: string | null
          name: string
          query: string | null
          table_name: string | null
          transform_function: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          application_id: string
          cache_duration?: number | null
          cache_enabled?: boolean | null
          computation?: string | null
          config: Json
          created_at?: string | null
          data?: Json | null
          endpoint?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          method?: string | null
          name: string
          query?: string | null
          table_name?: string | null
          transform_function?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          cache_duration?: number | null
          cache_enabled?: boolean | null
          computation?: string | null
          config?: Json
          created_at?: string | null
          data?: Json | null
          endpoint?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          method?: string | null
          name?: string
          query?: string | null
          table_name?: string | null
          transform_function?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_data_sources_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "generated_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      app_deployments: {
        Row: {
          application_id: string
          build_duration: number | null
          build_id: string | null
          build_log: string | null
          completed_at: string | null
          config: Json | null
          created_at: string | null
          deployed_by: string | null
          environment: string | null
          environment_variables: Json | null
          error_details: Json | null
          error_message: string | null
          id: string
          platform: string
          preview_url: string | null
          status: string | null
          updated_at: string | null
          url: string | null
          version: number
        }
        Insert: {
          application_id: string
          build_duration?: number | null
          build_id?: string | null
          build_log?: string | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          deployed_by?: string | null
          environment?: string | null
          environment_variables?: Json | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          platform: string
          preview_url?: string | null
          status?: string | null
          updated_at?: string | null
          url?: string | null
          version: number
        }
        Update: {
          application_id?: string
          build_duration?: number | null
          build_id?: string | null
          build_log?: string | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          deployed_by?: string | null
          environment?: string | null
          environment_variables?: Json | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          platform?: string
          preview_url?: string | null
          status?: string | null
          updated_at?: string | null
          url?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_deployments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "generated_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_recipe_packs: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          industry: string
          is_published: boolean | null
          name: string
          pack_id: string
          recipes: Json | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          industry: string
          is_published?: boolean | null
          name: string
          pack_id: string
          recipes?: Json | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          industry?: string
          is_published?: boolean | null
          name?: string
          pack_id?: string
          recipes?: Json | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          business_id: string
          created_at: string
          ends_at: string
          id: string
          is_booked: boolean
          service_id: string | null
          starts_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          ends_at: string
          id?: string
          is_booked?: boolean
          service_id?: string | null
          starts_at: string
        }
        Update: {
          business_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          is_booked?: boolean
          service_id?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          colors: Json | null
          created_at: string | null
          document_id: string
          fonts: string[] | null
          id: string
          logo_url: string | null
        }
        Insert: {
          colors?: Json | null
          created_at?: string | null
          document_id: string
          fonts?: string[] | null
          id?: string
          logo_url?: string | null
        }
        Update: {
          colors?: Json | null
          created_at?: string | null
          document_id?: string
          fonts?: string[] | null
          id?: string
          logo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_drafts: {
        Row: {
          business_id: string | null
          code: string
          created_at: string
          editor_code: string | null
          id: string
          metadata: Json | null
          name: string | null
          project_id: string | null
          site_id: string | null
          template_id: string | null
          updated_at: string
          user_id: string
          vfs_files: Json | null
        }
        Insert: {
          business_id?: string | null
          code?: string
          created_at?: string
          editor_code?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          project_id?: string | null
          site_id?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
          vfs_files?: Json | null
        }
        Update: {
          business_id?: string | null
          code?: string
          created_at?: string
          editor_code?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          project_id?: string | null
          site_id?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
          vfs_files?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_drafts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_drafts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "design_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_envelope_runs: {
        Row: {
          blocking_count: number
          business_id: string | null
          confidence: number | null
          created_at: string
          domains: string[]
          draft_id: string | null
          envelope: Json
          envelope_source: string | null
          id: string
          mode: string | null
          model_used: string | null
          out_of_scope_count: number
          outcome: string
          outcome_detail: Json | null
          project_id: string | null
          prompt: string | null
          provider_used: string | null
          repair_accepted: boolean
          repair_attempted: boolean
          request_kinds: string[]
          touched_files: string[]
          unmet_count: number
          updated_at: string
          user_id: string | null
          verification: Json
          verification_checked: boolean
          verification_passed: boolean | null
        }
        Insert: {
          blocking_count?: number
          business_id?: string | null
          confidence?: number | null
          created_at?: string
          domains?: string[]
          draft_id?: string | null
          envelope?: Json
          envelope_source?: string | null
          id?: string
          mode?: string | null
          model_used?: string | null
          out_of_scope_count?: number
          outcome?: string
          outcome_detail?: Json | null
          project_id?: string | null
          prompt?: string | null
          provider_used?: string | null
          repair_accepted?: boolean
          repair_attempted?: boolean
          request_kinds?: string[]
          touched_files?: string[]
          unmet_count?: number
          updated_at?: string
          user_id?: string | null
          verification?: Json
          verification_checked?: boolean
          verification_passed?: boolean | null
        }
        Update: {
          blocking_count?: number
          business_id?: string | null
          confidence?: number | null
          created_at?: string
          domains?: string[]
          draft_id?: string | null
          envelope?: Json
          envelope_source?: string | null
          id?: string
          mode?: string | null
          model_used?: string | null
          out_of_scope_count?: number
          outcome?: string
          outcome_detail?: Json | null
          project_id?: string | null
          prompt?: string | null
          provider_used?: string | null
          repair_accepted?: boolean
          repair_attempted?: boolean
          request_kinds?: string[]
          touched_files?: string[]
          unmet_count?: number
          updated_at?: string
          user_id?: string | null
          verification?: Json
          verification_checked?: boolean
          verification_passed?: boolean | null
        }
        Relationships: []
      }
      business_automation_settings: {
        Row: {
          auto_reply_timing: string | null
          business_id: string
          calendar_connected: boolean | null
          created_at: string | null
          email_alerts_enabled: boolean | null
          email_enabled: boolean | null
          id: string
          review_link: string | null
          sms_enabled: boolean | null
          sms_followup_enabled: boolean | null
          stripe_connected: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_reply_timing?: string | null
          business_id: string
          calendar_connected?: boolean | null
          created_at?: string | null
          email_alerts_enabled?: boolean | null
          email_enabled?: boolean | null
          id?: string
          review_link?: string | null
          sms_enabled?: boolean | null
          sms_followup_enabled?: boolean | null
          stripe_connected?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_reply_timing?: string | null
          business_id?: string
          calendar_connected?: boolean | null
          created_at?: string | null
          email_alerts_enabled?: boolean | null
          email_enabled?: boolean | null
          id?: string
          review_link?: string | null
          sms_enabled?: boolean | null
          sms_followup_enabled?: boolean | null
          stripe_connected?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      business_installs: {
        Row: {
          business_id: string
          id: string
          installed_at: string
          installed_by: string | null
          packs: string[]
          status: string
          system_type: string
        }
        Insert: {
          business_id: string
          id?: string
          installed_at?: string
          installed_by?: string | null
          packs?: string[]
          status?: string
          system_type: string
        }
        Update: {
          business_id?: string
          id?: string
          installed_at?: string
          installed_by?: string | null
          packs?: string[]
          status?: string
          system_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_installs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          permissions: Json | null
          role: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_setup_progress: {
        Row: {
          business_id: string
          completed_at: string | null
          config: Json
          created_at: string
          id: string
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          id?: string
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          id?: string
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_setup_progress_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: Json
          brand_color: string | null
          created_at: string | null
          description: string | null
          email: string | null
          hours: Json
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notification_email: string | null
          notification_phone: string | null
          owner_id: string
          phone: string | null
          settings: Json | null
          slug: string | null
          social_links: Json
          tagline: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: Json
          brand_color?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          hours?: Json
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notification_email?: string | null
          notification_phone?: string | null
          owner_id: string
          phone?: string | null
          settings?: Json | null
          slug?: string | null
          social_links?: Json
          tagline?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: Json
          brand_color?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          hours?: Json
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notification_email?: string | null
          notification_phone?: string | null
          owner_id?: string
          phone?: string | null
          settings?: Json | null
          slug?: string | null
          social_links?: Json
          tagline?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      catalog_collections: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          manual_item_ids: string[]
          name: string
          project_id: string | null
          rules: Json
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind: string
          manual_item_ids?: string[]
          name: string
          project_id?: string | null
          rules?: Json
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          manual_item_ids?: string[]
          name?: string
          project_id?: string | null
          rules?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          component_data: Json | null
          content: string
          conversation_id: string
          created_at: string
          has_code: boolean | null
          id: string
          role: string
        }
        Insert: {
          component_data?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          has_code?: boolean | null
          id?: string
          role: string
        }
        Update: {
          component_data?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          has_code?: boolean | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          clip_in: number
          clip_out: number
          created_at: string | null
          effects: Json | null
          id: string
          src: string
          timeline_start: number
          track_id: string
          transforms: Json | null
        }
        Insert: {
          clip_in?: number
          clip_out?: number
          created_at?: string | null
          effects?: Json | null
          id?: string
          src: string
          timeline_start?: number
          track_id: string
          transforms?: Json | null
        }
        Update: {
          clip_in?: number
          clip_out?: number
          created_at?: string | null
          effects?: Json | null
          id?: string
          src?: string
          timeline_start?: number
          track_id?: string
          transforms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clips_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      component_definitions: {
        Row: {
          category: string
          component_type: string
          created_at: string
          description: string | null
          html_template: string | null
          id: string
          is_system: boolean
          name: string
          output_events: Json
          required_binding_keys: Json
          required_business_fields: Json
          required_setup_steps: Json
          slug: string
          target_type: string
          updated_at: string
        }
        Insert: {
          category: string
          component_type: string
          created_at?: string
          description?: string | null
          html_template?: string | null
          id?: string
          is_system?: boolean
          name: string
          output_events?: Json
          required_binding_keys?: Json
          required_business_fields?: Json
          required_setup_steps?: Json
          slug: string
          target_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          component_type?: string
          created_at?: string
          description?: string | null
          html_template?: string | null
          id?: string
          is_system?: boolean
          name?: string
          output_events?: Json
          required_binding_keys?: Json
          required_business_fields?: Json
          required_setup_steps?: Json
          slug?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          business_id: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          project_id: string | null
          title: string
          type: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          title: string
          type: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          business_id: string | null
          company: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          external_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          project_id: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          project_id?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          project_id?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_form_captures: {
        Row: {
          created_at: string | null
          field_mappings: Json
          form_selector: string
          id: string
          pipeline_id: string | null
          project_id: string | null
          stage: string
          tags: string[] | null
          updated_at: string | null
          workflow_ids: string[] | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          field_mappings: Json
          form_selector: string
          id?: string
          pipeline_id?: string | null
          project_id?: string | null
          stage: string
          tags?: string[] | null
          updated_at?: string | null
          workflow_ids?: string[] | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          field_mappings?: Json
          form_selector?: string
          id?: string
          pipeline_id?: string | null
          project_id?: string | null
          stage?: string
          tags?: string[] | null
          updated_at?: string | null
          workflow_ids?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_form_captures_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_form_submissions: {
        Row: {
          business_id: string | null
          component_id: string | null
          consent_metadata: Json
          contact_id: string | null
          created_at: string
          data: Json
          form_id: string
          form_name: string | null
          id: string
          idempotency_key: string | null
          intent: string | null
          ip_address: string | null
          lead_id: string | null
          page_id: string | null
          project_id: string | null
          referrer: string | null
          site_id: string | null
          snapshot_id: string | null
          source_url: string | null
          submitted_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workflow_triggered: boolean
        }
        Insert: {
          business_id?: string | null
          component_id?: string | null
          consent_metadata?: Json
          contact_id?: string | null
          created_at?: string
          data?: Json
          form_id: string
          form_name?: string | null
          id?: string
          idempotency_key?: string | null
          intent?: string | null
          ip_address?: string | null
          lead_id?: string | null
          page_id?: string | null
          project_id?: string | null
          referrer?: string | null
          site_id?: string | null
          snapshot_id?: string | null
          source_url?: string | null
          submitted_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workflow_triggered?: boolean
        }
        Update: {
          business_id?: string | null
          component_id?: string | null
          consent_metadata?: Json
          contact_id?: string | null
          created_at?: string
          data?: Json
          form_id?: string
          form_name?: string | null
          id?: string
          idempotency_key?: string | null
          intent?: string | null
          ip_address?: string | null
          lead_id?: string | null
          page_id?: string | null
          project_id?: string | null
          referrer?: string | null
          site_id?: string | null
          snapshot_id?: string | null
          source_url?: string | null
          submitted_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workflow_triggered?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "crm_form_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_form_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_form_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_funnel_conversions: {
        Row: {
          completed_steps: Json | null
          contact_id: string | null
          converted: boolean | null
          converted_at: string | null
          current_step: string | null
          funnel_id: string | null
          id: string
          last_activity: string | null
          started_at: string | null
          workspace_id: string
        }
        Insert: {
          completed_steps?: Json | null
          contact_id?: string | null
          converted?: boolean | null
          converted_at?: string | null
          current_step?: string | null
          funnel_id?: string | null
          id?: string
          last_activity?: string | null
          started_at?: string | null
          workspace_id: string
        }
        Update: {
          completed_steps?: Json | null
          contact_id?: string | null
          converted?: boolean | null
          converted_at?: string | null
          current_step?: string | null
          funnel_id?: string | null
          id?: string
          last_activity?: string | null
          started_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_funnel_conversions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_funnel_conversions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "crm_funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_funnels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string | null
          steps: Json
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          steps: Json
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          steps?: Json
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          business_id: string | null
          company: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          external_id: string | null
          id: string
          intent: string | null
          metadata: Json
          name: string | null
          phone: string | null
          pipeline_id: string | null
          project_id: string | null
          source: string | null
          stage: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          value: number | null
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          company?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          id?: string
          intent?: string | null
          metadata?: Json
          name?: string | null
          phone?: string | null
          pipeline_id?: string | null
          project_id?: string | null
          source?: string | null
          stage: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          company?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          id?: string
          intent?: string | null
          metadata?: Json
          name?: string | null
          phone?: string | null
          pipeline_id?: string | null
          project_id?: string | null
          source?: string | null
          stage?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string | null
          stages: Json
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          stages: Json
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          stages?: Json
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      crm_workflow_jobs: {
        Row: {
          action_config: Json
          action_type: string
          attempts: number | null
          context_data: Json | null
          created_at: string | null
          executed_at: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          scheduled_for: string | null
          status: string | null
          workflow_id: string | null
          workflow_run_id: string | null
          workspace_id: string
        }
        Insert: {
          action_config: Json
          action_type: string
          attempts?: number | null
          context_data?: Json | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          scheduled_for?: string | null
          status?: string | null
          workflow_id?: string | null
          workflow_run_id?: string | null
          workspace_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          attempts?: number | null
          context_data?: Json | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          scheduled_for?: string | null
          status?: string | null
          workflow_id?: string | null
          workflow_run_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_jobs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_jobs_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "crm_workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string | null
          trigger_data: Json | null
          workflow_id: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          workflow_id?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          workflow_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflows: {
        Row: {
          actions: Json
          active: boolean | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          actions: Json
          active?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          actions?: Json
          active?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      design_schemas: {
        Row: {
          color_scheme: Json
          created_at: string
          description: string | null
          effects: Json
          gradients: Json
          guidelines: string[]
          id: string
          is_active: boolean
          keywords: string[]
          pattern_name: string
          pattern_type: string
          priority: number
          schema_type: string | null
          shadows: Json
          tailwind_utilities: string[]
          updated_at: string
        }
        Insert: {
          color_scheme?: Json
          created_at?: string
          description?: string | null
          effects?: Json
          gradients?: Json
          guidelines?: string[]
          id?: string
          is_active?: boolean
          keywords?: string[]
          pattern_name: string
          pattern_type: string
          priority?: number
          schema_type?: string | null
          shadows?: Json
          tailwind_utilities?: string[]
          updated_at?: string
        }
        Update: {
          color_scheme?: Json
          created_at?: string
          description?: string | null
          effects?: Json
          gradients?: Json
          guidelines?: string[]
          id?: string
          is_active?: boolean
          keywords?: string[]
          pattern_name?: string
          pattern_type?: string
          priority?: number
          schema_type?: string | null
          shadows?: Json
          tailwind_utilities?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          canvas_data: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_data: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_history: {
        Row: {
          created_at: string | null
          created_by: string
          document_id: string
          id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          created_by: string
          document_id: string
          id?: string
          snapshot: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string
          document_id?: string
          id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "document_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          key: string
          source: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key: string
          source?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key?: string
          source?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_offers: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          cta_href: string | null
          cta_intent: string | null
          cta_label: string | null
          description: string | null
          discount_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          metadata: Json
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          cta_href?: string | null
          cta_intent?: string | null
          cta_label?: string | null
          description?: string | null
          discount_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          cta_href?: string | null
          cta_intent?: string | null
          cta_label?: string | null
          description?: string | null
          discount_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      file_access_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_id: string | null
          id: string
          session_id: string
          token: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_id?: string | null
          id?: string
          session_id: string
          token?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_id?: string | null
          id?: string
          session_id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_access_tokens_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string | null
          created_by: string
          file_id: string
          id: string
          size: number
          storage_path: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by: string
          file_id: string
          id?: string
          size: number
          storage_path: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string
          file_id?: string
          id?: string
          size?: number
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          folder_path: string | null
          id: string
          is_favorite: boolean | null
          mime_type: string
          name: string
          size: number
          storage_path: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          folder_path?: string | null
          id?: string
          is_favorite?: boolean | null
          mime_type: string
          name: string
          size: number
          storage_path: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          folder_path?: string | null
          id?: string
          is_favorite?: boolean | null
          mime_type?: string
          name?: string
          size?: number
          storage_path?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      form_definitions: {
        Row: {
          business_id: string
          created_at: string
          destination: Json
          external_id: string
          fields: Json
          id: string
          intent: string
          is_active: boolean
          name: string
          project_id: string | null
          site_id: string | null
          success_behavior: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          destination?: Json
          external_id: string
          fields?: Json
          id?: string
          intent: string
          is_active?: boolean
          name: string
          project_id?: string | null
          site_id?: string | null
          success_behavior?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          destination?: Json
          external_id?: string
          fields?: Json
          id?: string
          intent?: string
          is_active?: boolean
          name?: string
          project_id?: string | null
          site_id?: string | null
          success_behavior?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_definitions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_definitions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_applications: {
        Row: {
          backend_deployed: boolean | null
          backend_endpoints: Json | null
          config: Json
          created_at: string | null
          database_migrated: boolean | null
          database_schema: Json | null
          deployed_at: string | null
          deployment_error: string | null
          deployment_platform: string | null
          deployment_status: string | null
          deployment_url: string | null
          description: string | null
          features: string[] | null
          files: Json | null
          forks_count: number | null
          frontend_deployed: boolean | null
          frontend_framework: string | null
          has_authentication: boolean | null
          has_backend: boolean | null
          has_database: boolean | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          metadata: Json | null
          name: string
          parent_id: string | null
          preview_html: string | null
          preview_url: string | null
          project_id: string | null
          tags: string[] | null
          type: string
          updated_at: string | null
          user_id: string | null
          version: number | null
          views_count: number | null
          workspace_id: string | null
        }
        Insert: {
          backend_deployed?: boolean | null
          backend_endpoints?: Json | null
          config: Json
          created_at?: string | null
          database_migrated?: boolean | null
          database_schema?: Json | null
          deployed_at?: string | null
          deployment_error?: string | null
          deployment_platform?: string | null
          deployment_status?: string | null
          deployment_url?: string | null
          description?: string | null
          features?: string[] | null
          files?: Json | null
          forks_count?: number | null
          frontend_deployed?: boolean | null
          frontend_framework?: string | null
          has_authentication?: boolean | null
          has_backend?: boolean | null
          has_database?: boolean | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          parent_id?: string | null
          preview_html?: string | null
          preview_url?: string | null
          project_id?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
          views_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          backend_deployed?: boolean | null
          backend_endpoints?: Json | null
          config?: Json
          created_at?: string | null
          database_migrated?: boolean | null
          database_schema?: Json | null
          deployed_at?: string | null
          deployment_error?: string | null
          deployment_platform?: string | null
          deployment_status?: string | null
          deployment_url?: string | null
          description?: string | null
          features?: string[] | null
          files?: Json | null
          forks_count?: number | null
          frontend_deployed?: boolean | null
          frontend_framework?: string | null
          has_authentication?: boolean | null
          has_backend?: boolean | null
          has_database?: boolean | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          preview_html?: string | null
          preview_url?: string | null
          project_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
          views_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_applications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "generated_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pages: {
        Row: {
          created_at: string | null
          html_content: string | null
          id: string
          prompt: string
          schema: Json
          theme_tokens: Json | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          html_content?: string | null
          id?: string
          prompt: string
          schema: Json
          theme_tokens?: Json | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          html_content?: string | null
          id?: string
          prompt?: string
          schema?: Json
          theme_tokens?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ghl_event_reactions: {
        Row: {
          action_config: Json
          action_type: string
          business_id: string
          created_at: string
          created_by: string | null
          enabled: boolean
          event_type: string
          id: string
          last_triggered_at: string | null
          name: string
          pipeline_filter: string | null
          project_id: string | null
          stage_filter: string | null
          trigger_count: number
          updated_at: string
          workflow_filter: string | null
        }
        Insert: {
          action_config?: Json
          action_type: string
          business_id: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          event_type: string
          id?: string
          last_triggered_at?: string | null
          name: string
          pipeline_filter?: string | null
          project_id?: string | null
          stage_filter?: string | null
          trigger_count?: number
          updated_at?: string
          workflow_filter?: string | null
        }
        Update: {
          action_config?: Json
          action_type?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          event_type?: string
          id?: string
          last_triggered_at?: string | null
          name?: string
          pipeline_filter?: string | null
          project_id?: string | null
          stage_filter?: string | null
          trigger_count?: number
          updated_at?: string
          workflow_filter?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_event_reactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_event_reactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_webhook_events: {
        Row: {
          business_id: string | null
          contact_id: string | null
          created_at: string
          event_type: string
          headers: Json
          id: string
          location_id: string | null
          opportunity_id: string | null
          payload: Json
          pipeline_id: string | null
          previous_stage_id: string | null
          process_error: string | null
          processed: boolean
          processed_at: string | null
          project_id: string | null
          signature: string | null
          stage_id: string | null
          workflow_id: string | null
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_type: string
          headers?: Json
          id?: string
          location_id?: string | null
          opportunity_id?: string | null
          payload?: Json
          pipeline_id?: string | null
          previous_stage_id?: string | null
          process_error?: string | null
          processed?: boolean
          processed_at?: string | null
          project_id?: string | null
          signature?: string | null
          stage_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_type?: string
          headers?: Json
          id?: string
          location_id?: string | null
          opportunity_id?: string | null
          payload?: Json
          pipeline_id?: string | null
          previous_stage_id?: string | null
          process_error?: string | null
          processed?: boolean
          processed_at?: string | null
          project_id?: string | null
          signature?: string | null
          stage_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_webhook_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      installed_packs: {
        Row: {
          business_id: string
          config: Json | null
          id: string
          installed_at: string
          pack_id: string
          pack_version: string | null
          project_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          config?: Json | null
          id?: string
          installed_at?: string
          pack_id: string
          pack_version?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          config?: Json | null
          id?: string
          installed_at?: string
          pack_id?: string
          pack_version?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installed_packs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installed_packs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      installed_recipe_packs: {
        Row: {
          business_id: string
          enabled: boolean | null
          id: string
          installed_at: string | null
          pack_id: string
        }
        Insert: {
          business_id: string
          enabled?: boolean | null
          id?: string
          installed_at?: string | null
          pack_id: string
        }
        Update: {
          business_id?: string
          enabled?: boolean | null
          id?: string
          installed_at?: string | null
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installed_recipe_packs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installed_recipe_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "automation_recipe_packs"
            referencedColumns: ["pack_id"]
          },
        ]
      }
      intent_events: {
        Row: {
          automation_run_id: string | null
          automation_triggered: boolean | null
          binding_id: string | null
          build_id: string | null
          business_id: string
          client_actions: Json | null
          created_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: string
          intent_id: string
          ip_address: unknown
          ok: boolean
          page_id: string
          params: Json | null
          result: Json | null
          session_id: string | null
          site_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          automation_run_id?: string | null
          automation_triggered?: boolean | null
          binding_id?: string | null
          build_id?: string | null
          business_id: string
          client_actions?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          intent_id: string
          ip_address?: unknown
          ok: boolean
          page_id: string
          params?: Json | null
          result?: Json | null
          session_id?: string | null
          site_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          automation_run_id?: string | null
          automation_triggered?: boolean | null
          binding_id?: string | null
          build_id?: string | null
          business_id?: string
          client_actions?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          intent_id?: string
          ip_address?: unknown
          ok?: boolean
          page_id?: string
          params?: Json | null
          result?: Json | null
          session_id?: string | null
          site_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_events_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "site_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_execution_log: {
        Row: {
          binding_id: string | null
          business_id: string
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          intent: string
          payload: Json | null
          project_id: string | null
          recipes_triggered: string[] | null
          result_data: Json | null
          result_status: string
          source: string | null
          source_url: string | null
          workflows_triggered: string[] | null
        }
        Insert: {
          binding_id?: string | null
          business_id: string
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          intent: string
          payload?: Json | null
          project_id?: string | null
          recipes_triggered?: string[] | null
          result_data?: Json | null
          result_status: string
          source?: string | null
          source_url?: string | null
          workflows_triggered?: string[] | null
        }
        Update: {
          binding_id?: string | null
          business_id?: string
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          intent?: string
          payload?: Json | null
          project_id?: string | null
          recipes_triggered?: string[] | null
          result_data?: Json | null
          result_status?: string
          source?: string | null
          source_url?: string | null
          workflows_triggered?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_execution_log_binding_id_fkey"
            columns: ["binding_id"]
            isOneToOne: false
            referencedRelation: "site_intent_bindings"
            referencedColumns: ["id"]
          },
        ]
      }
      layers: {
        Row: {
          adjustments: Json | null
          blend: Database["public"]["Enums"]["blend_mode"]
          created_at: string | null
          id: string
          kind: Database["public"]["Enums"]["layer_kind"]
          locked: boolean
          masks: Json | null
          opacity: number
          page_id: string
          payload: Json
          sort_order: number
          transform: Json
          visible: boolean
        }
        Insert: {
          adjustments?: Json | null
          blend?: Database["public"]["Enums"]["blend_mode"]
          created_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["layer_kind"]
          locked?: boolean
          masks?: Json | null
          opacity?: number
          page_id: string
          payload?: Json
          sort_order?: number
          transform?: Json
          visible?: boolean
        }
        Update: {
          adjustments?: Json | null
          blend?: Database["public"]["Enums"]["blend_mode"]
          created_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["layer_kind"]
          locked?: boolean
          masks?: Json | null
          opacity?: number
          page_id?: string
          payload?: Json
          sort_order?: number
          transform?: Json
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "layers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          auth_method: string | null
          blocked: boolean | null
          city: string | null
          country_code: string | null
          created_at: string
          device_name: string | null
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown
          location: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth_method?: string | null
          blocked?: boolean | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_name?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth_method?: string | null
          blocked?: boolean | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_name?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean
          business_id: string
          category: string | null
          created_at: string
          currency: string
          description: string | null
          dietary_tags: string[]
          featured: boolean
          id: string
          image_url: string | null
          metadata: Json
          name: string
          price_cents: number
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          business_id: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          dietary_tags?: string[]
          featured?: boolean
          id?: string
          image_url?: string | null
          metadata?: Json
          name: string
          price_cents?: number
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          business_id?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          dietary_tags?: string[]
          featured?: boolean
          id?: string
          image_url?: string | null
          metadata?: Json
          name?: string
          price_cents?: number
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_state: {
        Row: {
          business_name: string | null
          completed: boolean
          completed_steps: string[]
          created_at: string
          current_step: string
          industry: string | null
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          completed?: boolean
          completed_steps?: string[]
          created_at?: string
          current_step?: string
          industry?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          completed?: boolean
          completed_steps?: string[]
          created_at?: string
          current_step?: string
          industry?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          organization_id: string
          role: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          organization_id: string
          role?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing: Json
          created_at: string
          description: string | null
          id: string
          industry: string | null
          logo: string | null
          member_count: number
          name: string
          owner_id: string | null
          project_count: number
          size: string | null
          slug: string | null
          status: string
          storage_used: number
          updated_at: string
          website: string | null
        }
        Insert: {
          billing?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo?: string | null
          member_count?: number
          name: string
          owner_id?: string | null
          project_count?: number
          size?: string | null
          slug?: string | null
          status?: string
          storage_used?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          billing?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo?: string | null
          member_count?: number
          name?: string
          owner_id?: string | null
          project_count?: number
          size?: string | null
          slug?: string | null
          status?: string
          storage_used?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      page_graphs: {
        Row: {
          business_id: string
          created_at: string
          id: string
          nav_index: Json
          pages: Json
          project_id: string
          updated_at: string
          version: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          nav_index?: Json
          pages?: Json
          project_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          nav_index?: Json
          pages?: Json
          project_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          created_at: string | null
          id: string
          page_id: string | null
          schema: Json
          section_type: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_id?: string | null
          schema: Json
          section_type: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          page_id?: string | null
          schema?: Json
          section_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          background: Json | null
          created_at: string | null
          document_id: string
          height: number
          id: string
          sort_order: number
          width: number
        }
        Insert: {
          background?: Json | null
          created_at?: string | null
          document_id: string
          height?: number
          id?: string
          sort_order?: number
          width?: number
        }
        Update: {
          background?: Json | null
          created_at?: string | null
          document_id?: string
          height?: number
          id?: string
          sort_order?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          business_id: string
          client_name: string | null
          completed_at: string | null
          cover_image_url: string | null
          created_at: string
          external_url: string | null
          featured: boolean
          gallery: Json
          id: string
          metadata: Json
          sort_order: number
          subtitle: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          client_name?: string | null
          completed_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          external_url?: string | null
          featured?: boolean
          gallery?: Json
          id?: string
          metadata?: Json
          sort_order?: number
          subtitle?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          client_name?: string | null
          completed_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          external_url?: string | null
          featured?: boolean
          gallery?: Json
          id?: string
          metadata?: Json
          sort_order?: number
          subtitle?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_session_pages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          path: string
          session_id: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          path: string
          session_id: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          path?: string
          session_id?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preview_session_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          billing_interval: string | null
          business_id: string
          created_at: string
          cta_intent: string | null
          currency: string
          description: string | null
          features: Json
          highlighted: boolean
          id: string
          is_active: boolean
          metadata: Json
          name: string
          price_cents: number
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          business_id: string
          created_at?: string
          cta_intent?: string | null
          currency?: string
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          price_cents?: number
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          business_id?: string
          created_at?: string
          cta_intent?: string | null
          currency?: string
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          price_cents?: number
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      project_assets: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_public: boolean | null
          mime_type: string | null
          name: string
          path: string
          project_id: string | null
          public_url: string | null
          size: number | null
          type: string | null
          updated_at: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          name: string
          path: string
          project_id?: string | null
          public_url?: string | null
          size?: number | null
          type?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          name?: string
          path?: string
          project_id?: string | null
          public_url?: string | null
          size?: number | null
          type?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_component_bindings: {
        Row: {
          binding_key: string
          component_instance_id: string
          config: Json
          created_at: string
          id: string
          project_id: string
          target_kind: string
          target_ref: string
          updated_at: string
        }
        Insert: {
          binding_key: string
          component_instance_id: string
          config?: Json
          created_at?: string
          id?: string
          project_id: string
          target_kind: string
          target_ref: string
          updated_at?: string
        }
        Update: {
          binding_key?: string
          component_instance_id?: string
          config?: Json
          created_at?: string
          id?: string
          project_id?: string
          target_kind?: string
          target_ref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_component_bindings_component_instance_id_fkey"
            columns: ["component_instance_id"]
            isOneToOne: false
            referencedRelation: "project_component_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_component_bindings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_component_instances: {
        Row: {
          bindings: Json
          builder_draft_id: string | null
          component_type: string
          created_at: string
          definition_slug: string | null
          id: string
          label: string
          output_events: Json
          page_ids: Json
          project_id: string
          props: Json
          required_capabilities: Json
          source: string
          source_instance_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bindings?: Json
          builder_draft_id?: string | null
          component_type: string
          created_at?: string
          definition_slug?: string | null
          id?: string
          label: string
          output_events?: Json
          page_ids?: Json
          project_id: string
          props?: Json
          required_capabilities?: Json
          source?: string
          source_instance_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bindings?: Json
          builder_draft_id?: string | null
          component_type?: string
          created_at?: string
          definition_slug?: string | null
          id?: string
          label?: string
          output_events?: Json
          page_ids?: Json
          project_id?: string
          props?: Json
          required_capabilities?: Json
          source?: string
          source_instance_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_component_instances_builder_draft_id_fkey"
            columns: ["builder_draft_id"]
            isOneToOne: false
            referencedRelation: "builder_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_component_instances_definition_slug_fkey"
            columns: ["definition_slug"]
            isOneToOne: false
            referencedRelation: "component_definitions"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "project_component_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_event_log: {
        Row: {
          actor_id: string | null
          component_instance_id: string | null
          created_at: string
          event_name: string
          id: string
          page_id: string | null
          payload: Json
          project_id: string
          source: string
        }
        Insert: {
          actor_id?: string | null
          component_instance_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          page_id?: string | null
          payload?: Json
          project_id: string
          source?: string
        }
        Update: {
          actor_id?: string | null
          component_instance_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          page_id?: string | null
          payload?: Json
          project_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_event_log_component_instance_id_fkey"
            columns: ["component_instance_id"]
            isOneToOne: false
            referencedRelation: "project_component_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_event_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          content: string | null
          created_at: string
          file_content: string | null
          file_id: string | null
          id: string
          kind: string
          metadata: Json | null
          mime: string | null
          mime_type: string | null
          name: string | null
          parent_id: string | null
          path: string
          project_id: string
          size: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_content?: string | null
          file_id?: string | null
          id?: string
          kind: string
          metadata?: Json | null
          mime?: string | null
          mime_type?: string | null
          name?: string | null
          parent_id?: string | null
          path: string
          project_id: string
          size?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_content?: string | null
          file_id?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          mime?: string | null
          mime_type?: string | null
          name?: string | null
          parent_id?: string | null
          path?: string
          project_id?: string
          size?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_page_seo: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          json_ld_data: Json | null
          json_ld_type: string | null
          keywords: string[] | null
          no_index: boolean | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          page_key: string
          project_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          json_ld_data?: Json | null
          json_ld_type?: string | null
          keywords?: string[] | null
          no_index?: boolean | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_key: string
          project_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          json_ld_data?: Json | null
          json_ld_type?: string | null
          keywords?: string[] | null
          no_index?: boolean | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_key?: string
          project_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_revisions: {
        Row: {
          created_at: string
          id: string
          label: string | null
          ops: Json
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          ops: Json
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          ops?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_seo: {
        Row: {
          business_id: string
          canonical_base_url: string | null
          created_at: string
          facebook_app_id: string | null
          favicon_url: string | null
          generate_sitemap: boolean | null
          id: string
          json_ld_data: Json | null
          json_ld_type: string | null
          og_image_url: string | null
          project_id: string
          robots_txt: string | null
          site_description: string
          site_keywords: string[] | null
          site_title: string
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          canonical_base_url?: string | null
          created_at?: string
          facebook_app_id?: string | null
          favicon_url?: string | null
          generate_sitemap?: boolean | null
          id?: string
          json_ld_data?: Json | null
          json_ld_type?: string | null
          og_image_url?: string | null
          project_id: string
          robots_txt?: string | null
          site_description?: string
          site_keywords?: string[] | null
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          canonical_base_url?: string | null
          created_at?: string
          facebook_app_id?: string | null
          favicon_url?: string | null
          generate_sitemap?: boolean | null
          id?: string
          json_ld_data?: Json | null
          json_ld_type?: string | null
          og_image_url?: string | null
          project_id?: string
          robots_txt?: string | null
          site_description?: string
          site_keywords?: string[] | null
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_settings: {
        Row: {
          automation_config: Json
          created_at: string
          crm_config: Json
          id: string
          project_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          automation_config?: Json
          created_at?: string
          crm_config?: Json
          id?: string
          project_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          automation_config?: Json
          created_at?: string
          crm_config?: Json
          id?: string
          project_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          business_id: string | null
          created_at: string | null
          custom_domain: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          publish_status: string
          published_at: string | null
          settings: Json
          site_id: string | null
          slug: string | null
          status: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          publish_status?: string
          published_at?: string | null
          settings?: Json
          site_id?: string | null
          slug?: string | null
          status?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          publish_status?: string
          published_at?: string | null
          settings?: Json
          site_id?: string | null
          slug?: string | null
          status?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_artifacts: {
        Row: {
          assets_checksum: string | null
          build_id: string
          bundle_id: string
          cdn_url: string | null
          created_at: string | null
          deploy_id: string | null
          deploy_url: string | null
          html_checksum: string | null
          id: string
          mode: string
          published_at: string | null
          site_id: string
          status: string
          version_number: number
        }
        Insert: {
          assets_checksum?: string | null
          build_id: string
          bundle_id: string
          cdn_url?: string | null
          created_at?: string | null
          deploy_id?: string | null
          deploy_url?: string | null
          html_checksum?: string | null
          id?: string
          mode: string
          published_at?: string | null
          site_id: string
          status?: string
          version_number?: number
        }
        Update: {
          assets_checksum?: string | null
          build_id?: string
          bundle_id?: string
          cdn_url?: string | null
          created_at?: string | null
          deploy_id?: string | null
          deploy_url?: string | null
          html_checksum?: string | null
          id?: string
          mode?: string
          published_at?: string | null
          site_id?: string
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "publish_artifacts_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "site_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_artifacts_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "site_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_artifacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_cents: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      shared_files: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_id: string
          id: string
          is_public: boolean | null
          permission: string
          public_token: string | null
          shared_by: string
          shared_with: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_id: string
          id?: string
          is_public?: boolean | null
          permission?: string
          public_token?: string | null
          shared_by: string
          shared_with?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_id?: string
          id?: string
          is_public?: boolean | null
          permission?: string
          public_token?: string | null
          shared_by?: string
          shared_with?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      site_builds: {
        Row: {
          context: Json | null
          created_at: string | null
          current_stage: string | null
          duration_ms: number | null
          error_message: string | null
          error_stage: string | null
          errors_count: number | null
          finished_at: string | null
          id: string
          mode: string
          site_id: string
          started_at: string | null
          status: string
          version: number
          warnings_count: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          current_stage?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stage?: string | null
          errors_count?: number | null
          finished_at?: string | null
          id?: string
          mode?: string
          site_id: string
          started_at?: string | null
          status?: string
          version?: number
          warnings_count?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          current_stage?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stage?: string | null
          errors_count?: number | null
          finished_at?: string | null
          id?: string
          mode?: string
          site_id?: string
          started_at?: string | null
          status?: string
          version?: number
          warnings_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_builds_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_bundles: {
        Row: {
          build_id: string
          bundle: Json
          checksum: string | null
          compression: string | null
          created_at: string | null
          id: string
          intent_count: number | null
          page_count: number | null
          schema_version: number
          site_id: string
          version: string
        }
        Insert: {
          build_id: string
          bundle: Json
          checksum?: string | null
          compression?: string | null
          created_at?: string | null
          id?: string
          intent_count?: number | null
          page_count?: number | null
          schema_version?: number
          site_id: string
          version?: string
        }
        Update: {
          build_id?: string
          bundle?: Json
          checksum?: string | null
          compression?: string | null
          created_at?: string | null
          id?: string
          intent_count?: number | null
          page_count?: number | null
          schema_version?: number
          site_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_bundles_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "site_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_bundles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_capabilities: {
        Row: {
          capability_id: string
          configuration: Json
          created_at: string
          enabled_by: string | null
          id: string
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          capability_id: string
          configuration?: Json
          created_at?: string
          enabled_by?: string | null
          id?: string
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          capability_id?: string
          configuration?: Json
          created_at?: string
          enabled_by?: string | null
          id?: string
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_capabilities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_data_bindings: {
        Row: {
          binding_type: string
          business_id: string
          collection_id: string | null
          created_at: string
          display_mapping: Json
          fallback_mode: string
          filters: Json
          id: string
          limit_count: number | null
          page_path: string
          project_id: string
          section_id: string
          slot_key: string | null
          snapshot_id: string | null
          sort: Json
          source_kind: string
          source_table: string
          updated_at: string
        }
        Insert: {
          binding_type?: string
          business_id: string
          collection_id?: string | null
          created_at?: string
          display_mapping?: Json
          fallback_mode?: string
          filters?: Json
          id?: string
          limit_count?: number | null
          page_path: string
          project_id: string
          section_id: string
          slot_key?: string | null
          snapshot_id?: string | null
          sort?: Json
          source_kind: string
          source_table: string
          updated_at?: string
        }
        Update: {
          binding_type?: string
          business_id?: string
          collection_id?: string | null
          created_at?: string
          display_mapping?: Json
          fallback_mode?: string
          filters?: Json
          id?: string
          limit_count?: number | null
          page_path?: string
          project_id?: string
          section_id?: string
          slot_key?: string | null
          snapshot_id?: string | null
          sort?: Json
          source_kind?: string
          source_table?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_data_bindings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_data_bindings_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "catalog_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_data_bindings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_intent_bindings: {
        Row: {
          business_id: string
          created_at: string | null
          element_key: string
          element_label: string | null
          enabled: boolean | null
          id: string
          intent: string
          intent_confidence: number | null
          last_triggered_at: string | null
          page_path: string
          payload_schema: Json | null
          project_id: string
          recipe_ids: string[] | null
          trigger_count: number | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          element_key: string
          element_label?: string | null
          enabled?: boolean | null
          id?: string
          intent: string
          intent_confidence?: number | null
          last_triggered_at?: string | null
          page_path?: string
          payload_schema?: Json | null
          project_id: string
          recipe_ids?: string[] | null
          trigger_count?: number | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          element_key?: string
          element_label?: string | null
          enabled?: boolean | null
          id?: string
          intent?: string
          intent_confidence?: number | null
          last_triggered_at?: string | null
          page_path?: string
          payload_schema?: Json | null
          project_id?: string
          recipe_ids?: string[] | null
          trigger_count?: number | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_intent_bindings_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      site_revisions: {
        Row: {
          backend_ops_applied: Json
          business_id: string
          created_at: string
          created_by: string
          diagnostics: Json
          draft_id: string
          id: string
          parent_revision_id: string | null
          patch_json: Json
          playground_state: Json
          project_id: string
          publish_blockers: Json
          publish_ready: boolean
          readiness_report: Json
          runtime_manifest: Json
          site_bundle_snapshot: Json
          source: string
          status: string
          vfs_files: Json
          vfs_hash: string | null
        }
        Insert: {
          backend_ops_applied?: Json
          business_id: string
          created_at?: string
          created_by: string
          diagnostics?: Json
          draft_id: string
          id?: string
          parent_revision_id?: string | null
          patch_json?: Json
          playground_state?: Json
          project_id: string
          publish_blockers?: Json
          publish_ready?: boolean
          readiness_report?: Json
          runtime_manifest?: Json
          site_bundle_snapshot?: Json
          source: string
          status?: string
          vfs_files?: Json
          vfs_hash?: string | null
        }
        Update: {
          backend_ops_applied?: Json
          business_id?: string
          created_at?: string
          created_by?: string
          diagnostics?: Json
          draft_id?: string
          id?: string
          parent_revision_id?: string | null
          patch_json?: Json
          playground_state?: Json
          project_id?: string
          publish_blockers?: Json
          publish_ready?: boolean
          readiness_report?: Json
          runtime_manifest?: Json
          site_bundle_snapshot?: Json
          source?: string
          status?: string
          vfs_files?: Json
          vfs_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_revisions_parent_revision_id_fkey"
            columns: ["parent_revision_id"]
            isOneToOne: false
            referencedRelation: "site_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_runtime_configs: {
        Row: {
          api_version: string
          attribution_required: boolean
          created_at: string
          external_deploy_allowed: boolean
          public_runtime_enabled: boolean
          settings: Json
          site_id: string
          updated_at: string
        }
        Insert: {
          api_version?: string
          attribution_required?: boolean
          created_at?: string
          external_deploy_allowed?: boolean
          public_runtime_enabled?: boolean
          settings?: Json
          site_id: string
          updated_at?: string
        }
        Update: {
          api_version?: string
          attribution_required?: boolean
          created_at?: string
          external_deploy_allowed?: boolean
          public_runtime_enabled?: boolean
          settings?: Json
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_runtime_configs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_setup_steps: {
        Row: {
          business_id: string
          category: string
          completed_at: string | null
          config: Json
          created_at: string
          id: string
          project_id: string
          required: boolean
          site_id: string
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          id?: string
          project_id: string
          required?: boolean
          site_id: string
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          id?: string
          project_id?: string
          required?: boolean
          site_id?: string
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_setup_steps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_setup_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_setup_steps_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_users: {
        Row: {
          business_id: string
          created_at: string | null
          email: string
          email_verified: boolean | null
          id: string
          last_login_at: string | null
          metadata: Json | null
          name: string | null
          password_hash: string
          site_id: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          name?: string | null
          password_hash: string
          site_id: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          name?: string | null
          password_hash?: string
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_users_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          business_id: string
          created_at: string | null
          current_build_id: string | null
          domain: string | null
          id: string
          name: string
          owner_user_id: string
          published_build_id: string | null
          settings: Json | null
          slug: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          current_build_id?: string | null
          domain?: string | null
          id?: string
          name: string
          owner_user_id: string
          published_build_id?: string | null
          settings?: Json | null
          slug?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          current_build_id?: string | null
          domain?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          published_build_id?: string | null
          settings?: Json | null
          slug?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sites_current_build"
            columns: ["current_build_id"]
            isOneToOne: false
            referencedRelation: "site_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sites_published_build"
            columns: ["published_build_id"]
            isOneToOne: false
            referencedRelation: "site_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          business_id: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          business_id: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          business_id?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          business_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json
          priority: string | null
          project_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: string | null
          project_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: string | null
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          canvas_data: Json
          created_at: string
          created_by: string
          id: string
          template_id: string
          version_number: number
        }
        Insert: {
          canvas_data: Json
          created_at?: string
          created_by: string
          id?: string
          template_id: string
          version_number: number
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          created_by?: string
          id?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "design_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          background_color: string | null
          category: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          frames: Json | null
          height: number
          id: string
          is_featured: boolean | null
          is_premium: boolean | null
          layers: Json
          like_count: number | null
          name: string
          owner_id: string
          payment: Json | null
          preview_images: string[] | null
          project_id: string | null
          redirects: Json | null
          requires_auth: boolean | null
          scheduling: Json | null
          status: string | null
          tags: string[] | null
          thumbnail: string | null
          updated_at: string | null
          usage_count: number | null
          version: string | null
          visibility: string | null
          width: number
        }
        Insert: {
          background_color?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          frames?: Json | null
          height?: number
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          layers?: Json
          like_count?: number | null
          name: string
          owner_id: string
          payment?: Json | null
          preview_images?: string[] | null
          project_id?: string | null
          redirects?: Json | null
          requires_auth?: boolean | null
          scheduling?: Json | null
          status?: string | null
          tags?: string[] | null
          thumbnail?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
          visibility?: string | null
          width?: number
        }
        Update: {
          background_color?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          frames?: Json | null
          height?: number
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          layers?: Json
          like_count?: number | null
          name?: string
          owner_id?: string
          payment?: Json | null
          preview_images?: string[] | null
          project_id?: string | null
          redirects?: Json | null
          requires_auth?: boolean | null
          scheduling?: Json | null
          status?: string | null
          tags?: string[] | null
          thumbnail?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
          visibility?: string | null
          width?: number
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          author_role: string | null
          business_id: string
          created_at: string
          featured: boolean
          id: string
          metadata: Json
          quote: string
          rating: number | null
          sort_order: number
          source: string | null
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          author_role?: string | null
          business_id: string
          created_at?: string
          featured?: boolean
          id?: string
          metadata?: Json
          quote: string
          rating?: number | null
          sort_order?: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          author_role?: string | null
          business_id?: string
          created_at?: string
          featured?: boolean
          id?: string
          metadata?: Json
          quote?: string
          rating?: number | null
          sort_order?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      timelines: {
        Row: {
          created_at: string | null
          document_id: string
          duration: number
          fps: number
          id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          duration?: number
          fps?: number
          id?: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          duration?: number
          fps?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string | null
          id: string
          sort_order: number
          timeline_id: string
          type: Database["public"]["Enums"]["track_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          sort_order?: number
          timeline_id: string
          type: Database["public"]["Enums"]["track_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          sort_order?: number
          timeline_id?: string
          type?: Database["public"]["Enums"]["track_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tracks_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          billing_period: string | null
          business_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          quantity: number | null
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          billing_period?: string | null
          business_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          quantity?: number | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          billing_period?: string | null
          business_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          quantity?: number | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_summary: {
        Row: {
          ai_generations: number | null
          billing_period: string
          builds_count: number | null
          builds_limit: number | null
          business_id: string
          id: string
          intent_executions: number | null
          intent_limit: number | null
          sites_count: number | null
          sites_limit: number | null
          storage_bytes: number | null
          storage_limit_bytes: number | null
          updated_at: string | null
          workflow_limit: number | null
          workflow_runs: number | null
        }
        Insert: {
          ai_generations?: number | null
          billing_period: string
          builds_count?: number | null
          builds_limit?: number | null
          business_id: string
          id?: string
          intent_executions?: number | null
          intent_limit?: number | null
          sites_count?: number | null
          sites_limit?: number | null
          storage_bytes?: number | null
          storage_limit_bytes?: number | null
          updated_at?: string | null
          workflow_limit?: number | null
          workflow_runs?: number | null
        }
        Update: {
          ai_generations?: number | null
          billing_period?: string
          builds_count?: number | null
          builds_limit?: number | null
          business_id?: string
          id?: string
          intent_executions?: number | null
          intent_limit?: number | null
          sites_count?: number | null
          sites_limit?: number | null
          storage_bytes?: number | null
          storage_limit_bytes?: number | null
          updated_at?: string | null
          workflow_limit?: number | null
          workflow_runs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_summary_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country_code: string | null
          created_at: string
          device_info: Json | null
          device_name: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_active: string | null
          location: string | null
          session_id: string | null
          session_token: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_info?: Json | null
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active?: string | null
          location?: string | null
          session_id?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_info?: Json | null
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active?: string | null
          location?: string | null
          session_id?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          ai_generations_reset_at: string | null
          ai_generations_used: number | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          projects_count: number | null
          status: string
          storage_used_mb: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_members_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generations_reset_at?: string | null
          ai_generations_used?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          projects_count?: number | null
          status?: string
          storage_used_mb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_members_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generations_reset_at?: string | null
          ai_generations_used?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          projects_count?: number | null
          status?: string
          storage_used_mb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_members_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string | null
          display_name: string | null
          invited_by: string | null
          invited_email: string | null
          is_active: boolean
          permissions: Json
          role: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          invited_by?: string | null
          invited_email?: string | null
          is_active?: boolean
          permissions?: Json
          role?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          invited_by?: string | null
          invited_email?: string | null
          is_active?: boolean
          permissions?: Json
          role?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_project_access: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      check_project_business_ownership: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      check_project_membership_role: {
        Args: { p_project_id: string; p_roles: string[]; p_user_id: string }
        Returns: boolean
      }
      check_project_ownership: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      check_project_visibility: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      check_usage_limit: {
        Args: { p_business_id: string; p_event_type: string }
        Returns: boolean
      }
      cleanup_old_preview_pages: { Args: never; Returns: undefined }
      current_session_id: { Args: never; Returns: string }
      get_design_schema_by_keyword: {
        Args: { search_keyword: string }
        Returns: {
          color_scheme: Json
          description: string
          guidelines: string[]
          pattern_name: string
          pattern_type: string
        }[]
      }
      get_page_intent_bindings: {
        Args: { p_page_path?: string; p_project_id: string }
        Returns: {
          binding_id: string
          element_key: string
          element_label: string
          enabled: boolean
          intent: string
          intent_confidence: number
          last_triggered_at: string
          recipe_ids: string[]
          trigger_count: number
          workflow_id: string
          workflow_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_pattern_usage: {
        Args: { pattern_id: string }
        Returns: undefined
      }
      is_business_admin: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_member: { Args: { p_business_id: string }; Returns: boolean }
      is_profile_owner: { Args: { profile_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_username_available: {
        Args: { desired_username: string; excluding_user_id?: string }
        Returns: boolean
      }
      reassign_project_business: {
        Args: { _project_id: string; _target_business_id: string }
        Returns: undefined
      }
      record_usage_event: {
        Args: {
          p_business_id: string
          p_event_type: string
          p_metadata?: Json
          p_quantity?: number
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: string
      }
      rename_project_path: {
        Args: { p_from_path: string; p_project_id: string; p_to_path: string }
        Returns: number
      }
      update_intent_binding_stats: {
        Args: { p_binding_id: string }
        Returns: undefined
      }
      update_username: { Args: { new_username: string }; Returns: Json }
      user_business_role: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      validate_file_share_token: {
        Args: { _file_id: string; _token: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_builder_proposal_kind:
        | "sql_migration"
        | "edge_function"
        | "config_change"
      ai_builder_proposal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "applied"
        | "failed"
      app_role: "admin" | "user"
      blend_mode:
        | "normal"
        | "multiply"
        | "screen"
        | "overlay"
        | "darken"
        | "lighten"
        | "color-dodge"
        | "color-burn"
        | "hard-light"
        | "soft-light"
        | "difference"
        | "exclusion"
      document_type: "design" | "video"
      layer_kind: "image" | "text" | "shape" | "group" | "video" | "audio"
      track_type: "video" | "audio" | "overlay"
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
    Enums: {
      ai_builder_proposal_kind: [
        "sql_migration",
        "edge_function",
        "config_change",
      ],
      ai_builder_proposal_status: [
        "pending",
        "approved",
        "rejected",
        "applied",
        "failed",
      ],
      app_role: ["admin", "user"],
      blend_mode: [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
      ],
      document_type: ["design", "video"],
      layer_kind: ["image", "text", "shape", "group", "video", "audio"],
      track_type: ["video", "audio", "overlay"],
    },
  },
} as const
