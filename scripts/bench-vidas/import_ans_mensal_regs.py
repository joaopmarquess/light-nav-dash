"""Bench Vidas Mensal, envio por lista de operadoras (BENCH_REGS=lista.json), em tres etapas:
1) baixa cada arquivo UF/mes do PDA 024 e guarda so as linhas das operadoras da lista, conferindo os
   totais filtrados contra a fonte; 2) monta os cubos por ano com os dicionarios ja publicados em
   catalogo.json (indices estaveis); 3) envia os assets e acrescenta as operadoras completas ao
   indice.json sem tirar as que ja existem. Retomavel. O andamento vai para a tabela
   bench_vidas_envio a cada 30 s (BENCH_CHAVE_ARQ aponta para a chave privada do registro)."""
import concurrent.futures, glob, hashlib, json, os, re, subprocess, sys, threading, time, zipfile
from pathlib import Path
import pandas as pd, pyarrow as pa, pyarrow.csv as pacsv, pyarrow.compute as pc, pyarrow.parquet as pq
import requests

RAIZ = Path(__file__).resolve().parents[2]
DEST = RAIZ / "src/data/benchVidas/mensal"
BASE = "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/"
ID = os.environ.get("BENCH_ENVIO_ID", "mensal-sp-mg"); ROTULO = os.environ.get("BENCH_ENVIO_ROTULO", "Operadoras de SP e MG")
WORK = Path(os.environ.get("BENCH_WORK", "/tmp/ans-mgsp")); RAW = WORK / "raw"; PAR = WORK / "parcial"; OUT = WORK / "out"; ENV = WORK / "envio"
FEITOS = RAIZ / "scripts/bench-vidas/estado" / f"{ID}-enviados.json"; LIMITE = 1_500_000
ALVO = sorted(set(json.loads(Path(os.environ["BENCH_REGS"]).read_text())))
NI = "Não informado"
Q = ["QT_BENEFICIARIO_ATIVO", "QT_BENEFICIARIO_ADERIDO", "QT_BENEFICIARIO_CANCELADO"]; QS = [f"{q}_sum" for q in Q]
TXT = ["ID_CMPT_MOVEL", "CD_OPERADORA", "SG_UF", "CD_MUNICIPIO", "TP_SEXO", "DE_FAIXA_ETARIA", "DE_FAIXA_ETARIA_REAJ", "CD_PLANO", "TP_VIGENCIA_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"]
CUBOS = {"A": ["SG_UF", "TP_SEXO", "DE_FAIXA_ETARIA", "DE_FAIXA_ETARIA_REAJ", "TP_VIGENCIA_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"],
         "M": ["CD_MUNICIPIO", "DE_CONTRATACAO_PLANO", "COBERTURA_ASSIST_PLAN", "TIPO_VINCULO"],
         "P": ["CD_PLANO", "DE_CONTRATACAO_PLANO", "DE_SEGMENTACAO_PLANO", "DE_ABRG_GEOGRAFICA_PLANO", "COBERTURA_ASSIST_PLAN", "TP_VIGENCIA_PLANO"], "T": []}
CAMPO = {"SG_UF": "uf", "TP_SEXO": "sexo", "DE_FAIXA_ETARIA": "faixa", "DE_FAIXA_ETARIA_REAJ": "faixaReaj", "TP_VIGENCIA_PLANO": "vigencia", "DE_CONTRATACAO_PLANO": "contratacao", "DE_SEGMENTACAO_PLANO": "segmentacao", "DE_ABRG_GEOGRAFICA_PLANO": "abrangencia", "COBERTURA_ASSIST_PLAN": "cobertura", "TIPO_VINCULO": "vinculo", "CD_PLANO": "plano"}
for p in (RAW, PAR, OUT, ENV, FEITOS.parent): p.mkdir(parents=True, exist_ok=True)

# ---------- andamento ----------
estado = {"etapa": "Preparando", "ordem": 1, "total": 0, "feitos": 0, "falhas": 0, "situacao": "em_andamento", "mensagem": None}
_env = dict(l.split("=", 1) for l in (RAIZ / ".env").read_text().splitlines() if "=" in l and not l.startswith("#"))
URL = _env["VITE_SUPABASE_URL"].strip('"'); KEY = _env["VITE_SUPABASE_PUBLISHABLE_KEY"].strip('"')
CHAVE = Path(os.environ.get("BENCH_CHAVE_ARQ", str(WORK / "chave"))).read_text().strip()
def reportar():
    try:
        requests.post(f"{URL}/rest/v1/rpc/bench_vidas_envio_registrar", timeout=20, headers={"apikey": KEY, "Content-Type": "application/json"}, json={
            "p_chave": CHAVE, "p_id": ID, "p_rotulo": ROTULO, "p_etapa": estado["etapa"], "p_etapa_ordem": estado["ordem"], "p_etapas": 3,
            "p_total": estado["total"], "p_feitos": estado["feitos"], "p_falhas": estado["falhas"], "p_situacao": estado["situacao"], "p_mensagem": estado["mensagem"]}).raise_for_status()
    except Exception as e: print("aviso: andamento nao registrado:", e, flush=True)
