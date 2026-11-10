import { SkeletonCard, SkeletonStatStrip } from "#/components/ui/skeleton";
import { ShellPageHeader } from "#/modules/shell";

export function SummarySkeleton() {
  return (
    <>
      <ShellPageHeader title="Summary" description="Where each repository stands, and what is still open. Nothing here changes anything." />
      <output className="contents" aria-label="Loading">
        <SkeletonStatStrip />
        <SkeletonCard rows={4} rowClassName="h-14" />
      </output>
    </>
  );
}
