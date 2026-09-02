"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useDashboard } from "@/store/DashboardContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const TITLES: Record<string, string> = {
  "/": "Visão geral",
  "/google": "Google",
  "/youtube": "YouTube",
  "/tiktok": "TikTok",
  "/criativos": "Criativos",
  "/metas": "Progresso de metas",
};

function LoadingCard() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="fade-in flex flex-col items-center rounded-card border border-line bg-surface px-6 py-10 text-center shadow-card" role="status" aria-live="polite">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy">
        <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-ink">Carregando dados das campanhas…</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
        Buscando Google, YouTube e TikTok na base de dados. A primeira carga pode levar até um minuto{seconds >= 8 ? ` (${seconds} s)` : ""}.
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, error, dataset, refresh, switching, medx } = useDashboard();
  const pathname = usePathname();
  const hasData = !!dataset;
  const title = TITLES[pathname] ?? Object.entries(TITLES).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ?? "Dashboard";

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="w-full pb-28 pt-3 md:pb-6 md:pl-[104px]">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6">
          <Header title={title} showRange={pathname !== "/metas"} />
        </div>
        <div className="mx-auto mt-3 w-full max-w-[1600px] space-y-3 px-3 sm:px-4 lg:px-6">
          {!hasData && status === "loading" && (
            <>
              <LoadingCard />
              <PageSkeleton />
            </>
          )}
          {!hasData && status === "error" && (
            <div className="fade-in flex flex-col items-center rounded-card border border-line bg-surface px-6 py-10 text-center shadow-card" role="alert">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdeaea] text-crit">
                <AlertTriangle className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-ink">Não foi possível carregar os dados</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{error}</p>
              <button type="button" onClick={() => void refresh()} className="mt-4 h-9 rounded-full bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-2">
                Tentar novamente
              </button>
            </div>
          )}
          {hasData && (
            <div className={`space-y-3 transition-opacity duration-300 ${status === "refreshing" ? "opacity-80" : "opacity-100"}`}>
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-[#f5d0d0] bg-[#fdeaea] px-3 py-2 text-[12px] text-crit" role="status">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">Não foi possível atualizar agora ({error}). Exibindo os últimos dados disponíveis.</span>
                  <button type="button" onClick={() => void refresh()} className="font-semibold underline-offset-2 hover:underline">
                    Tentar de novo
                  </button>
                </div>
              )}
              {children}
            </div>
          )}
        </div>
      </main>

      {switching && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/35 backdrop-blur-[2px]" role="status" aria-live="assertive">
          <div className="fade-in flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-float">
            <Loader2 className="h-5 w-5 animate-spin text-navy" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">{medx ? "Carregando dados MEDX…" : "Carregando dados da campanha comum…"}</p>
              <p className="text-[11px] text-muted">{medx ? "Exibindo somente campanhas MEDX." : "Exibindo somente a campanha comum."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
