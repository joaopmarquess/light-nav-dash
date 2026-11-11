"""Etapa 1 do Bench Vidas Mensal: baixa os arquivos consolidados mensais da ANS
(PDA 024, um zip por UF e mes) e guarda somente as linhas das operadoras escolhidas.
Uso: python3 import_ans_mensal_extrair.py [registros ANS separados por virgula]"""
import concurrent.futures, csv, hashlib, io, json, re, subprocess, sys, zipfile
from pathlib import Path
import requests

BASE = "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/"
OPS = (sys.argv[1] if len(sys.argv) > 1 else "366561,327417,350249,335100").split(",")
OUT = Path("/tmp/ans-mensal"); RAW = OUT / "raw"; FIL = OUT / "filtrado"
RAW.mkdir(parents=True, exist_ok=True); FIL.mkdir(parents=True, exist_ok=True)
HEADER = "ID_CMPT_MOVEL;CD_OPERADORA;NM_RAZAO_SOCIAL;NR_CNPJ;MODALIDADE_OPERADORA;SG_UF;CD_MUNICIPIO;NM_MUNICIPIO;TP_SEXO;DE_FAIXA_ETARIA;DE_FAIXA_ETARIA_REAJ;CD_PLANO;TP_VIGENCIA_PLANO;DE_CONTRATACAO_PLANO;DE_SEGMENTACAO_PLANO;DE_ABRG_GEOGRAFICA_PLANO;COBERTURA_ASSIST_PLAN;TIPO_VINCULO;QT_BENEFICIARIO_ATIVO;QT_BENEFICIARIO_ADERIDO;QT_BENEFICIARIO_CANCELADO;DT_CARGA"
padrao = re.compile(r'^[^;]*;"?(' + "|".join(OPS) + r')"?;')

meses = sorted(set(re.findall(r'href="(\d{6})/"', requests.get(BASE, timeout=60).text)))
jobs = []
for m in meses:
    for f in sorted(set(re.findall(r'href="(pda-024-icb-[A-Z]{2}-\d{4}_\d{2}\.zip)"', requests.get(BASE + m + "/", timeout=60).text))):
        jobs.append((m, f))
print("meses", meses[0], meses[-1], len(meses), "arquivos", len(jobs), flush=True)

def work(job):
    m, f = job
    alvo = FIL / f.replace(".zip", ".json")
    if alvo.exists(): return json.loads(alvo.read_text())["meta"]
    p = RAW / f
    for tentativa in range(4):
        try:
            subprocess.run(["curl", "-sS", "--fail", "--max-time", "600", "-o", str(p), BASE + m + "/" + f], check=True)
            break
        except subprocess.CalledProcessError:
            if tentativa == 3: raise
    sha = hashlib.sha256(p.read_bytes()).hexdigest()
    linhas = 0; guardadas = []; total_ativos = 0
    with zipfile.ZipFile(p) as z:
        nome = [n for n in z.namelist() if n.lower().endswith(".csv")]; assert len(nome) == 1, (f, z.namelist())
        with z.open(nome[0]) as fh:
            texto = io.TextIOWrapper(fh, encoding="utf-8", errors="strict", newline="")
            cab = texto.readline().strip().lstrip("\ufeff")
            assert cab == HEADER, (f, cab)
            for line in texto:
                linhas += 1
                if padrao.match(line): guardadas.append(line)
    rows = list(csv.reader(guardadas, delimiter=";"))
    for r in rows:
        assert r[1] in OPS and r[0] == f"{m[:4]}-{m[4:]}", (f, r[:2])
        total_ativos += int(r[18] or 0)
    meta = {"arquivo": f, "competencia": m, "sha256": sha, "linhas_fonte": linhas, "linhas_operadoras": len(rows), "ativos_operadoras": total_ativos}
    alvo.write_text(json.dumps({"meta": meta, "rows": rows}, ensure_ascii=False))
    p.unlink()
    return meta

feitos = 0
with concurrent.futures.ProcessPoolExecutor(max_workers=14) as pool:
    for meta in pool.map(work, jobs):
        feitos += 1
        if feitos % 28 == 0: print(feitos, "/", len(jobs), meta["competencia"], flush=True)
print("DONE", feitos, flush=True)
