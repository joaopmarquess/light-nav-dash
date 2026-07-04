
CREATE TABLE public.gd_ecarteira (
  id BIGSERIAL PRIMARY KEY,
  "CDREGUSR" text,
  "STATUS" text,
  "PLANO" bigint,
  "NOME_PLANO" text,
  "CONTRATO" bigint,
  "DEP" bigint,
  "NOME_RESPONSAVEL" text,
  "NOME_BENEFICIARIO" text,
  "CPF" bigint,
  "VALOR_TIMM" double precision,
  "NASCIMENTO" date,
  "VIGENCIA_CONTRATO" date,
  "VIGENCIA_BENEFICIARIO" date,
  "VENDEDOR" text,
  "CANCELAMENTO" date,
  "MOTIVO_CANCELAMENTO" text,
  "REATIVACAO" date,
  "TIPO_LINHA" text,
  "ACOMODACAO" text,
  "IDADE" bigint,
  "Faixa_etaria" text,
  "PME" text,
  "CNPJ_EMPRESA_ASSOC" text,
  "NOME_EMPRESA_ASSOC" text,
  "VALOR_TMM_NA_DATA" double precision,
  "TIPO_CONTRATACAO" text,
  "DATA_CADASTRO" date,
  "CIDADE_PLANO" text,
  "UF_PLANO" text,
  "CIDADE_CONTRATO" text,
  "CIDADE_OFICIAL" text,
  "UF_CIDADE_OFICIAL" text,
  "COD_BENEF_ANS" bigint,
  "idsex" text,
  "Produto" text,
  "Contratacao" text,
  "Tipo_Plano_Contratacao" text,
  "Recuperacao" text,
  "Plano_de" text,
  "Ocorrencia" text,
  "Data_ocorrencia" date,
  "atualizacao_a_cada_60min" timestamptz,
  "DIA_OCORRENCIA" bigint,
  "MES_OCORRENCIA" bigint,
  "ANO_OCORRENCIA" bigint,
  "BASE_OCORRENCIA" text,
  "valor_maior" text,
  "tem_repasse" text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gd_ecarteira_nome_beneficiario_idx ON public.gd_ecarteira ("NOME_BENEFICIARIO");
CREATE INDEX gd_ecarteira_cpf_idx ON public.gd_ecarteira ("CPF");
CREATE INDEX gd_ecarteira_cdregusr_idx ON public.gd_ecarteira ("CDREGUSR");
CREATE INDEX gd_ecarteira_status_idx ON public.gd_ecarteira ("STATUS");
CREATE INDEX gd_ecarteira_plano_idx ON public.gd_ecarteira ("NOME_PLANO");
CREATE INDEX gd_ecarteira_cidade_idx ON public.gd_ecarteira ("CIDADE_PLANO");

GRANT SELECT ON public.gd_ecarteira TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_ecarteira TO authenticated;
GRANT ALL ON public.gd_ecarteira TO service_role;

ALTER TABLE public.gd_ecarteira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.gd_ecarteira FOR SELECT USING (true);
