"""Bench Vidas Mensal (todas as operadoras), etapa 1: baixa cada arquivo UF/mes do PDA 024 da ANS
e grava tres cubos parciais (A, M, P) e os totais por operadora, conferidos contra a propria fonte.
Retomavel: arquivos ja processados sao pulados."""
import concurrent.futures, hashlib, json, re, subprocess, zipfile
from pathlib import Path
import pyarrow as pa, pyarrow.csv as pacsv, pyarrow.compute as pc, pyarrow.parquet as pq
import requests

BASE = "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/"
OUT = Path("/tmp/ans-all"); RAW = OUT / "raw"; PAR = OUT / "parcial"
RAW.mkdir(parents=True, exist_ok=True); PAR.mkdir(parents=True, exist_ok=True)
Q = ["QT_BENEFICIARIO_ATIVO", "QT_BENEFICIARIO_ADERIDO", "QT_BENEFICIARIO_CANCELADO"]
TXT = ["ID_CMPT_MOVEL", "CD_OPERADORA", "NM_RAZAO_SOCIAL", "MODALIDADE_OPERADORA", "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO", "TP_SEXO", "DE_FAIXA_ETARIA", "DE_FAIXA_ETARIA_REAJ", "CD_PLANO", "TP_VIGENCIA_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"]
CUBOS = {
    "A": ["CD_OPERADORA", "SG_UF", "TP_SEXO", "DE_FAIXA_ETARIA", "DE_FAIXA_ETARIA_REAJ", "TP_VIGENCIA_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"],
    "M": ["CD_OPERADORA", "CD_MUNICIPIO", "DE_CONTRATACAO_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"],
    "P": ["CD_OPERADORA", "CD_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TP_VIGENCIA_PLANO"],
    "T": ["CD_OPERADORA"],
}

def work(job):
    m, f = job
    meta_path = PAR / f"{m}_{f[12:14]}.json"
    if meta_path.exists(): return json.loads(meta_path.read_text())
    p = RAW / f
    for tentativa in range(4):
        try: subprocess.run(["curl", "-sS", "--fail", "--max-time", "900", "-o", str(p), BASE + m + "/" + f], check=True); break
        except subprocess.CalledProcessError:
            if tentativa == 3: raise
    sha = hashlib.sha256(p.read_bytes()).hexdigest()
    with zipfile.ZipFile(p) as z:
        nomes = [n for n in z.namelist() if n.lower().endswith(".csv")]; assert len(nomes) == 1, (f, z.namelist())
        with z.open(nomes[0]) as fh:
            t = pacsv.read_csv(fh, parse_options=pacsv.ParseOptions(delimiter=";"), convert_options=pacsv.ConvertOptions(
                include_columns=TXT + Q, column_types={**{c: pa.string() for c in TXT}, **{c: pa.int64() for c in Q}}, strings_can_be_null=False))
    comp = pc.unique(t["ID_CMPT_MOVEL"]).to_pylist(); assert comp == [f"{m[:4]}-{m[4:]}"], (f, comp)
    t = t.set_column(t.schema.get_field_index(Q[0]), Q[0], pc.fill_null(t[Q[0]], 0))
    for q in Q[1:]: t = t.set_column(t.schema.get_field_index(q), q, pc.fill_null(t[q], 0))
    fonte = [pc.sum(t[q]).as_py() or 0 for q in Q]
    for nome, chaves in CUBOS.items():
        g = t.group_by(chaves).aggregate([(q, "sum") for q in Q])
        assert [pc.sum(g[f"{q}_sum"]).as_py() or 0 for q in Q] == fonte, (f, nome)
        pq.write_table(g, PAR / f"{m}_{f[12:14]}_{nome}.parquet")
    ops = t.group_by(["CD_OPERADORA", "NM_RAZAO_SOCIAL", "MODALIDADE_OPERADORA"]).aggregate([]).to_pylist()
    muns = t.group_by(["CD_MUNICIPIO", "NM_MUNICIPIO", "SG_UF"]).aggregate([]).to_pylist()
    meta = {"arquivo": f, "competencia": m, "sha256": sha, "linhas_fonte": t.num_rows, "ativos": fonte[0], "aderidos": fonte[1], "cancelados": fonte[2], "operadoras": ops, "municipios": muns}
    meta_path.write_text(json.dumps(meta, ensure_ascii=False)); p.unlink()
    return meta

if __name__ == "__main__":
    meses = sorted(set(re.findall(r'href="(\d{6})/"', requests.get(BASE, timeout=60).text)))
    jobs = [(m, f) for m in meses for f in sorted(set(re.findall(r'href="(pda-024-icb-[A-Z]{2}-\d{4}_\d{2}\.zip)"', requests.get(BASE + m + "/", timeout=60).text)))]
    print("arquivos", len(jobs), flush=True)
    feitos = 0
    with concurrent.futures.ProcessPoolExecutor(max_workers=10) as pool:
        for meta in pool.map(work, jobs):
            feitos += 1
            if feitos % 28 == 0: print(feitos, "/", len(jobs), meta["competencia"], flush=True)
    print("DONE", feitos, flush=True)
