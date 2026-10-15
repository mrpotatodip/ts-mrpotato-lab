import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { useSwitchTenant, useTenants } from "../hooks";
import { findActiveTenant } from "../utils";

// -----
// One cafe shows its name; several let the
// Person pick which one they are working in.
// -----
export function TenantPicker() {
  const { data, isPending } = useTenants();
  const switchTenant = useSwitchTenant();

  if (isPending) {
    return <Skeleton className="h-5 w-36" />;
  }

  if (!data || data.tenants.length === 0) return null;

  const active = findActiveTenant(data);
  if (data.tenants.length === 1) {
    return <span className="text-sm font-medium">{active?.name}</span>;
  }

  return (
    <Select
      value={data.activeTenantId ?? undefined}
      onValueChange={(tenantId) => {
        if (tenantId) switchTenant.mutate(tenantId);
      }}
    >
      <SelectTrigger className="w-full" aria-label="Cafe">
        <SelectValue>{active?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {data.tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
