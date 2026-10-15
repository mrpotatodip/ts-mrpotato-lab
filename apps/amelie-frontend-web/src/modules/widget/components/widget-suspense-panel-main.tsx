import { Suspense } from "react";

import { APP_BASE_URL } from "#/lib/app-base-url";
import { PageHeader } from "#/modules/shared";
import { findActiveTenant, useSuspenseTenants, useTenantActions } from "#/modules/tenant";
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
  const tenant = findActiveTenant(data);
  const { updateAllowedOrigins } = useTenantActions();
  if (!tenant) return null;
  return (
    <div className="flex flex-col gap-6">
      <WidgetInstallCard slug={tenant.slug} origin={APP_BASE_URL} />
      <WidgetAllowedOriginsCard
        key={tenant.allowedOrigins.join("\0")}
        allowedOrigins={tenant.allowedOrigins}
        canEdit={tenant.canEdit}
        isPending={updateAllowedOrigins.isPending}
        error={updateAllowedOrigins.error?.message ?? null}
        onSave={(allowedOrigins) =>
          updateAllowedOrigins.mutate({ tenantId: tenant.id, allowedOrigins })
        }
      />
    </div>
  );
}
