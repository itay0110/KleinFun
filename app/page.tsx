 "use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { GroupDashboard } from "@/components/group-dashboard";
import { useKleinFun } from "@/lib/state";

function HomeInner() {
  const { authReady, currentUser } = useKleinFun();
  if (!authReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!currentUser) {
    return (
      <Suspense fallback={<div className="flex flex-1 items-center justify-center"><p className="text-sm text-slate-500">Loading…</p></div>}>
        <AuthForm />
      </Suspense>
    );
  }
  return <GroupDashboard />;
}

export default function Page() {
  return <HomeInner />;
}

