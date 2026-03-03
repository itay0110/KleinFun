 "use client";

import { AuthForm } from "@/components/auth-form";
import { GroupDashboard } from "@/components/group-dashboard";
import { useKleinFun } from "@/lib/state";

function HomeInner() {
  const { currentUser } = useKleinFun();
  if (!currentUser) return <AuthForm />;
  return <GroupDashboard />;
}

export default function Page() {
  return <HomeInner />;
}

