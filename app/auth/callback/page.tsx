"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const WAIT_TIMEOUT_MS = 15_000;
const POST_LOGIN_REDIRECT_KEY = "kleinfun_post_login_redirect";

// Per page load: only one code exchange (ref resets on Strict Mode remount; this survives).
let exchangeStarted = false;

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"exchanging" | "done" | "error" | "timeout">("exchanging");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (exchangeStarted) return;
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setErrorMessage("No code in URL");
      router.replace("/login");
      return;
    }

    exchangeStarted = true;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setStatus("timeout");
    }, WAIT_TIMEOUT_MS);

    supabase.auth
      .exchangeCodeForSession(code)
      .then(() => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setStatus("done");
        let path = "/";
        try {
          const stored = typeof window !== "undefined" && window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
          if (stored && stored.startsWith("/")) {
            path = stored;
            window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
          }
        } catch {
          // ignore
        }
        window.location.replace(path);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Exchange failed");
        router.replace("/login");
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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
        <>
          <p className="text-sm text-rose-500">Sign-in failed. Redirecting to login.</p>
          {errorMessage && (
            <p className="text-xs text-slate-400 max-w-xs text-center">{errorMessage}</p>
          )}
        </>
      )}
      {status === "timeout" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-rose-500">Sign-in is taking too long.</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Check your connection or try again from the login page.
          </p>
          <a
            href="/login"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            Back to login
          </a>
        </div>
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
