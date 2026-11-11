import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { SkeletonBar } from "#/components/ui/skeleton";
import { ShellPublicBrand, ShellPublicThemeSwitch } from "#/modules/shell";

export function TeamInviteSkeleton() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-lg content-center gap-8 p-6">
      <ShellPublicThemeSwitch />
      <ShellPublicBrand />
      <Card className="shadow-raised" aria-busy="true">
        <CardHeader className="gap-1.5 px-8 pb-9 pt-8">
          <SkeletonBar className="h-6 w-56" />
          <SkeletonBar className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 p-8">
          <SkeletonBar className="h-9 w-full" />
          <SkeletonBar className="h-9 w-full" />
          <SkeletonBar className="h-9 w-full" />
          <SkeletonBar className="h-9 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
