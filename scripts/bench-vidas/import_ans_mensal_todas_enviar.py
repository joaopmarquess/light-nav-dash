"""Bench Vidas Mensal (todas as operadoras), etapa 3: agrupa os anos de cada operadora/cubo num
unico arquivo quando pequeno (senao um arquivo por ano), envia como assets e grava indice.json."""
import concurrent.futures, json, os, subprocess
from pathlib import Path

OUT = Path("/tmp/ans-all/out"); ENV = Path("/tmp/ans-all/envio"); ENV.mkdir(parents=True, exist_ok=True)
DEST = Path(__file__).resolve().parents[2] / "src/data/benchVidas/mensal"
FEITOS = Path("/tmp/ans-all/enviados.json"); LIMITE = 1_500_000
feitos = json.loads(FEITOS.read_text()) if FEITOS.exists() else {}
# Opcional: BENCH_REGS=arquivo.json com a lista de registros ANS a enviar agora; as demais ficam para depois.
SO = set(json.loads(Path(os.environ["BENCH_REGS"]).read_text())) if os.environ.get("BENCH_REGS") else None

tarefas = []; indice = {}
for pasta in sorted(p for p in OUT.iterdir() if p.is_dir()):
    reg = pasta.name
    pendente = SO is not None and reg not in SO
    for cubo in "AMP":
        anos = sorted(pasta.glob(f"{cubo}-*.json"))
        if not anos: continue
        if sum(a.stat().st_size for a in anos) <= LIMITE:
            nome = f"bench-vidas-mensal-{reg}-{cubo}.json"; alvo = ENV / nome
            if nome not in feitos and not pendente: alvo.write_text("{" + ",".join(f'"{a.stem.split("-")[1]}":' + a.read_text() for a in anos) + "}")
            if not pendente or nome in feitos: tarefas.append((nome, alvo))
            indice.setdefault(reg, {})[cubo] = nome
        else:
            for a in anos:
                ano = a.stem.split("-")[1]; nome = f"bench-vidas-mensal-{reg}-{ano}-{cubo}.json"
                if not pendente or nome in feitos: tarefas.append((nome, a))
                indice.setdefault(reg, {}).setdefault(cubo, {})[ano] = nome

def enviar(t):
    nome, arquivo = t
    if nome in feitos: return nome, feitos[nome]
    r = subprocess.run(["lovable-assets", "create", "--file", str(arquivo), "--filename", nome, "--content-type", "application/json", "--cache-control", "public, max-age=31536000, immutable"], capture_output=True, text=True)
    if r.returncode: return nome, None
    return nome, json.loads(r.stdout)["asset_id"]

print("arquivos", len(tarefas), flush=True)
n = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
    for nome, aid in pool.map(enviar, tarefas):
        n += 1
        if aid: feitos[nome] = aid
        if n % 250 == 0: FEITOS.write_text(json.dumps(feitos)); print(n, "/", len(tarefas), flush=True)
FEITOS.write_text(json.dumps(feitos))
faltando = [nome for nome, _ in tarefas if nome not in feitos]
assert not faltando, f"{len(faltando)} envios falharam; rode de novo"
# O índice só traz operadoras com todos os arquivos enviados.
completa = lambda cubos: all((v in feitos) if isinstance(v, str) else all(n in feitos for n in v.values()) for v in cubos.values())
final = {reg: {c: (feitos[v] if isinstance(v, str) else {a: feitos[n] for a, n in v.items()}) for c, v in cubos.items()} for reg, cubos in indice.items() if completa(cubos)}
(DEST / "indice.json").write_text(json.dumps(final, separators=(",", ":")))
print("DONE", len(final), "operadoras", len(tarefas), "arquivos", flush=True)
