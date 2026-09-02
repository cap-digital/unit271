"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Largura máxima do painel. */
  size?: "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  // Portal para o body: fora do wrapper que reduz a opacidade durante a atualização
  // dos dados e acima da sidebar/cabeçalho fixos.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`fade-in max-h-[92vh] w-full overflow-y-auto rounded-t-card bg-surface shadow-float sm:rounded-card ${size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="min-w-0 text-[15px] font-semibold text-ink">{title}</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-muted hover:bg-surface-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-5 pt-3 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
