import * as React from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-2 pb-4">
      <div
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-4 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          {title ? (
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          ) : (
            <span />
          )}
          <button
            className={cn(
              "rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            )}
            onClick={() => onOpenChange(false)}
          >
            <span className="sr-only">Close</span>×
          </button>
        </div>
        <div className="space-y-3 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}

