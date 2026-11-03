import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CFile, COperator, CPeriods } from "./benchC";
import type { BenchPlanRow } from "./benchClassification";
import { gzip, gunzipSync, strFromU8, strToU8 } from "fflate";
type PackedCache = { encoding: "gzip-base64"; packed: string };
async function packCache(files: Record<string, CFile>): Promise<string> {
  const bytes = await new Promise<Uint8Array>((resolve, reject) => gzip(strToU8(JSON.stringify(files)), (error, data) => error ? reject(error) : resolve(data)));
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}
function unpackCache(payload: Record<string, CFile> | PackedCache): Record<string, CFile> {
  if (payload.encoding === "gzip-base64" && typeof payload.packed === "string") {
    const bytes = Uint8Array.from(atob(payload.packed), character => character.charCodeAt(0));
    return JSON.parse(strFromU8(gunzipSync(bytes)));
  }
  return payload as Record<string, CFile>;
}
let persistenceQueue: Promise<unknown> = Promise.resolve();
export async function officialAns<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { data, error, response } = await supabase.functions.invoke("bench-c", { body, signal });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) { try { message = (await error.context.json()).error ?? message; } catch { /* preserve message */ } }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  if (body.action === "catalog" && typeof data === "string") return new Blob([data], { type: "text/csv" }) as T;
  if (body.action === "quarter" && !(data instanceof Blob)) {
    if (!response) throw new Error("Arquivo trimestral indisponível.");
    return await response.blob() as T;
  }
  return data as T;
}
async function parseFile<T>(blob: Blob, quarter?: number, signal?: AbortSignal): Promise<T> {
  const buffer = await blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Interrompido", "AbortError")); return; }
    const worker = new Worker(new URL("./benchC.worker.ts", import.meta.url), { type: "module" });
    const finish = () => { worker.terminate(); signal?.removeEventListener("abort", abort); };
    const abort = () => { finish(); reject(new DOMException("Interrompido", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = event => { finish(); event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.data); };
    worker.onerror = () => { finish(); reject(new Error("Não foi possível ler o arquivo da ANS.")); };
    worker.postMessage({ buffer, quarter }, [buffer]);
  });
}
export const loadCPeriods = (year?: number, signal?: AbortSignal) => officialAns<CPeriods>({ action: "periods", ...(year ? { year } : {}) }, signal);
export const loadCPlan = () => officialAns<{ plano: BenchPlanRow[] }>({ action: "plan" });
export const loadCCatalog = async () => parseFile<COperator[]>(await officialAns<Blob>({ action: "catalog" }));
export const quarterQueryKey = (userId: string | undefined, year: number | undefined, quarter: number) => ["bench-c-quarter", "closing-balances", userId, year, quarter] as const;
export async function loadCQuarter(year: number, quarter: number, options: { signal?: AbortSignal; force?: boolean } = {}): Promise<Record<string, CFile>> {
  const { signal, force } = options;
  let cached: { payload: Record<string, CFile> | null; fresh: boolean } | undefined;
  if (!force) {
    try {
      const response = await officialAns<{ payload: Record<string, CFile> | PackedCache | null; fresh: boolean }>({ action: "cache-read", year, quarter }, signal);
      cached = { fresh: response.fresh, payload: response.payload ? unpackCache(response.payload) : null };
    }
    catch (error) { if (signal?.aborted) throw error; }
    if (cached?.fresh && cached.payload) return cached.payload;
  }
  try {
    const parsed = await parseFile<Record<string, CFile>>(await officialAns<Blob>({ action: "quarter", year, quarter }, signal), quarter, signal);
    try {
      const packed = await packCache(parsed);
      const save = persistenceQueue.catch(() => undefined).then(() => officialAns({ action: "cache-write-packed", year, quarter, packed }, signal));
      persistenceQueue = save;
      await save;
    }
    catch (error) { if (signal?.aborted) throw error; console.warn("Não foi possível conservar o trimestre para a próxima visita."); }
    return parsed;
  } catch (error) {
    if (!force && !signal?.aborted && cached?.payload) return cached.payload;
    throw error;
  }
}