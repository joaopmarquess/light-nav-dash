"""Bench Vidas Mensal (todas as operadoras), etapa 2: junta os cubos parciais por ano, codifica os
campos, confere cada operadora/mes contra os totais da fonte e grava um arquivo por operadora,
cubo e ano em /tmp/ans-all/out/<reg>/. Grava catalogo.json e manifesto.json no projeto."""
import glob, json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path
import pandas as pd, pyarrow.parquet as pq

PAR = Path("/tmp/ans-all/parcial"); OUT = Path("/tmp/ans-all/out"); OUT.mkdir(parents=True, exist_ok=True)
DEST = Path(__file__).resolve().parents[2] / "src/data/benchVidas/mensal"; DEST.mkdir(parents=True, exist_ok=True)
NI = "Não informado"; Q = ["QT_BENEFICIARIO_ATIVO_sum", "QT_BENEFICIARIO_ADERIDO_sum", "QT_BENEFICIARIO_CANCELADO_sum"]
CAMPO = {"SG_UF": "uf", "TP_SEXO": "sexo", "DE_FAIXA_ETARIA": "faixa", "DE_FAIXA_ETARIA_REAJ": "faixaReaj", "TP_VIGENCIA_PLANO": "vigencia", "DE_CONTRATACAO_PLANO": "contratacao", "DE_SEGMENTACAO_PLANO": "segmentacao", "DE_ABRG_GEOGRAFICA_PLANO": "abrangencia", "COBERTURA_ASSIST_PLAN": "cobertura", "TIPO_VINCULO": "vinculo", "CD_PLANO": "plano"}
CUBOS = {"A": ["SG_UF", "TP_SEXO", "DE_FAIXA_ETARIA", "DE_FAIXA_ETARIA_REAJ", "TP_VIGENCIA_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"],
         "M": ["CD_MUNICIPIO", "DE_CONTRATACAO_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"],
         "P": ["CD_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TP_VIGENCIA_PLANO"]}

def plain(v): return unicodedata.normalize("NFKD", v).encode("ascii", "ignore").decode().lower()
def faixa_ordem(v):
    if v.startswith("Menos"): return -1
    m = re.match(r"(\d+)", v); return int(m[1]) if m else 999
def limpa(s): return s.fillna("").astype(str).str.strip().replace("", NI)

metas = [json.loads(Path(f).read_text()) for f in sorted(glob.glob(str(PAR / "*.json")))]
comps = sorted({m["competencia"] for m in metas})
assert len(metas) == 1820 or "--parcial" in sys.argv, len(metas)
# Operadoras: nome e modalidade da competencia mais recente em que aparecem.
operadoras = {}
for m in sorted(metas, key=lambda m: m["competencia"]):
    for o in m["operadoras"]: operadoras[o["CD_OPERADORA"]] = {"reg": o["CD_OPERADORA"], "razaoSocial": o["NM_RAZAO_SOCIAL"].strip(), "modalidade": o["MODALIDADE_OPERADORA"].strip()}
munis = {}
for m in metas:
    for x in m["municipios"]:
        cod = x["CD_MUNICIPIO"].strip() or NI
        munis[cod] = [cod, x["NM_MUNICIPIO"].strip() or NI, x["SG_UF"].strip() if x["CD_MUNICIPIO"].strip() else NI]
muns = sorted(munis.values(), key=lambda x: (x[2] == NI, x[2], plain(x[1]))); midx = {x[0]: i for i, x in enumerate(muns)}

# Dicionarios de valores a partir de todos os parciais.
valores = defaultdict(set)
for cubo, cols in CUBOS.items():
    for f in glob.glob(str(PAR / f"*_{cubo}.parquet")):
        t = pq.read_table(f, columns=[c for c in cols if c in CAMPO])
        for c in t.column_names:
            for v in t[c].unique().to_pylist(): valores[CAMPO[c]].add((v or "").strip() or NI)
ordem = {c: sorted(vs, key=lambda v: (v == NI or v.startswith("Não"), faixa_ordem(v) if c in ("faixa", "faixaReaj") else 0, plain(v))) for c, vs in valores.items()}
idx = {c: {v: i for i, v in enumerate(vs)} for c, vs in ordem.items()}

def ano(y):
    tot = pd.concat([pd.read_parquet(f).assign(comp=int(Path(f).name[:6])) for f in glob.glob(str(PAR / f"{y}??_*_T.parquet"))])
    tot = tot.groupby(["CD_OPERADORA", "comp"])[Q].sum()
    partes = []
    for cubo, cols in CUBOS.items():
        df = pd.concat([pd.read_parquet(f).assign(comp=int(Path(f).name[:6])) for f in glob.glob(str(PAR / f"{y}??_*_{cubo}.parquet"))], ignore_index=True)
        for c in cols:
            v = limpa(df[c])
            df[c] = v.map(midx) if c == "CD_MUNICIPIO" else v.map(idx[CAMPO[c]])
            assert df[c].notna().all(), (y, cubo, c)
        df = df.groupby(["CD_OPERADORA", "comp", *cols], as_index=False)[Q].sum()
        conf = df.groupby(["CD_OPERADORA", "comp"])[Q].sum()
        assert conf.sort_index().equals(tot.loc[conf.index].sort_index()) and len(conf) == len(tot), (y, cubo)
        df = df.sort_values(["CD_OPERADORA", "comp", *cols])
        for reg, g in df.groupby("CD_OPERADORA", sort=False):
            pasta = OUT / reg; pasta.mkdir(exist_ok=True)
            (pasta / f"{cubo}-{y}.json").write_text(json.dumps(g[["comp", *cols, *Q]].astype("int64").values.tolist(), separators=(",", ":")))
            partes.append(f"{reg}-{cubo}-{y}")
        del df
    print("ano", y, "ok", len(partes), flush=True)
    return partes

if __name__ == "__main__":
    import concurrent.futures
    anos = sorted({c[:4] for c in comps})
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as pool: list(pool.map(ano, anos))
    (DEST / "catalogo.json").write_text(json.dumps({
        "origem": "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/",
        "inicio": comps[0], "fim": comps[-1], "competencias": comps,
        "operadoras": sorted(operadoras.values(), key=lambda o: o["reg"]), "valores": ordem, "municipios": muns,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    (DEST / "manifesto.json").write_text(json.dumps({"origem": "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/",
        "arquivos": [{k: m[k] for k in ("arquivo", "competencia", "sha256", "linhas_fonte", "ativos", "aderidos", "cancelados")} for m in sorted(metas, key=lambda m: (m["competencia"], m["arquivo"]))]}, ensure_ascii=False, indent=0), encoding="utf8")
    print("DONE", len(comps), len(operadoras), len(muns), flush=True)
