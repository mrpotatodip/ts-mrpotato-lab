import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ScanSuccessRingProps = {
  succeeded: number;
  failed: number;
  rate: number | null;
};

export function ScanSuccessRing({ succeeded, failed, rate }: ScanSuccessRingProps) {
  const filled = rate === null ? 0 : (rate / 100) * CIRCUMFERENCE;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Success rate</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">Finished scans that completed.</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="relative size-40">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="64" cy="64" r={RADIUS} fill="none" strokeWidth="12" className="stroke-muted" />
            {rate !== null && (
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
                className="stroke-mark-success transition-[stroke-dasharray] duration-700"
              />
            )}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">{rate === null ? "-" : rate}</span>
            {rate !== null && <span className="mt-1 text-xs text-muted-foreground">percent</span>}
          </div>
        </div>
        <dl className="grid w-full grid-cols-2 gap-6 border-t pt-5 text-sm">
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Succeeded</dt>
            <dd className={cn("text-xl font-semibold tabular-nums", succeeded > 0 && "text-status-success")}>{succeeded}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Failed</dt>
            <dd className={cn("text-xl font-semibold tabular-nums", failed > 0 && "text-status-danger")}>{failed}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
