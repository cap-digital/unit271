"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AUTO_REFRESH_MS, DATA_BODY, DATA_ENDPOINT, DATA_KEY, FETCH_TIMEOUT_MS, STORAGE_KEYS } from "@/lib/config";
import { DEFAULT_RANGE, previousRange, resolveRange, todayISO, type DateRange, type ResolvedRange } from "@/lib/dates";
import { GOALS, type CampaignGoals } from "@/lib/goals";
import { normalizePayload } from "@/lib/normalize";
import type { Dataset, Platform, RawPayload, Row } from "@/lib/types";

export type LoadStatus = "loading" | "refreshing" | "ready" | "error";

export interface DashboardContextValue {
  status: LoadStatus;
  error: string | null;
  dataset: Dataset | null;
  /** Todas as linhas (27.1 + MEDX). */
  rows: Row[];
  /** Linhas do modo ativo (MEDX ou 27.1). */
  scopedRows: Row[];
  /** Linhas do modo ativo dentro do intervalo de datas. */
  filteredRows: Row[];
  /** Linhas do período anterior de mesma duração (para deltas). */
  previousRows: Row[];
  dataMin: string | null;
  dataMax: string | null;
  today: string;

  medx: boolean;
  setMedx: (v: boolean) => void;
  /** True durante a transição do switch MEDX. */
  switching: boolean;

  range: DateRange;
  setRange: (r: DateRange) => void;
  resolved: ResolvedRange;
  previous: ResolvedRange;

  refresh: () => Promise<void>;

  /** Metas e período contratados do modo ativo (MEDX ou campanha 27.1). */
  activeGoals: CampaignGoals;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface CachedData {
  payload: RawPayload;
  fetchedAt: string;
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível (modo privado, cota) — segue sem cache */
  }
}

async function fetchPayload(signal: AbortSignal): Promise<RawPayload> {
  const res = await fetch(DATA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DATA_KEY}`,
      apikey: DATA_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DATA_BODY),
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`A base de dados respondeu com status ${res.status}.`);
  const json = (await res.json()) as RawPayload;
  if (json && json.success === false) throw new Error("A base de dados retornou success=false.");
  return json;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [medx, setMedxState] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [range, setRangeState] = useState<DateRange>(DEFAULT_RANGE);
  const [today, setToday] = useState(() => todayISO());
  const inFlight = useRef<AbortController | null>(null);
  const datasetRef = useRef<Dataset | null>(null);
  const lastFetch = useRef<number>(0);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (inFlight.current) inFlight.current.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    setStatus((s) => (mode === "initial" && s !== "ready" ? "loading" : "refreshing"));
    setError(null);
    try {
      const payload = await fetchPayload(ctrl.signal);
      const fetchedAt = new Date().toISOString();
      const next = normalizePayload(payload, fetchedAt);
      datasetRef.current = next;
      setDataset(next);
      writeStorage(STORAGE_KEYS.data, { payload, fetchedAt } satisfies CachedData);
      lastFetch.current = Date.now();
      setStatus("ready");
    } catch (e) {
      if (ctrl.signal.aborted && inFlight.current !== ctrl) return; // substituída por outra chamada
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "A base de dados demorou demais para responder."
          : e instanceof Error
            ? e.message
            : "Falha ao carregar os dados.";
      setError(msg);
      // sem dados em memória a tela precisa mostrar o erro; com dados, mantém o último render
      setStatus(() => (datasetRef.current ? "ready" : "error"));
    } finally {
      clearTimeout(timeout);
      if (inFlight.current === ctrl) inFlight.current = null;
    }
  }, []);

  // Hidratação a partir do armazenamento local + primeira carga
  useEffect(() => {
    const savedMedx = readStorage<boolean>(STORAGE_KEYS.medx);
    if (typeof savedMedx === "boolean") setMedxState(savedMedx);
    const savedRange = readStorage<DateRange>(STORAGE_KEYS.range);
    if (savedRange && typeof savedRange.preset === "string") setRangeState(savedRange);
    const cached = readStorage<CachedData>(STORAGE_KEYS.data);
    if (cached?.payload) {
      const hydrated = normalizePayload(cached.payload, cached.fetchedAt);
      datasetRef.current = hydrated;
      setDataset(hydrated);
      setStatus("refreshing");
    }
    setToday(todayISO());
    void load(cached?.payload ? "refresh" : "initial");
    return () => inFlight.current?.abort();
  }, [load]);

  // Atualização periódica e ao voltar para a aba
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (inFlight.current) return; // uma carga já está em andamento
      if (Date.now() - lastFetch.current > AUTO_REFRESH_MS / 2) void load("refresh");
      setToday(todayISO());
    };
    const id = setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const setMedx = useCallback((v: boolean) => {
    setMedxState(v);
    writeStorage(STORAGE_KEYS.medx, v);
    setSwitching(true);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitching(false), 850);
  }, []);

  const setRange = useCallback((r: DateRange) => {
    setRangeState(r);
    writeStorage(STORAGE_KEYS.range, r);
  }, []);

  const refresh = useCallback(() => load("refresh"), [load]);

  const rows = useMemo(() => dataset?.rows ?? [], [dataset]);
  const scopedRows = useMemo(() => rows.filter((r) => r.isMedx === medx), [rows, medx]);

  const { dataMin, dataMax } = useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;
    for (const r of scopedRows) {
      if (!min || r.date < min) min = r.date;
      if (!max || r.date > max) max = r.date;
    }
    return { dataMin: min, dataMax: max };
  }, [scopedRows]);

  const resolved = useMemo(() => resolveRange(range, dataMin, dataMax, today), [range, dataMin, dataMax, today]);
  const previous = useMemo(() => previousRange(resolved), [resolved]);

  const filteredRows = useMemo(() => scopedRows.filter((r) => r.date >= resolved.start && r.date <= resolved.end), [scopedRows, resolved]);
  const previousRows = useMemo(() => scopedRows.filter((r) => r.date >= previous.start && r.date <= previous.end), [scopedRows, previous]);

  const activeGoals = medx ? GOALS.medx : GOALS.normal;

  const value: DashboardContextValue = {
    status,
    error,
    dataset,
    rows,
    scopedRows,
    filteredRows,
    previousRows,
    dataMin,
    dataMax,
    today,
    medx,
    setMedx,
    switching,
    range,
    setRange,
    resolved,
    previous,
    refresh,
    activeGoals,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard deve ser usado dentro de <DashboardProvider>.");
  return ctx;
}
