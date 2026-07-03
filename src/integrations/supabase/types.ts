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
      datavista: {
        Row: {
          content: string
          id: number
        }
        Insert: {
          content: string
          id?: number
        }
        Update: {
          content?: string
          id?: number
        }
        Relationships: []
      }
      eCarteira: {
        Row: {
          ACOMODACAO: string | null
          ANO_OCORRENCIA: number | null
          atualizacao_a_cada_60min: string | null
          BASE_OCORRENCIA: string | null
          CANCELAMENTO: string | null
          CDREGUSR: string | null
          CIDADE_CONTRATO: string | null
          CIDADE_OFICIAL: string | null
          CIDADE_PLANO: string | null
          CNPJ_EMPRESA_ASSOC: string | null
          COD_BENEF_ANS: number | null
          Contratacao: string | null
          CONTRATO: number | null
          CPF: number | null
          DATA_CADASTRO: string | null
          Data_ocorrencia: string | null
          DEP: number | null
          DIA_OCORRENCIA: number | null
          Faixa_etaria: string | null
          IDADE: number | null
          idsex: string | null
          MES_OCORRENCIA: number | null
          MOTIVO_CANCELAMENTO: string | null
          NASCIMENTO: string | null
          NOME_BENEFICIARIO: string | null
          NOME_EMPRESA_ASSOC: string | null
          NOME_PLANO: string | null
          NOME_RESPONSAVEL: string | null
          Ocorrencia: string | null
          PLANO: number | null
          Plano_de: string | null
          PME: string | null
          Produto: string | null
          REATIVACAO: string | null
          Recuperacao: string | null
          STATUS: string | null
          tem_repasse: string | null
          TIPO_CONTRATACAO: string | null
          TIPO_LINHA: string | null
          Tipo_Plano_Contratacao: string | null
          UF_CIDADE_OFICIAL: string | null
          UF_PLANO: string | null
          valor_maior: number | null
          VALOR_TIMM: number | null
          VALOR_TMM_NA_DATA: number | null
          VENDEDOR: string | null
          VIGENCIA_BENEFICIARIO: string | null
          VIGENCIA_CONTRATO: string | null
        }
        Insert: {
          ACOMODACAO?: string | null
          ANO_OCORRENCIA?: number | null
          atualizacao_a_cada_60min?: string | null
          BASE_OCORRENCIA?: string | null
          CANCELAMENTO?: string | null
          CDREGUSR?: string | null
          CIDADE_CONTRATO?: string | null
          CIDADE_OFICIAL?: string | null
          CIDADE_PLANO?: string | null
          CNPJ_EMPRESA_ASSOC?: string | null
          COD_BENEF_ANS?: number | null
          Contratacao?: string | null
          CONTRATO?: number | null
          CPF?: number | null
          DATA_CADASTRO?: string | null
          Data_ocorrencia?: string | null
          DEP?: number | null
          DIA_OCORRENCIA?: number | null
          Faixa_etaria?: string | null
          IDADE?: number | null
          idsex?: string | null
          MES_OCORRENCIA?: number | null
          MOTIVO_CANCELAMENTO?: string | null
          NASCIMENTO?: string | null
          NOME_BENEFICIARIO?: string | null
          NOME_EMPRESA_ASSOC?: string | null
          NOME_PLANO?: string | null
          NOME_RESPONSAVEL?: string | null
          Ocorrencia?: string | null
          PLANO?: number | null
          Plano_de?: string | null
          PME?: string | null
          Produto?: string | null
          REATIVACAO?: string | null
          Recuperacao?: string | null
          STATUS?: string | null
          tem_repasse?: string | null
          TIPO_CONTRATACAO?: string | null
          TIPO_LINHA?: string | null
          Tipo_Plano_Contratacao?: string | null
          UF_CIDADE_OFICIAL?: string | null
          UF_PLANO?: string | null
          valor_maior?: number | null
          VALOR_TIMM?: number | null
          VALOR_TMM_NA_DATA?: number | null
          VENDEDOR?: string | null
          VIGENCIA_BENEFICIARIO?: string | null
          VIGENCIA_CONTRATO?: string | null
        }
        Update: {
          ACOMODACAO?: string | null
          ANO_OCORRENCIA?: number | null
          atualizacao_a_cada_60min?: string | null
          BASE_OCORRENCIA?: string | null
          CANCELAMENTO?: string | null
          CDREGUSR?: string | null
          CIDADE_CONTRATO?: string | null
          CIDADE_OFICIAL?: string | null
          CIDADE_PLANO?: string | null
          CNPJ_EMPRESA_ASSOC?: string | null
          COD_BENEF_ANS?: number | null
          Contratacao?: string | null
          CONTRATO?: number | null
          CPF?: number | null
          DATA_CADASTRO?: string | null
          Data_ocorrencia?: string | null
          DEP?: number | null
          DIA_OCORRENCIA?: number | null
          Faixa_etaria?: string | null
          IDADE?: number | null
          idsex?: string | null
          MES_OCORRENCIA?: number | null
          MOTIVO_CANCELAMENTO?: string | null
          NASCIMENTO?: string | null
          NOME_BENEFICIARIO?: string | null
          NOME_EMPRESA_ASSOC?: string | null
          NOME_PLANO?: string | null
          NOME_RESPONSAVEL?: string | null
          Ocorrencia?: string | null
          PLANO?: number | null
          Plano_de?: string | null
          PME?: string | null
          Produto?: string | null
          REATIVACAO?: string | null
          Recuperacao?: string | null
          STATUS?: string | null
          tem_repasse?: string | null
          TIPO_CONTRATACAO?: string | null
          TIPO_LINHA?: string | null
          Tipo_Plano_Contratacao?: string | null
          UF_CIDADE_OFICIAL?: string | null
          UF_PLANO?: string | null
          valor_maior?: number | null
          VALOR_TIMM?: number | null
          VALOR_TMM_NA_DATA?: number | null
          VENDEDOR?: string | null
          VIGENCIA_BENEFICIARIO?: string | null
          VIGENCIA_CONTRATO?: string | null
        }
        Relationships: []
      }
      iContabil: {
        Row: {
          cd_contabil: number | null
        }
        Insert: {
          cd_contabil?: number | null
        }
        Update: {
          cd_contabil?: number | null
        }
        Relationships: []
      }
      icontabil_orcamento: {
        Row: {
          ds_mes: string | null
          G1: string | null
          G2: string | null
          G3: string | null
          G4: string | null
          nr_ano: number
          nr_mes: number | null
          nr_trimestre: number | null
          O1: string | null
          RxO: string | null
          Valor: number | null
        }
        Insert: {
          ds_mes?: string | null
          G1?: string | null
          G2?: string | null
          G3?: string | null
          G4?: string | null
          nr_ano?: number
          nr_mes?: number | null
          nr_trimestre?: number | null
          O1?: string | null
          RxO?: string | null
          Valor?: number | null
        }
        Update: {
          ds_mes?: string | null
          G1?: string | null
          G2?: string | null
          G3?: string | null
          G4?: string | null
          nr_ano?: number
          nr_mes?: number | null
          nr_trimestre?: number | null
          O1?: string | null
          RxO?: string | null
          Valor?: number | null
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
