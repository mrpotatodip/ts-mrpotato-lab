import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

// -----
// What a column adds on top of its definition: a class for its header
// cell and one for its body cells (width, alignment, the breakpoint at
// which it drops out). Every table in the dashboard shares this one set
// of features: rows only, no client sorting, filtering or paging, because
// the engine sorts, filters and pages and the URL holds the choice.
// -----
export type DataTableColumnClasses = { head?: string; cell?: string; decorative?: boolean };

// SAFETY: `columnMeta` is a type-only slot. The value is never read.
const features = tableFeatures({ columnMeta: {} as DataTableColumnClasses });

export const dataTableFeatures = features;

export type DataTableFeatures = typeof dataTableFeatures;

export const dataTableColumns = <TData extends RowData>() => createColumnHelper<DataTableFeatures, TData>();
