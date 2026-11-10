import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import type { ScanActivityDay } from "../utils";

const PLOT_HEIGHT = 168;

type ScanActivityChartProps = {
  days: readonly ScanActivityDay[];
};

const plural = (count: number) => (count === 1 ? "scan" : "scans");

export function ScanActivityChart({ days }: ScanActivityChartProps) {
  const peak = Math.max(2, ...days.map((day) => day.total));
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const ticks = [peak, Math.round(peak / 2), 0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan activity</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">Scans started per day, last {days.length} days.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-4">
        <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-mark-success" />
            Succeeded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-mark-danger" />
            Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-mark-info" />
            In progress
          </span>
        </div>
        <div className="flex flex-col justify-between text-right text-xs tabular-nums text-muted-foreground" style={{ height: PLOT_HEIGHT }} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {tick}
            </span>
          ))}
        </div>
        <div className="grid gap-2">
          <div className="relative" style={{ height: PLOT_HEIGHT }}>
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              {ticks.map((tick) => (
                <div key={tick} className="h-px w-full border-t border-dashed border-border" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-end gap-1.5">
              {days.map((day) => (
                <div key={day.key} className="flex h-full flex-1 items-end">
                  <Tooltip>
                    <TooltipTrigger
                      aria-label={`${day.label}: ${day.total} ${plural(day.total)}`}
                      className={cn(
                        "group flex w-full flex-col-reverse justify-start overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        day.total === 0 && "h-6",
                      )}
                      style={day.total === 0 ? undefined : { height: `${(day.total / peak) * 100}%` }}
                    >
                      {day.total === 0 && <span className="block h-1 w-full rounded-md bg-muted" />}
                      {day.succeeded > 0 && <span className="block w-full bg-mark-success transition-opacity group-hover:opacity-80" style={{ flexGrow: day.succeeded }} />}
                      {day.failed > 0 && <span className="block w-full bg-mark-danger transition-opacity group-hover:opacity-80" style={{ flexGrow: day.failed }} />}
                      {day.active > 0 && <span className="block w-full bg-mark-info transition-opacity group-hover:opacity-80" style={{ flexGrow: day.active }} />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{day.label}</p>
                      <p className="mt-1 text-muted-foreground">
                        {day.total} {plural(day.total)}
                      </p>
                      {day.total > 0 && (
                        <p className="mt-0.5 tabular-nums text-muted-foreground">
                          {day.succeeded} ok · {day.failed} failed · {day.active} running
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
            {days.map((day, index) => (
              <span key={day.key} className="flex-1 truncate text-center">
                {index % 2 === 1 ? day.label.replace(/^\w+ /, "") : ""}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
      <p className="sr-only">{total} scans in the last {days.length} days.</p>
    </Card>
  );
}
