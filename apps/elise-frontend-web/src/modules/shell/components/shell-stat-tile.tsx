import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";

type ShellStatTileProps = {
  label: string;
  value: ReactNode;
  note: ReactNode;
  icon: LucideIcon;
  tone: string;
};

export function ShellStatTile({ label, value, note, icon: Icon, tone }: ShellStatTileProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone)}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className={cn("mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums", value === 0 && "text-muted-foreground")}>{value}</p>
      <div className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{note}</div>
    </Card>
  );
}
