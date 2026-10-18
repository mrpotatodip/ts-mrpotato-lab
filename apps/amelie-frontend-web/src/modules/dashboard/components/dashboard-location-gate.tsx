import { Suspense, type ReactNode } from "react";

import { useSuspenseDashboardScope } from "../hooks/use-dashboard-scope";
import { DashboardLocationNotCovered } from "./dashboard-location-not-covered";

// -----
// Shows the "does not cover" message in place of a
// screen when the Location the dashboard was pointed
// at is one the member's Role does not cover. The
// server refuses it too; this only explains.
// -----
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
