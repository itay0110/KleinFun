"use client";

import { Suspense } from "react";
import { LoginPage } from "@/components/login-page";

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><p className="text-sm text-slate-500">Loading…</p></div>}>
      <LoginPage />
    </Suspense>
  );
}
