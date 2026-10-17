import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { useSuspenseAdminRoles } from "../hooks";
import { formatAdminPowerCount } from "../utils";
import { AdminRoleStatusBadge } from "./admin-role-status-badge";

export function AdminRoleTable() {
  const { data } = useSuspenseAdminRoles();

  return (
    <Table className="min-w-[40rem] whitespace-nowrap">
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Powers</TableHead>
          <TableHead>People</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((role) => (
          <TableRow key={role.id}>
            <TableCell>
              <p className="font-medium">{role.label}</p>
              <p className="text-muted-foreground font-mono text-xs">{role.key}</p>
            </TableCell>
            <TableCell>
              <AdminRoleStatusBadge role={role} />
            </TableCell>
            <TableCell className="tabular-nums">{formatAdminPowerCount(role.powerCount)}</TableCell>
            <TableCell className="tabular-nums">{role.holderCount}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/admin/roles/$roleId" params={{ roleId: role.id }} />}
              >
                Manage
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
