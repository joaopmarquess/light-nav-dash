"""Etapa 2 do Bench Vidas Mensal: junta as linhas filtradas da etapa 1 em tres cubos por
operadora e ano, confere os totais com a fonte e grava catalogo + arquivos para upload.
Cubos: A (UF e demais campos, sem municipio/plano), M (municipio x contratacao x cobertura x
vinculo) e P (plano x atributos do plano). Nenhum valor e inferido."""
import collections, glob, json, re, unicodedata
from pathlib import Path

FIL = Path("/tmp/ans-mensal/filtrado"); OUT = Path("/tmp/ans-mensal/out"); OUT.mkdir(parents=True, exist_ok=True)
CAT = Path(__file__).resolve().parents[2] / "src/data/benchVidas/mensal/catalogo.json"; CAT.parent.mkdir(parents=True, exist_ok=True)
NI = "Não informado"

def faixa_ordem(v):
    if v.startswith("Menos"): return -1
    m = re.match(r"(\d+)", v); return int(m[1]) if m else 999
def plain(v): return unicodedata.normalize("NFKD", v).encode("ascii", "ignore").decode().lower()

campos = ["uf", "sexo", "faixa", "faixaReaj", "vigencia", "contratacao", "segmentacao", "abrangencia", "cobertura", "vinculo", "plano"]
col = {"uf": 5, "sexo": 8, "faixa": 9, "faixaReaj": 10, "plano": 11, "vigencia": 12, "contratacao": 13, "segmentacao": 14, "abrangencia": 15, "cobertura": 16, "vinculo": 17}
valores = {c: set() for c in campos}; municipios = {}; operadoras = {}; arquivos = []
A = collections.defaultdict(lambda: [0, 0, 0]); M = collections.defaultdict(lambda: [0, 0, 0]); P = collections.defaultdict(lambda: [0, 0, 0])
fonte = collections.Counter()
for f in sorted(glob.glob(str(FIL / "*.json"))):
    d = json.load(open(f)); arquivos.append(d["meta"])
    for r in d["rows"]:
        r = [x.strip() for x in r]
        for c in campos: r[col[c]] = r[col[c]] or NI
        comp = int(r[0].replace("-", "")); op = r[1]
        operadoras.setdefault(op, {"reg": op, "razaoSocial": r[2], "cnpj": r[3], "modalidade": r[4]})
        mun = r[6] or "000000"; municipios.setdefault(mun, [mun, r[7] or NI, r[5] if r[6] else NI])
        for c in campos: valores[c].add(r[col[c]])
        q = [int(r[18] or 0), int(r[19] or 0), int(r[20] or 0)]
        fonte[(op, comp, 0)] += q[0]; fonte[(op, comp, 1)] += q[1]; fonte[(op, comp, 2)] += q[2]
        ka = (op, comp, r[5], r[8], r[9], r[10], r[12], r[13], r[14], r[15], r[16], r[17])
        km = (op, comp, mun, r[13], r[16], r[17])
        kp = (op, comp, r[11], r[13], r[14], r[15], r[16], r[12])
        for k, cubo in ((ka, A), (km, M), (kp, P)):
            for i in range(3): cubo[k][i] += q[i]

ordem = {c: sorted(valores[c], key=lambda v: (v == NI or v.startswith("Não"), faixa_ordem(v) if c in ("faixa", "faixaReaj") else 0, plain(v))) for c in campos}
idx = {c: {v: i for i, v in enumerate(ordem[c])} for c in campos}
muns = sorted(municipios.values(), key=lambda m: (m[2] == NI, m[2], plain(m[1]))); midx = {m[0]: i for i, m in enumerate(muns)}

def enc(cubo, nome, conv):
    por = collections.defaultdict(list)
    for k, v in cubo.items(): por[(k[0], k[1] // 100)].append([k[1], *conv(k), *v])
    for (op, ano), rows in por.items():
        rows.sort()
        for i in range(3):
            for comp in {r[0] for r in rows}:
                assert sum(r[-3 + i] for r in rows if r[0] == comp) == fonte[(op, comp, i)], (nome, op, comp, i)
        (OUT / f"bench-vidas-mensal-{op}-{ano}-{nome}.json").write_text(json.dumps(rows, separators=(",", ":")))
    return sorted({f"{op}-{ano}" for op, ano in por})

ix = lambda c, v: idx[c][v]
enc(A, "A", lambda k: [ix("uf", k[2]), ix("sexo", k[3]), ix("faixa", k[4]), ix("faixaReaj", k[5]), ix("vigencia", k[6]), ix("contratacao", k[7]), ix("segmentacao", k[8]), ix("abrangencia", k[9]), ix("cobertura", k[10]), ix("vinculo", k[11])])
enc(M, "M", lambda k: [midx[k[2]], ix("contratacao", k[3]), ix("cobertura", k[4]), ix("vinculo", k[5])])
partes = enc(P, "P", lambda k: [ix("plano", k[2]), ix("contratacao", k[3]), ix("segmentacao", k[4]), ix("abrangencia", k[5]), ix("cobertura", k[6]), ix("vigencia", k[7])])
comps = sorted({a["competencia"] for a in arquivos})
totais = {}
for (op, comp, i), v in sorted(fonte.items()): totais.setdefault(op, {}).setdefault(str(comp), [0, 0, 0])[i] = v
catalogo = {
    "origem": "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/",
    "inicio": comps[0], "fim": comps[-1], "competencias": comps,
    "operadoras": sorted(operadoras.values(), key=lambda o: o["reg"]),
    "valores": {c: ordem[c] for c in campos}, "municipios": muns, "partes": partes, "totais": totais,
}
(CAT.parent / "manifesto.json").write_text(json.dumps({"origem": catalogo["origem"], "arquivos": sorted(arquivos, key=lambda a: (a["competencia"], a["arquivo"]))}, ensure_ascii=False, indent=0), encoding="utf8")
CAT.write_text(json.dumps(catalogo, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
print("OK", len(comps), "competencias", len(partes), "partes", len(muns), "municipios", {k: len(v) for k, v in ordem.items()})
