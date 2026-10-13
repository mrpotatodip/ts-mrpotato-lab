import { Skeleton } from "#/components/ui/skeleton";
import { AppBreadcrumb, AppBreadcrumbLink, AppBreadcrumbPage, AppBreadcrumbSeparator } from "#/modules/shared";

// -----
// The crumbs with the thread's title still to come.
// -----
export function ChatBotRoomSkeleton() {
  return (
    <AppBreadcrumb className="shrink-0">
      <AppBreadcrumbLink to="/chat-bot">Assistant</AppBreadcrumbLink>
      <AppBreadcrumbSeparator />
      <AppBreadcrumbPage>
        <Skeleton className="h-4 w-32" />
      </AppBreadcrumbPage>
    </AppBreadcrumb>
  );
}
