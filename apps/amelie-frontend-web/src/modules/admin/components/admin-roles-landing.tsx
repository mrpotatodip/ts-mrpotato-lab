import { PageCard } from "#/modules/shared";
import { AdminRoleCreateForm } from "./admin-role-create-form";
import { AdminSuspenseRolesMain } from "./admin-suspense-roles-main";

export function AdminRolesLanding() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16 [&>*]:min-w-0">
      <PageCard title="New role" description="Add a user type. It stays hidden until you enable it.">
        <AdminRoleCreateForm />
      </PageCard>
      <PageCard title="All roles" description="Every role, what it can do, and how many people hold it." contentClassName="p-0">
        <AdminSuspenseRolesMain />
      </PageCard>
    </div>
  );
}
