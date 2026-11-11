import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { range, SkeletonBar } from "#/components/ui/skeleton";

export function RepoListSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <SkeletonBar className="h-5 w-32" />
        <SkeletonBar className="h-4 w-24" />
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <div className="border-b px-5 py-3">
          <SkeletonBar className="h-9 w-72" />
        </div>
        <div className="divide-y">
          {range(3).map((repo) => (
            <div key={repo}>
              <div className="flex items-center justify-between gap-6 bg-muted/40 px-5 py-3">
                <SkeletonBar className="h-5 w-56" />
                <SkeletonBar className="h-4 w-40" />
              </div>
              <div className="divide-y divide-border/70">
                {range(2).map((branch) => (
                  <div key={branch} className="flex h-14 items-center justify-between gap-6 px-5">
                    <SkeletonBar className="h-4 w-32" />
                    <SkeletonBar className="h-4 w-48" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
