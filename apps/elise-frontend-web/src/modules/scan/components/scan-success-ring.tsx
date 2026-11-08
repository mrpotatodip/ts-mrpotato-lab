import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

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
        <p className="text-xs text-muted-foreground">Finished scans that completed</p>
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
                className="stroke-status-success/75 transition-[stroke-dasharray] duration-700"
              />
            )}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">{rate === null ? "-" : rate}</span>
            {rate !== null && <span className="mt-1 text-xs text-muted-foreground">percent</span>}
          </div>
        </div>
        <dl className="grid w-full grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-status-success-soft px-3 py-2">
            <dt className="text-xs text-status-success">Succeeded</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{succeeded}</dd>
          </div>
          <div className="rounded-lg bg-status-danger-soft px-3 py-2">
            <dt className="text-xs text-status-danger">Failed</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{failed}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
