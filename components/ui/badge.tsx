import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "available" | "busy" | "neutral" | "ground";
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const toneClass =
    tone === "available"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "busy"
      ? "bg-rose-50 text-rose-700"
      : tone === "ground"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={cn(base, toneClass, className)} {...props} />
  );
}

