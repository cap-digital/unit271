"use client";

import { Clapperboard, LayoutGrid, Music2, Search, Target, Youtube, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/store/DashboardContext";
import { MedxSwitch } from "./MedxSwitch";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hideOnMedx?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão", icon: LayoutGrid },
  { href: "/google", label: "Google", icon: Search, hideOnMedx: true },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/tiktok", label: "TikTok", icon: Music2 },
  { href: "/criativos", label: "Criativos", icon: Clapperboard },
  { href: "/metas", label: "Metas", icon: Target },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Brand() {
  return (
    <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy" aria-label="Unit — Visão geral">
      <span className="text-[17px] font-black tracking-tight text-white">
        Un<span className="text-gold">i</span>t
      </span>
    </Link>
  );
}

/** Sidebar flutuante (desktop) + barra inferior flutuante (mobile), ambas com cantos arredondados. */
export function Sidebar() {
  const pathname = usePathname();
  const { medx } = useDashboard();
  const items = NAV_ITEMS.filter((i) => !(medx && i.hideOnMedx));

  return (
    <>
      {/* Desktop: trilho vertical flutuante */}
      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-[84px] flex-col items-center rounded-[28px] border border-line bg-surface py-4 shadow-float md:flex">
        <Brand />
        <nav className="mt-4 flex w-full flex-1 flex-col items-center gap-1.5 px-2" aria-label="Seções">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10.5px] font-semibold transition-colors ${active ? "text-navy" : "text-muted hover:bg-surface-3 hover:text-ink"}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? "bg-navy text-gold" : "bg-transparent"}`}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-3">
          <MedxSwitch layout="vertical" />
        </div>
      </aside>

      {/* Mobile: barra inferior flutuante */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between gap-1 rounded-[22px] border border-line bg-surface/95 px-2 py-1.5 shadow-float backdrop-blur md:hidden" aria-label="Seções">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold ${active ? "text-navy" : "text-muted"}`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-navy text-gold" : ""}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <div className="border-l border-line pl-1">
          <MedxSwitch layout="vertical" />
        </div>
      </nav>
    </>
  );
}
