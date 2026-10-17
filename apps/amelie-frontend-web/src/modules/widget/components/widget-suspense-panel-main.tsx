import { Suspense, useState } from "react";

import { APP_BASE_URL } from "#/lib/app-base-url";
import { activeCountries, useSuspenseCountries } from "#/modules/country";
import { activeLocations, useSuspenseLocations } from "#/modules/location";
import { PageCard, PageHeader } from "#/modules/shared";
import { findActiveTenant, useActiveTenantRole, useSuspenseTenants, useTenantActions } from "#/modules/tenant";
import { toWidgetLocationExamples } from "../utils";
import { WidgetAllowedOriginsCard } from "./widget-allowed-origins-card";
import { WidgetCustomerChatCard } from "./widget-customer-chat-card";
import { WidgetInstallCard } from "./widget-install-card";
import { WidgetLookPreview } from "./widget-look-preview";
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
  const { data: locations } = useSuspenseLocations();
  const { data: countries } = useSuspenseCountries();
  const { can } = useActiveTenantRole();
  const { updateAllowedOrigins, updateCustomerChat } = useTenantActions();
  const tenant = findActiveTenant(data);
  const [draft, setDraft] = useState({
    customerChatLabel: tenant?.customerChatLabel ?? "",
    customerChatAccent: tenant?.customerChatAccent ?? null,
  });
  if (!tenant) return null;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="space-y-8">
        <WidgetInstallCard
          slug={tenant.slug}
          origin={APP_BASE_URL}
          locations={toWidgetLocationExamples(activeLocations(locations), activeCountries(countries))}
        />
        <WidgetCustomerChatCard
          key={`${tenant.customerChatLabel}\0${tenant.customerChatAccent ?? ""}`}
          customerChatLabel={tenant.customerChatLabel}
          customerChatAccent={tenant.customerChatAccent}
          canEdit={can("integration:widget:look:update")}
          isPending={updateCustomerChat.isPending}
          error={updateCustomerChat.isError ? updateCustomerChat.error.message : null}
          onDraftChange={setDraft}
          onSave={(look) => updateCustomerChat.mutate({ tenantId: tenant.id, ...look })}
        />
        <WidgetAllowedOriginsCard
          key={tenant.allowedOrigins.join("\0")}
          allowedOrigins={tenant.allowedOrigins}
          canEdit={can("integration:widget:origins:update")}
          isPending={updateAllowedOrigins.isPending}
          error={updateAllowedOrigins.isError ? updateAllowedOrigins.error.message : null}
          onSave={(allowedOrigins) => updateAllowedOrigins.mutate({ tenantId: tenant.id, allowedOrigins })}
        />
      </div>
      <div className="lg:sticky lg:top-8">
        <PageCard title="Preview" description="How the bubble looks on the cafe site.">
          <WidgetLookPreview
            customerChatLabel={draft.customerChatLabel}
            customerChatAccent={draft.customerChatAccent}
          />
        </PageCard>
      </div>
    </div>
  );
}
