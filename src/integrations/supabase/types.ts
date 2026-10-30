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
      dre_gerencial_2t2026: {
        Row: {
          g1: string | null
          g2: string | null
          g3: string | null
          g4: string | null
          id: number
          nr_ano: number
          nr_mes: number
          nr_trimestre: number
          valor: number
        }
        Insert: {
          g1?: string | null
          g2?: string | null
          g3?: string | null
          g4?: string | null
          id?: number
          nr_ano: number
          nr_mes: number
          nr_trimestre: number
          valor?: number
        }
        Update: {
          g1?: string | null
          g2?: string | null
          g3?: string | null
          g4?: string | null
          id?: number
          nr_ano?: number
          nr_mes?: number
          nr_trimestre?: number
          valor?: number
        }
        Relationships: []
      }
      orcamento_2026: {
        Row: {
          created_at: string
          id: number
          item: string
          nr_mes: number
          previsto: number
          realizado: number
        }
        Insert: {
          created_at?: string
          id?: number
          item: string
          nr_mes: number
          previsto?: number
          realizado?: number
        }
        Update: {
          created_at?: string
          id?: number
          item?: string
          nr_mes?: number
          previsto?: number
          realizado?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      simulador_campos: {
        Row: {
          created_at: string
          field: string
          id: string
          simulation_id: string
          stage_id: string
          updated_at: string
          user_id: string
          value: Json
          view_id: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          simulation_id: string
          stage_id: string
          updated_at?: string
          user_id: string
          value: Json
          view_id: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          simulation_id?: string
          stage_id?: string
          updated_at?: string
          user_id?: string
          value?: Json
          view_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_campos_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulador_simulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulador_campos_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "simulador_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulador_campos_view_id_fkey"
            columns: ["view_id"]
            isOneToOne: false
            referencedRelation: "simulador_visoes"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_etapas: {
        Row: {
          created_at: string
          data: Json
          id: string
          simulation_id: string
          stage: number
          status: string
          updated_at: string
          user_id: string
          view_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          simulation_id: string
          stage: number
          status?: string
          updated_at?: string
          user_id: string
          view_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          simulation_id?: string
          stage?: number
          status?: string
          updated_at?: string
          user_id?: string
          view_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_etapas_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulador_simulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulador_etapas_view_id_fkey"
            columns: ["view_id"]
            isOneToOne: false
            referencedRelation: "simulador_visoes"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_simulacoes: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      simulador_visoes: {
        Row: {
          created_at: string
          id: string
          position: number
          simulation_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          simulation_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          simulation_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_visoes_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulador_simulacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      simulador_action: {
        Args: {
          p_action: string
          p_data?: Json
          p_name?: string
          p_simulation?: string
          p_stage?: number
          p_view?: number
        }
        Returns: string
      }
      simulador_action_checked: {
        Args: {
          p_action: string
          p_data?: Json
          p_expected_updated_at?: string
          p_name?: string
          p_simulation?: string
          p_stage?: number
          p_view?: number
        }
        Returns: string
      }
      simulador_delete: { Args: { p_simulation: string }; Returns: undefined }
      simulador_validate_stage: {
        Args: { p_data: Json; p_stage: number }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
