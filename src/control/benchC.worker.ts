import { unzipSync } from "fflate";
import { aggregateQuarter, decodeAns, parseCatalog } from "./benchC";
self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; quarter?: number }>) => {
  try {
    const { buffer, quarter } = event.data;
    if (quarter === undefined) { self.postMessage({ data: parseCatalog(decodeAns(new Uint8Array(buffer))) }); return; }
    const entries = unzipSync(new Uint8Array(buffer), { filter: file => /\.csv$/i.test(file.name) });
    const csv = Object.values(entries);
    if (csv.length !== 1) throw new Error("Não foi possível identificar o CSV trimestral no ZIP da ANS.");
    self.postMessage({ data: aggregateQuarter(decodeAns(csv[0]), quarter) });
  } catch (e) { self.postMessage({ error: e instanceof Error ? e.message : "Falha na leitura do arquivo ANS" }); }
};