import { useSyncExternalStore } from "react";
import { hostinger } from "@/lib/hostingerClient";

export type Row = {
  ideAssist: number;
  bscmp: number | null;
  nrgui: string | number | null;
  nmcli: string | null;
  cdregusr: string | number | null;
  dscrdexe: string | null;
  dscrdsol: string | null;
  dscrdrec: string | null;
  vrevt: number | string | null;
};

const PAGE = 500;
const IDTIPFOL_FILTER = "%conta%m%dica%";

const now = new Date();
const defY = now.getFullYear();
const rawM = now.getMonth() + 1 - 2;
const defYear = rawM <= 0 ? defY - 1 : defY;
const defMonth = ((rawM - 1 + 12) % 12) + 1;

export type ConsultaState = {
  anoInput: string;
  mesInput: string;
  periodo: string;
  filtro: string;
  rows: Row[];
  loading: boolean;
  error: string | null;
  expGrp: Record<string, boolean>;
  expExe: Record<string, boolean>;
  expSol: Record<string, boolean>;
  elapsed: number;
  revealed: boolean;
  triggered: boolean;
  startedAt: number | null;
};

let state: ConsultaState = {
  anoInput: String(defYear),
  mesInput: String(defMonth).padStart(2, "0"),
  periodo: "",
  filtro: "",
  rows: [],
  loading: false,
  error: null,
  expGrp: {},
  expExe: {},
  expSol: {},
  elapsed: 0,
  revealed: false,
  triggered: false,
  startedAt: null,
};

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<ConsultaState>) => {
  state = { ...state, ...patch };
  emit();
};

let abortFlag = { alive: true };
let tickTimer: ReturnType<typeof setInterval> | null = null;

const stopTick = () => {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
};
const startTick = () => {
  stopTick();
  const start = state.startedAt ?? Date.now();
  tickTimer = setInterval(() => {
    set({ elapsed: Math.floor((Date.now() - start) / 1000) });
  }, 1000);
};

export const consultaActions = {
  setAnoInput(v: string) {
    set({ anoInput: v.replace(/\D/g, "").slice(0, 4), triggered: false });
  },
  setMesInput(v: string) {
    set({ mesInput: v.replace(/\D/g, "").slice(0, 2), triggered: false });
  },
  padMes() {
    if (state.mesInput && state.mesInput.length === 1)
      set({ mesInput: state.mesInput.padStart(2, "0") });
  },
  setFiltro(v: string) {
    set({ filtro: v });
  },
  setExpGrp(fn: (p: Record<string, boolean>) => Record<string, boolean>) {
    set({ expGrp: fn(state.expGrp) });
  },
  setExpExe(fn: (p: Record<string, boolean>) => Record<string, boolean>) {
    set({ expExe: fn(state.expExe) });
  },
  setExpSol(fn: (p: Record<string, boolean>) => Record<string, boolean>) {
    set({ expSol: fn(state.expSol) });
  },
  setRevealed(v: boolean) {
    set({ revealed: v });
  },
  computePeriodo(): string {
    const y = state.anoInput.replace(/\D/g, "").slice(0, 4);
    const m = state.mesInput.replace(/\D/g, "").slice(0, 2).padStart(2, "0");
    if (y.length !== 4 || m.length !== 2) return "";
    const mn = Number(m);
    if (mn < 1 || mn > 12) return "";
    return `${y}${m}`;
  },
  async start() {
    const periodo = this.computePeriodo();
    if (!periodo || state.loading) return;
    // abort previous
    abortFlag.alive = false;
    abortFlag = { alive: true };
    const flag = abortFlag;

    set({
      periodo,
      triggered: true,
      revealed: false,
      loading: true,
      error: null,
      rows: [],
      elapsed: 0,
      startedAt: Date.now(),
    });
    startTick();

    const bs = Number(periodo);
    if (!Number.isFinite(bs)) {
      set({ loading: false });
      stopTick();
      return;
    }
    let from = 0;
    const acc: Row[] = [];
    while (true) {
      let attempt = 0;
      let chunk: Row[] | null = null;
      while (attempt < 4) {
        const size = Math.max(100, PAGE >> attempt);
        const { data, error } = await hostinger
          .from("assistencial")
          .select("ideAssist,bscmp,nrgui,nmcli,cdregusr,dscrdexe,dscrdsol,dscrdrec,vrevt")
          .eq("bscmp", bs)
          .ilike("idtipfol", IDTIPFOL_FILTER)
          .order("ideAssist", { ascending: true })
          .range(from, from + size - 1);
        if (!flag.alive) return;
        if (!error) {
          chunk = (data ?? []) as Row[];
          if (chunk.length < size) {
            acc.push(...chunk);
            if (flag.alive) {
              set({ rows: acc, loading: false });
              stopTick();
            }
            return;
          }
          from += size;
          break;
        }
        if (!/timeout/i.test(error.message) || attempt === 3) {
          if (flag.alive) {
            set({ error: error.message, loading: false });
            stopTick();
          }
          return;
        }
        attempt++;
      }
      if (!chunk) break;
      acc.push(...chunk);
      if (from > 500000) break;
    }
    if (flag.alive) {
      set({ rows: acc, loading: false });
      stopTick();
    }
  },
};

export function useConsultaState(): ConsultaState {
  return useSyncExternalStore(
    (fn) => subscribe(fn),
    () => state,
    () => state,
  );
}

export function getConsultaSnapshot() {
  return state;
}
