import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}

export function Card({ title, subtitle, actions, children, className = "", bodyClassName = "", id }: CardProps) {
  return (
    <section id={id} className={`fade-in flex h-full min-w-0 flex-col rounded-card border border-line bg-surface shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-col gap-2 px-3.5 pt-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-4 sm:pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold leading-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[11px] leading-snug text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
        </header>
      )}
      <div className={`flex min-h-0 flex-1 flex-col px-3.5 pb-3.5 pt-2.5 sm:px-4 sm:pb-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
