import { SkeletonCard } from "#/components/ui/skeleton";
import { ShellPageHeaderSkeleton } from "#/modules/shell";

export function RepoFindingsSkeleton() {
  return <SkeletonCard className="h-87" rows={4} rowClassName="h-12" />;
}

export function RepoDetailSkeleton() {
  return (
    <>
      <ShellPageHeaderSkeleton className="h-32" />
      <output className="contents" aria-label="Loading">
        <SkeletonCard className="h-264" rows={6} rowClassName="h-24" />
        <RepoFindingsSkeleton />
        <SkeletonCard className="h-48" rows={1} rowClassName="h-10" />
      </output>
    </>
  );
}
