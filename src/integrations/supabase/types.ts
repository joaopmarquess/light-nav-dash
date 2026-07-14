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
      sv_ecarteira_ativos: {
        Row: {
          ACOMODACAO: string | null
          AGENTE: string | null
          atualizacao_a_cada_60min: string | null
          CANCELAMENTO: string | null
          CDREGUSR: number | null
          CIDADE_OFICIAL: string | null
          CIDADE_PLANO: string | null
          CNPJ_EMPRESA_ASSOC: string | null
          COD_TRANSF_DESTINO: string | null
          COD_TRANSF_ORIGEM: string | null
          codCampanhaMkt: string | null
          Contratacao: string | null
          CPF: string | null
          DATA_CADASTRO: string | null
          DATA_FIM_ATIVO: string | null
          DATA_INICIO_ATIVO: string | null
          Faixa_etaria: string | null
          IDADE: number | null
          idsex: string | null
          MOTIVO_CANCELAMENTO: string | null
          NASCIMENTO: string | null
          NOME_BENEFICIARIO: string | null
          NOME_EMPRESA_ASSOC: string | null
          NOME_PLANO: string | null
          NOME_RESPONSAVEL: string | null
          NomeCampanhamkt: string | null
          PLANO: number | null
          PME: string | null
          Produto: string | null
          REATIVACAO: string | null
          Recuperacao: string | null
          tem_repasse: string | null
          TIPO_CONTRATACAO: string | null
          TIPO_LINHA: string | null
          Tipo_Plano_Contratacao: string | null
          UF_CIDADE_OFICIAL: string | null
          UF_PLANO: string | null
          valor_maior: number | null
          VALOR_TMM: number | null
          VALOR_TMM_NA_DATA: number | null
          VENDEDOR: string | null
          VIGENCIA_BENEFICIARIO: string | null
          VIGENCIA_CONTRATO: string | null
          vrDescCampanha: string | null
        }
        Insert: {
          ACOMODACAO?: string | null
          AGENTE?: string | null
          atualizacao_a_cada_60min?: string | null
          CANCELAMENTO?: string | null
          CDREGUSR?: number | null
          CIDADE_OFICIAL?: string | null
          CIDADE_PLANO?: string | null
          CNPJ_EMPRESA_ASSOC?: string | null
          COD_TRANSF_DESTINO?: string | null
          COD_TRANSF_ORIGEM?: string | null
          codCampanhaMkt?: string | null
          Contratacao?: string | null
          CPF?: string | null
          DATA_CADASTRO?: string | null
          DATA_FIM_ATIVO?: string | null
          DATA_INICIO_ATIVO?: string | null
          Faixa_etaria?: string | null
          IDADE?: number | null
          idsex?: string | null
          MOTIVO_CANCELAMENTO?: string | null
          NASCIMENTO?: string | null
          NOME_BENEFICIARIO?: string | null
          NOME_EMPRESA_ASSOC?: string | null
          NOME_PLANO?: string | null
          NOME_RESPONSAVEL?: string | null
          NomeCampanhamkt?: string | null
          PLANO?: number | null
          PME?: string | null
          Produto?: string | null
          REATIVACAO?: string | null
          Recuperacao?: string | null
          tem_repasse?: string | null
          TIPO_CONTRATACAO?: string | null
          TIPO_LINHA?: string | null
          Tipo_Plano_Contratacao?: string | null
          UF_CIDADE_OFICIAL?: string | null
          UF_PLANO?: string | null
          valor_maior?: number | null
          VALOR_TMM?: number | null
          VALOR_TMM_NA_DATA?: number | null
          VENDEDOR?: string | null
          VIGENCIA_BENEFICIARIO?: string | null
          VIGENCIA_CONTRATO?: string | null
          vrDescCampanha?: string | null
        }
        Update: {
          ACOMODACAO?: string | null
          AGENTE?: string | null
          atualizacao_a_cada_60min?: string | null
          CANCELAMENTO?: string | null
          CDREGUSR?: number | null
          CIDADE_OFICIAL?: string | null
          CIDADE_PLANO?: string | null
          CNPJ_EMPRESA_ASSOC?: string | null
          COD_TRANSF_DESTINO?: string | null
          COD_TRANSF_ORIGEM?: string | null
          codCampanhaMkt?: string | null
          Contratacao?: string | null
          CPF?: string | null
          DATA_CADASTRO?: string | null
          DATA_FIM_ATIVO?: string | null
          DATA_INICIO_ATIVO?: string | null
          Faixa_etaria?: string | null
          IDADE?: number | null
          idsex?: string | null
          MOTIVO_CANCELAMENTO?: string | null
          NASCIMENTO?: string | null
          NOME_BENEFICIARIO?: string | null
          NOME_EMPRESA_ASSOC?: string | null
          NOME_PLANO?: string | null
          NOME_RESPONSAVEL?: string | null
          NomeCampanhamkt?: string | null
          PLANO?: number | null
          PME?: string | null
          Produto?: string | null
          REATIVACAO?: string | null
          Recuperacao?: string | null
          tem_repasse?: string | null
          TIPO_CONTRATACAO?: string | null
          TIPO_LINHA?: string | null
          Tipo_Plano_Contratacao?: string | null
          UF_CIDADE_OFICIAL?: string | null
          UF_PLANO?: string | null
          valor_maior?: number | null
          VALOR_TMM?: number | null
          VALOR_TMM_NA_DATA?: number | null
          VENDEDOR?: string | null
          VIGENCIA_BENEFICIARIO?: string | null
          VIGENCIA_CONTRATO?: string | null
          vrDescCampanha?: string | null
        }
        Relationships: []
      }
      sv_ecarteira_movimentacao: {
        Row: {
          ACOMODACAO: string | null
          AGENTE: string | null
          atualizacao_a_cada_60min: string | null
          CANCELAMENTO: string | null
          CDREGUSR: number | null
          CIDADE_OFICIAL: string | null
          CIDADE_PLANO: string | null
          CNPJ_EMPRESA_ASSOC: string | null
          COD_TRANSF_DESTINO: string | null
          COD_TRANSF_ORIGEM: string | null
          codCampanhaMkt: string | null
          Contratacao: string | null
          CPF: string | null
          DATA_CADASTRO: string | null
          Data_ocorrencia: string | null
          Faixa_etaria: string | null
          IDADE: number | null
          idsex: string | null
          MOTIVO_CANCELAMENTO: string | null
          NASCIMENTO: string | null
          NOME_BENEFICIARIO: string | null
          NOME_EMPRESA_ASSOC: string | null
          NOME_PLANO: string | null
          NOME_RESPONSAVEL: string | null
          NomeCampanhamkt: string | null
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
          UltimaDataCancelamento: string | null
          valor_maior: number | null
          VALOR_TMM: number | null
          VALOR_TMM_NA_DATA: number | null
          VENDEDOR: string | null
          Vida: number | null
          VIGENCIA_BENEFICIARIO: string | null
          VIGENCIA_CONTRATO: string | null
          vrDescCampanha: string | null
        }
        Insert: {
          ACOMODACAO?: string | null
          AGENTE?: string | null
          atualizacao_a_cada_60min?: string | null
          CANCELAMENTO?: string | null
          CDREGUSR?: number | null
          CIDADE_OFICIAL?: string | null
          CIDADE_PLANO?: string | null
          CNPJ_EMPRESA_ASSOC?: string | null
          COD_TRANSF_DESTINO?: string | null
          COD_TRANSF_ORIGEM?: string | null
          codCampanhaMkt?: string | null
          Contratacao?: string | null
          CPF?: string | null
          DATA_CADASTRO?: string | null
          Data_ocorrencia?: string | null
          Faixa_etaria?: string | null
          IDADE?: number | null
          idsex?: string | null
          MOTIVO_CANCELAMENTO?: string | null
          NASCIMENTO?: string | null
          NOME_BENEFICIARIO?: string | null
          NOME_EMPRESA_ASSOC?: string | null
          NOME_PLANO?: string | null
          NOME_RESPONSAVEL?: string | null
          NomeCampanhamkt?: string | null
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
          UltimaDataCancelamento?: string | null
          valor_maior?: number | null
          VALOR_TMM?: number | null
          VALOR_TMM_NA_DATA?: number | null
          VENDEDOR?: string | null
          Vida?: number | null
          VIGENCIA_BENEFICIARIO?: string | null
          VIGENCIA_CONTRATO?: string | null
          vrDescCampanha?: string | null
        }
        Update: {
          ACOMODACAO?: string | null
          AGENTE?: string | null
          atualizacao_a_cada_60min?: string | null
          CANCELAMENTO?: string | null
          CDREGUSR?: number | null
          CIDADE_OFICIAL?: string | null
          CIDADE_PLANO?: string | null
          CNPJ_EMPRESA_ASSOC?: string | null
          COD_TRANSF_DESTINO?: string | null
          COD_TRANSF_ORIGEM?: string | null
          codCampanhaMkt?: string | null
          Contratacao?: string | null
          CPF?: string | null
          DATA_CADASTRO?: string | null
          Data_ocorrencia?: string | null
          Faixa_etaria?: string | null
          IDADE?: number | null
          idsex?: string | null
          MOTIVO_CANCELAMENTO?: string | null
          NASCIMENTO?: string | null
          NOME_BENEFICIARIO?: string | null
          NOME_EMPRESA_ASSOC?: string | null
          NOME_PLANO?: string | null
          NOME_RESPONSAVEL?: string | null
          NomeCampanhamkt?: string | null
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
          UltimaDataCancelamento?: string | null
          valor_maior?: number | null
          VALOR_TMM?: number | null
          VALOR_TMM_NA_DATA?: number | null
          VENDEDOR?: string | null
          Vida?: number | null
          VIGENCIA_BENEFICIARIO?: string | null
          VIGENCIA_CONTRATO?: string | null
          vrDescCampanha?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_filtros: { Args: never; Returns: Json }
      dashboard_kpis: {
        Args: { p_ano?: number; p_faixa?: string; p_plano?: number }
        Returns: {
          qt_vidas: number
          sinistralidade: number
          vl_custo: number
          vl_receita: number
        }[]
      }
      dashboard_por_categoria: {
        Args: { p_ano?: number; p_faixa?: string; p_plano?: number }
        Returns: {
          categoria: string
          valor: number
        }[]
      }
      dashboard_serie_mensal: {
        Args: { p_ano?: number; p_faixa?: string; p_plano?: number }
        Returns: {
          nr_ano: number
          nr_mes: number
          sinistralidade: number
          vl_custo: number
          vl_receita: number
        }[]
      }
      fn_ativos_por_faixa: {
        Args: { ref: string }
        Returns: {
          ativos: number
          faixa: string
        }[]
      }
    }
    Enums: {
      DATA: "DD-MM-YYYY"
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
      DATA: ["DD-MM-YYYY"],
    },
  },
} as const
