import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { UpdateTenantRegionBodySchema, type Tenant } from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { activeCountries, CountryAddLink, CountrySection, useSuspenseCountries } from "#/modules/country";
import { PageCard, RegionFields } from "#/modules/shared";
import { useActiveTenant, useActiveTenantRole, useTenantActions } from "#/modules/tenant";

// -----
// One country: the Region card, plus a quiet way to add
// another. Two or more: the Countries settings take its
// place, as the Region card can only describe one.
// -----
export function BusinessProfileRegion() {
  const tenant = useActiveTenant();
  const { data } = useSuspenseCountries();
  const countries = activeCountries(data);
  if (!tenant) return null;
  if (countries.length > 1) return <CountrySection />;
  return (
    <>
      <RegionCard key={tenant.id} tenant={tenant} />
      <CountryAddLink />
    </>
  );
}

function RegionCard({ tenant }: { tenant: Tenant }) {
  const { canEdit } = useActiveTenantRole();
  const { updateRegion } = useTenantActions();
  const [confirming, setConfirming] = useState(false);

  const saveRegion = (region: Pick<Tenant, "country" | "currency">) =>
    updateRegion.mutate(
      { tenantId: tenant.id, ...region },
      {
        onSuccess: () => {
          setConfirming(false);
          form.reset(region);
        },
      },
    );

  const form = useForm({
    defaultValues: { country: tenant.country, currency: tenant.currency },
    validators: { onChange: UpdateTenantRegionBodySchema },
    onSubmit: ({ value }) => (value.currency === tenant.currency ? saveRegion(value) : setConfirming(true)),
  });

  return (
    <>
      <PageCard title="Region" description="Sets the country and the currency your prices are shown in.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <RegionFields
                country={values.country}
                currency={values.currency}
                disabled={!canEdit}
                onChange={(region) => {
                  form.setFieldValue("country", region.country);
                  form.setFieldValue("currency", region.currency);
                }}
                className="flex flex-col gap-4"
                labelClassName="text-sm"
                triggerClassName="w-64"
              />
            )}
          </form.Subscribe>

          {updateRegion.isError && !confirming ? (
            <p className="text-xs text-destructive">{updateRegion.error.message}</p>
          ) : null}
          {canEdit ? (
            <form.Subscribe
              selector={(state) => state.values.country !== tenant.country || state.values.currency !== tenant.currency}
            >
              {(dirty) => (
                <Button type="submit" size="sm" className="mt-4 w-fit" disabled={!dirty || updateRegion.isPending}>
                  {updateRegion.isPending ? "Saving..." : "Save region"}
                </Button>
              )}
            </form.Subscribe>
          ) : (
            <p className="text-muted-foreground text-xs">Only a tenant_admin or store_admin can change this.</p>
          )}
        </form>
      </PageCard>

      <form.Subscribe selector={(state) => state.values.currency}>
        {(currency) => (
          <Dialog open={confirming} onOpenChange={setConfirming}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change currency to {currency}?</DialogTitle>
                <DialogDescription>
                  Prices are relabeled, not converted. A price of 4.75 {tenant.currency} becomes 4.75 {currency}.
                </DialogDescription>
              </DialogHeader>
              {updateRegion.isError ? <p className="text-destructive text-sm">{updateRegion.error.message}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={updateRegion.isPending} onClick={() => saveRegion(form.state.values)}>
                  {updateRegion.isPending ? "Saving..." : "Change currency"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </form.Subscribe>
    </>
  );
}
