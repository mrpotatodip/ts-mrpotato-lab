import { Suspense } from "react";

import { APP_BASE_URL } from "#/lib/app-base-url";
import { PageHeader } from "#/modules/shared";
import { findActiveTenant, useActiveTenantRole, useSuspenseTenants, useTenantActions } from "#/modules/tenant";
import { WidgetAllowedOriginsCard } from "./widget-allowed-origins-card";
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
  const { canEdit } = useActiveTenantRole();
  const { updateAllowedOrigins } = useTenantActions();
  const tenant = findActiveTenant(data);
  if (!tenant) return null;
  return (
    <div className="space-y-6">
      <WidgetInstallCard slug={tenant.slug} origin={APP_BASE_URL} />
      <WidgetAllowedOriginsCard
        key={tenant.allowedOrigins.join("\0")}
        allowedOrigins={tenant.allowedOrigins}
        canEdit={canEdit}
        isPending={updateAllowedOrigins.isPending}
        error={updateAllowedOrigins.isError ? updateAllowedOrigins.error.message : null}
        onSave={(allowedOrigins) => updateAllowedOrigins.mutate({ data: { tenantId: tenant.id, allowedOrigins } })}
      />
    </div>
  );
}
