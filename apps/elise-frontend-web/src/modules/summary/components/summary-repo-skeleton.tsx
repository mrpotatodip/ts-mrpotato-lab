import { SkeletonCard, SkeletonStatStrip } from "#/components/ui/skeleton";
import { ShellPageHeader } from "#/modules/shell";

export function SummaryRepoSkeleton() {
  return (
    <>
      <ShellPageHeader title="Repository" description="Open findings. Nothing here changes anything." />
      <output className="contents" aria-label="Loading">
        <SkeletonStatStrip />
        <SkeletonCard rows={3} rowClassName="h-24" />
      </output>
    </>
  );
}
