"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

const POST_LOGIN_REDIRECT_KEY = "kleinfun_post_login_redirect";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        const groupId = searchParams.get("group");
        const returnPath = groupId ? `/?group=${encodeURIComponent(groupId)}` : "/";
        try {
          window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, returnPath);
        } catch {
          // ignore
        }
      }
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });
      if (authError) {
        setError(authError.message || "Google sign-in failed. Please try again.");
      }
      // If no error, the browser will redirect to Google and then to /auth/callback
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center">
      <Card className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">KleinFun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to plan activities with your groups.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-200 px-4 text-sm font-medium text-slate-900 shadow-soft transition-colors hover:bg-slate-300 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]"
        >
          <GoogleIcon className="mr-2.5 h-5 w-5 shrink-0" />
          {loading ? "Redirecting to Google…" : "Sign in with Google"}
        </button>
        {error && (
          <p className="text-[11px] text-rose-500">{error}</p>
        )}
        <p className="text-[11px] leading-snug text-slate-400">
          You will be redirected to Google to sign in, then back to the app.
        </p>
      </Card>
    </div>
  );
}
