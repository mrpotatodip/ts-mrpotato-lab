import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { range, SkeletonBar } from "#/components/ui/skeleton";

export function ScanListSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <SkeletonBar className="h-5 w-24" />
        <SkeletonBar className="h-4 w-20" />
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-3">
          <SkeletonBar className="h-9 w-72" />
          <SkeletonBar className="h-9 w-64" />
        </div>
        <div className="divide-y">
          {range(8).map((row) => (
            <div key={row} className="flex h-14 items-center justify-between gap-4 px-5">
              <SkeletonBar className="h-4 w-56" />
              <SkeletonBar className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
