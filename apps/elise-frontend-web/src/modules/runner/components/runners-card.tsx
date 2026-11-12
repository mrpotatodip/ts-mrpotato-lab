import { Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { Laptop } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Skeleton } from "#/components/ui/skeleton";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { removeRunner } from "../api";
import { RUNNER_STATE_COPY } from "../constants";
import { runnerKeys, runnersQuery } from "../hooks";
import type { Runner } from "../schemas";
import { runnerDetail } from "../utils";
import { RunnerAddDialog } from "./runner-add-dialog";
import { RunnerRemoveDialog } from "./runner-remove-dialog";

type RunnerRow = { runner: Runner; busy: boolean; remove: () => Promise<void> };

const column = dataTableColumns<RunnerRow>();

const columns = column.columns([
  column.display({
    id: "name",
    header: "Computer",
    cell: ({ row }) => (
      <>
        <span className="block font-medium">{row.original.runner.name}</span>
        <span className="block text-xs text-muted-foreground">{runnerDetail(row.original.runner)}</span>
      </>
    ),
  }),
  column.display({
    id: "state",
    header: "Status",
    cell: ({ row }) => {
      const state = RUNNER_STATE_COPY[row.original.runner.state];
      return <Badge variant={state.variant}>{state.label}</Badge>;
    },
  }),
  column.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    meta: { head: "w-24", cell: "text-right" },
    cell: ({ row }) => <RunnerRemoveDialog runner={row.original.runner} pending={row.original.busy} onConfirm={row.original.remove} />,
  }),
]);

export function RunnersCard() {
  const { data } = useSuspenseQuery(runnersQuery());
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (runnerId: string) => removeRunner({ data: { runnerId } }),
    onSuccess: async () => {
      toast.success("Runner removed.");
      await queryClient.invalidateQueries({ queryKey: runnerKeys.list() });
    },
    onError: (error) => toast.error(`We couldn't remove the runner. ${error.message}`),
  });

  const rows: RunnerRow[] = data.map((runner) => ({
    runner,
    busy: remove.isPending,
    remove: async () => {
      await remove.mutateAsync(runner.id);
    },
  }));
  const table = useTable({ features: dataTableFeatures, columns, data: rows, getRowId: (row) => row.runner.id });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="grid gap-1.5">
          <CardTitle>Runners</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">Computers you control that can run this account&apos;s scans, in place of Elise&apos;s cloud container.</p>
        </div>
        <Suspense fallback={<Skeleton className="h-8 w-32" />}>
          <RunnerAddDialog />
        </Suspense>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Laptop aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No runners yet</EmptyTitle>
              <EmptyDescription>Add a computer to get a pairing code, then type the code into the Elise Runner app on it.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DataTable table={table} />
        )}
      </CardContent>
    </Card>
  );
}
