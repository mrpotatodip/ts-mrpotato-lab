import type { HTMLAttributes } from "react";
import type { ReactTable, Row, RowData } from "@tanstack/react-table";
import type { DataTableFeatures } from "#/lib/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";

type DataTableProps<TData extends RowData> = {
  table: ReactTable<DataTableFeatures, TData>;
  rowProps?: (row: Row<DataTableFeatures, TData>) => HTMLAttributes<HTMLTableRowElement>;
  tableProps?: HTMLAttributes<HTMLTableElement>;
};

// -----
// Draws a TanStack table with the dashboard's `Table` primitive, so the
// look is the one every table already had. The table owns the columns
// and rows; this owns the markup.
// -----
function DataTable<TData extends RowData>({ table, rowProps, tableProps }: DataTableProps<TData>) {
  return (
    <Table {...tableProps}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} className={header.column.columnDef.meta?.head} aria-hidden={header.column.columnDef.meta?.decorative ? true : undefined}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} {...rowProps?.(row)}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id} className={cell.column.columnDef.meta?.cell} aria-hidden={cell.column.columnDef.meta?.decorative ? true : undefined}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { DataTable };
