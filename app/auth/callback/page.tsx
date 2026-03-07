"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"exchanging" | "done" | "error">("exchanging");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      router.replace("/login");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(() => {
        setStatus("done");
        router.replace("/");
      })
      .catch(() => {
        setStatus("error");
        router.replace("/login");
      });
  }, [searchParams, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      {status === "exchanging" && (
        <p className="text-sm text-slate-500">Signing you in…</p>
      )}
      {status === "done" && (
        <p className="text-sm text-slate-500">Redirecting to dashboard…</p>
      )}
      {status === "error" && (
        <p className="text-sm text-rose-500">Sign-in failed. Redirecting to login.</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="text-sm text-slate-500">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
