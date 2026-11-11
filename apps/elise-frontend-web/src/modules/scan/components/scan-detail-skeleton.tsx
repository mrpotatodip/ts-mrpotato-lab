import { range, SkeletonBar, SkeletonCard, SkeletonStatStrip } from "#/components/ui/skeleton";
import { ShellPageHeaderSkeleton } from "#/modules/shell";

export function ScanDiffSkeleton() {
  return <SkeletonCard className="h-25" rows={0} />;
}

export function ScanFindingsTableSkeleton() {
  return (
    <div className="grid gap-3 p-5">
      {range(4).map((row) => (
        <SkeletonBar key={row} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ScanDetailSkeleton() {
  return (
    <>
      <ShellPageHeaderSkeleton className="h-32" />
      <output className="contents" aria-label="Loading">
        <SkeletonStatStrip />
        <SkeletonCard className="h-171" rows={5} rowClassName="h-24" />
        <ScanDiffSkeleton />
        <SkeletonCard className="h-97" rows={4} rowClassName="h-12" />
        <SkeletonCard className="h-24" rows={0} />
        <SkeletonCard className="h-198" rows={1} rowClassName="h-96" />
      </output>
    </>
  );
}
