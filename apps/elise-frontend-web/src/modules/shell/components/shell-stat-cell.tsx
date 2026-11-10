import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

type ShellStatCellProps = { label: string; value: ReactNode; note: ReactNode; lead?: boolean };

export function ShellStatCell({ label, value, note, lead }: ShellStatCellProps) {
  return (
    <div className="grid content-start gap-3 p-6">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <p className={cn("font-semibold leading-none tracking-tight tabular-nums", lead ? "text-[40px]" : "text-[32px]", value === 0 && "text-muted-foreground")}>{value}</p>
      <div className="text-sm leading-relaxed text-muted-foreground">{note}</div>
    </div>
  );
}
