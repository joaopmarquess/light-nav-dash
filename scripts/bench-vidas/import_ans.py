import requests,re,json,hashlib,concurrent.futures
from pathlib import Path
from collections import defaultdict,Counter
from bs4 import BeautifulSoup
import datasus_dbc
from dbfread import DBF
BASE='https://dadosabertos.ans.gov.br/FTP/Base_de_dados/Microdados/dados_dbc/beneficiarios/operadoras/'
OUT=Path('/tmp/ans-dbc/base');OUT.mkdir(exist_ok=True)
soup=BeautifulSoup(requests.get(BASE,timeout=40).text,'html.parser')
files=sorted(a['href'] for a in soup.select('a[href]') if re.fullmatch(r'tb_cc_\d{4}-\d{2}\.dbc',a['href']))
names={}
for line in Path('/tmp/ans-dbc/aux/CNV/cd_operadora.cnv').read_text(encoding='latin1').splitlines():
 m=re.match(r'\s*\d+\s+(.*?)\s+(\d{6})\s*$',line)
 if m:names[m[2]]=re.sub(r'^\d{6}-','',m[1]).strip()
def work(name):
 p=OUT/name
 if not p.exists():
  r=requests.get(BASE+name,timeout=90);r.raise_for_status();p.write_bytes(r.content)
 dbf=p.with_suffix('.dbf');datasus_dbc.decompress(str(p),str(dbf))
 agg=defaultdict(lambda:[0,0]);tot=[0,0,0];count=0;codes=Counter()
 for r in DBF(str(dbf),encoding='latin1'):
  assert r['ID_CMPT']==name[6:13].replace('-',''),(name,r['ID_CMPT'])
  m,o,t=(int(r[x] or 0) for x in ['NR_BENEF_M','NR_BENEF_O','NR_BENEF_T']);assert m+o==t
  key=(r['CD_OPERADO'],r['ID_CMPT'],r['CD_CONTR']);agg[key][0]+=m;agg[key][1]+=o
  tot[0]+=m;tot[1]+=o;tot[2]+=t;count+=1;codes[r['CD_CONTR']]+=1
 rows=[[*k,*v] for k,v in sorted(agg.items())]
 return name,rows,{'arquivo':name,'competencia':name[6:13].replace('-',''),'linhas':count,'medico':tot[0],'odontologico':tot[1],'total':tot[2],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'contratacoes':dict(codes)}
years=defaultdict(list);manifest=[];ops=set()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for name,rows,meta in pool.map(work,files):
  years[name[6:10]].extend(rows);manifest.append(meta);ops.update(r[0] for r in rows);print(name,meta['linhas'],flush=True)
for year,rows in years.items():(OUT/f'{year}.json').write_text(json.dumps(rows,separators=(',',':')),encoding='utf8')
metadata={'origem':BASE,'inicio':manifest[0]['competencia'],'fim':manifest[-1]['competencia'],'arquivos':manifest,'anos':[int(y) for y in sorted(years)],'operadoras':[{'reg':op,'nome':names.get(op,'ANS '+op)} for op in sorted(ops)]}
(OUT/'catalogo.json').write_text(json.dumps(metadata,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('DONE',len(files),len(ops),sum(m['linhas'] for m in manifest),flush=True)
