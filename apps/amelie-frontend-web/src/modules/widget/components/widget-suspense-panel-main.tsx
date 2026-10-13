import { Suspense } from "react";

import { APP_BASE_URL } from "#/lib/app-base-url";
import { PageHeader } from "#/modules/shared";
import { findActiveTenant, useSuspenseTenants } from "#/modules/tenant";
import { WidgetInstallCard } from "./widget-install-card";
import { WidgetPanelSkeleton } from "./widget-panel-skeleton";

export function WidgetSuspensePanelMain() {
  return (
    <>
      <PageHeader
        title="Widget"
        description="Put the Customer chat on your website. Customers ask without signing in."
      />
      <Suspense fallback={<WidgetPanelSkeleton />}>
        <WidgetPanelView />
      </Suspense>
    </>
  );
}

function WidgetPanelView() {
  const { data } = useSuspenseTenants();
  const tenant = findActiveTenant(data);
  if (!tenant) return null;
  return <WidgetInstallCard slug={tenant.slug} origin={APP_BASE_URL} />;
}
