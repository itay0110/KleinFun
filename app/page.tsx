 "use client";

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
  if (!currentUser) return <AuthForm />;
  return <GroupDashboard />;
}

export default function Page() {
  return <HomeInner />;
}

