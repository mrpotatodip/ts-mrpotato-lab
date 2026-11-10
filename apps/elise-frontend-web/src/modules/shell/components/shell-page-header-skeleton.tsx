import { SkeletonBar } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

export function ShellPageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div data-slot="page-header" className={cn("grid content-start gap-1.5", className)}>
      <SkeletonBar className="h-[26px] w-64 bg-foreground/25" />
      <SkeletonBar className="h-4 w-96 max-w-full bg-foreground/25" />
    </div>
  );
}
