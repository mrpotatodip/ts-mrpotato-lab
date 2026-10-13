import { APP_BASE_URL } from "#/lib/app-base-url";
import { PageHeader } from "#/modules/shared";
import { useActiveTenant } from "#/modules/tenant";
import { WidgetInstallCard } from "./widget-install-card";

export function WidgetSuspensePanelMain() {
  const tenant = useActiveTenant();

  return (
    <>
      <PageHeader
        title="Widget"
        description="Put the Customer chat on your website. Customers ask without signing in."
      />
      {tenant ? <WidgetInstallCard slug={tenant.slug} origin={APP_BASE_URL} /> : null}
    </>
  );
}
