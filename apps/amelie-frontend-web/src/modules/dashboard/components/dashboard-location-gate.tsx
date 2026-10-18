import { Suspense, type ReactNode } from "react";

import { useSuspenseDashboardScope } from "../hooks/use-dashboard-scope";
import { DashboardLocationNotCovered } from "./dashboard-location-not-covered";

export function DashboardLocationGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <DashboardLocationGateView>{children}</DashboardLocationGateView>
    </Suspense>
  );
}

function DashboardLocationGateView({ children }: { children: ReactNode }) {
  const scope = useSuspenseDashboardScope();
  if (!scope.notCovered) return children;
  return (
    <DashboardLocationNotCovered
      location={scope.notCovered}
      fallback={scope.location}
      onUseFallback={scope.selectLocation}
    />
  );
}