def pulso():
    while estado["situacao"] == "em_andamento": reportar(); time.sleep(30)
def etapa(nome, ordem, total, feitos=0):
    estado.update(etapa=nome, ordem=ordem, total=total, feitos=feitos, falhas=0); reportar(); print("ETAPA", ordem, nome, feitos, "/", total, flush=True)

# ---------- etapa 1: download filtrado ----------
def baixar(job):
    m, f = job
    meta_path = PAR / f"{m}_{f[12:14]}.json"
    if meta_path.exists(): return json.loads(meta_path.read_text())
    p = RAW / f
    for tentativa in range(5):
        try: subprocess.run(["curl", "-sS", "--fail", "--max-time", "900", "-o", str(p), BASE + m + "/" + f], check=True); break
        except subprocess.CalledProcessError:
            if tentativa == 4: raise
            time.sleep(10 * (tentativa + 1))
    sha = hashlib.sha256(p.read_bytes()).hexdigest()
    with zipfile.ZipFile(p) as z:
        nomes = [n for n in z.namelist() if n.lower().endswith(".csv")]; assert len(nomes) == 1, (f, z.namelist())
        with z.open(nomes[0]) as fh:
            t = pacsv.read_csv(fh, parse_options=pacsv.ParseOptions(delimiter=";"), convert_options=pacsv.ConvertOptions(
                include_columns=TXT + Q, column_types={**{c: pa.string() for c in TXT}, **{c: pa.int64() for c in Q}}, strings_can_be_null=False))
    comp = pc.unique(t["ID_CMPT_MOVEL"]).to_pylist(); assert comp == [f"{m[:4]}-{m[4:]}"], (f, comp)
    for q in Q: t = t.set_column(t.schema.get_field_index(q), q, pc.fill_null(t[q], 0))
    linhas = t.num_rows
    t = t.filter(pc.is_in(t["CD_OPERADORA"], value_set=pa.array(ALVO)))
    fonte = [pc.sum(t[q]).as_py() or 0 for q in Q]
    for nome, cols in CUBOS.items():
        g = t.group_by(["CD_OPERADORA", *cols]).aggregate([(q, "sum") for q in Q])
        assert [pc.sum(g[c]).as_py() or 0 for c in QS] == fonte, (f, nome)
        pq.write_table(g, PAR / f"{m}_{f[12:14]}_{nome}.parquet")
    meta = {"arquivo": f, "competencia": m, "sha256": sha, "linhas_fonte": linhas, "linhas_alvo": t.num_rows, "ativos": fonte[0], "aderidos": fonte[1], "cancelados": fonte[2]}
    meta_path.write_text(json.dumps(meta)); p.unlink()
    return meta

# ---------- etapa 2: montagem com dicionarios publicados ----------
catalogo = json.loads((DEST / "catalogo.json").read_text())
IDX = {c: {v: i for i, v in enumerate(vs)} for c, vs in catalogo["valores"].items()}
MIDX = {x[0]: i for i, x in enumerate(catalogo["municipios"])}
def limpa(s): return s.fillna("").astype(str).str.strip().replace("", NI)
def montar(y):
    tot = pd.concat([pd.read_parquet(f).assign(comp=int(Path(f).name[:6])) for f in sorted(glob.glob(str(PAR / f"{y}??_*_T.parquet")))])
    tot = tot.groupby(["CD_OPERADORA", "comp"])[QS].sum()
    for cubo in "AMP":
        cols = CUBOS[cubo]
        df = pd.concat([pd.read_parquet(f).assign(comp=int(Path(f).name[:6])) for f in sorted(glob.glob(str(PAR / f"{y}??_*_{cubo}.parquet")))], ignore_index=True)
        for c in cols:
            v = limpa(df[c]); df[c] = v.map(MIDX) if c == "CD_MUNICIPIO" else v.map(IDX[CAMPO[c]])
            assert df[c].notna().all(), (y, cubo, c, "valor fora do catalogo")
        df = df.groupby(["CD_OPERADORA", "comp", *cols], as_index=False)[QS].sum()
        conf = df.groupby(["CD_OPERADORA", "comp"])[QS].sum()
        assert len(conf) == len(tot) and conf.sort_index().equals(tot.loc[conf.index].sort_index()), (y, cubo)
        for reg, g in df.sort_values(["CD_OPERADORA", "comp", *cols]).groupby("CD_OPERADORA", sort=False):
            pasta = OUT / reg; pasta.mkdir(exist_ok=True)
            (pasta / f"{cubo}-{y}.json").write_text(json.dumps(g[["comp", *cols, *QS]].astype("int64").values.tolist(), separators=(",", ":")))
    (OUT / f".ano-{y}").write_text("ok")
    return y

