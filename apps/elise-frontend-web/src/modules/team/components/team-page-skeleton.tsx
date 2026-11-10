import { SkeletonCard } from "#/components/ui/skeleton";

export function TeamPageSkeleton() {
  return (
    <output className="contents" aria-label="Loading">
      <SkeletonCard rows={4} />
      <SkeletonCard rows={3} />
    </output>
  );
}
