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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
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
            foreignKeyName: "builder_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "design_templates"
            referencedColumns: ["id"]
          },
        ]
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
          brand_color: string | null
          created_at: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notification_email: string | null
          notification_phone: string | null
          owner_id: string
          settings: Json | null
          slug: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          brand_color?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notification_email?: string | null
          notification_phone?: string | null
          owner_id: string
          settings?: Json | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          brand_color?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notification_email?: string | null
          notification_phone?: string | null
          owner_id?: string
          settings?: Json | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
          company: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          external_id: string | null
          id: string
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
          company?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          id?: string
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
          company?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          id?: string
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
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
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
      increment_pattern_usage: {
        Args: { pattern_id: string }
        Returns: undefined
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
      validate_file_share_token: {
        Args: { _file_id: string; _token: string }
        Returns: boolean
      }
    }
    Enums: {
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
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