# ---------- etapa 3: envio ----------
def enviar(t):
    nome, arquivo = t
    for tentativa in range(3):
        r = subprocess.run(["lovable-assets", "create", "--file", str(arquivo), "--filename", nome, "--content-type", "application/json", "--cache-control", "public, max-age=31536000, immutable"], capture_output=True, text=True)
        if not r.returncode: return nome, json.loads(r.stdout)["asset_id"]
        time.sleep(5)
    return nome, None

def gravar_indice(indice, feitos):
    completa = lambda cubos: all((v in feitos) if isinstance(v, str) else all(n in feitos for n in v.values()) for v in cubos.values())
    atual = json.loads((DEST / "indice.json").read_text())
    novos = {reg: {c: (feitos[v] if isinstance(v, str) else {a: feitos[n] for a, n in v.items()}) for c, v in cubos.items()} for reg, cubos in indice.items() if completa(cubos) and reg not in atual}
    if novos:
        atual.update(novos); (DEST / "indice.json").write_text(json.dumps(dict(sorted(atual.items())), separators=(",", ":")))
    return len(novos)

def main():
    threading.Thread(target=pulso, daemon=True).start()
    comps = catalogo["competencias"]
    etapa("Lendo a lista de arquivos da ANS", 1, len(comps) * 28)
    jobs = []
    for m in comps:
        html = requests.get(BASE + m + "/", timeout=60).text
        jobs += [(m, f) for f in sorted(set(re.findall(r'href="(pda-024-icb-[A-Z]{2}-\d{4}_\d{2}\.zip)"', html)))]
    prontos = sum((PAR / f"{m}_{f[12:14]}.json").exists() for m, f in jobs)
    etapa("Download da ANS", 1, len(jobs), prontos)
    with concurrent.futures.ProcessPoolExecutor(max_workers=10) as pool:
        for fut in concurrent.futures.as_completed([pool.submit(baixar, j) for j in jobs if not (PAR / f"{j[0]}_{j[1][12:14]}.json").exists()]):
            fut.result(); estado["feitos"] += 1
            if estado["feitos"] % 20 == 0: print(estado["feitos"], "/", len(jobs), flush=True)
    anos = sorted({c[:4] for c in comps})
    etapa("Montagem por ano", 2, len(anos), sum((OUT / f".ano-{y}").exists() for y in anos))
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as pool:
        for fut in concurrent.futures.as_completed([pool.submit(montar, y) for y in anos if not (OUT / f".ano-{y}").exists()]):
            fut.result(); estado["feitos"] += 1
    feitos = json.loads(FEITOS.read_text()) if FEITOS.exists() else {}
    tarefas = []; indice = {}
    for reg in ALVO:
        pasta = OUT / reg
        if not pasta.is_dir(): continue
        for cubo in "AMP":
            arqs = sorted(pasta.glob(f"{cubo}-*.json"))
            if not arqs: continue
            if sum(a.stat().st_size for a in arqs) <= LIMITE:
                nome = f"bench-vidas-mensal-{reg}-{cubo}.json"; alvo = ENV / nome
                if nome not in feitos: alvo.write_text("{" + ",".join(f'"{a.stem.split("-")[1]}":' + a.read_text() for a in arqs) + "}")
                tarefas.append((nome, alvo)); indice.setdefault(reg, {})[cubo] = nome
            else:
                for a in arqs:
                    ano = a.stem.split("-")[1]; nome = f"bench-vidas-mensal-{reg}-{ano}-{cubo}.json"
                    tarefas.append((nome, a)); indice.setdefault(reg, {}).setdefault(cubo, {})[ano] = nome
    etapa("Envio dos arquivos", 3, len(tarefas), sum(n in feitos for n, _ in tarefas))
    falhas = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for i, (nome, aid) in enumerate(pool.map(enviar, [t for t in tarefas if t[0] not in feitos]), 1):
            if aid: feitos[nome] = aid; estado["feitos"] += 1
            else: falhas += 1; estado["falhas"] = falhas
            if i % 50 == 0: FEITOS.write_text(json.dumps(feitos)); print(estado["feitos"], "/", len(tarefas), flush=True)
            if i % 300 == 0: gravar_indice(indice, feitos)
    FEITOS.write_text(json.dumps(feitos))
    novos = gravar_indice(indice, feitos)
    estado["mensagem"] = f"{len(indice)} operadoras com dados; {novos} liberadas nesta rodada"
    estado["situacao"] = "erro" if falhas else "concluido"
    if falhas: estado["mensagem"] = f"{falhas} arquivos nao foram enviados; rode de novo"
    reportar(); print("DONE", estado, flush=True)

if __name__ == "__main__":
    try: main()
    except Exception as e:
        estado["situacao"] = "erro"; estado["mensagem"] = str(e)[:300]; reportar(); raise
