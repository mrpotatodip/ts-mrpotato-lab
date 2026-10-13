import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { useSuspenseCustomerThread } from "../hooks";
import { CustomerThreadMessages } from "./customer-thread-messages";
import { CustomerThreadViewSkeleton } from "./customer-thread-view-skeleton";
import { LocalDateTime } from "#/modules/shared";

type CustomerThreadSuspenseViewMainProps = {
  threadId: string;
};

type CustomerThreadViewProps = {
  threadId: string;
};

// -----
// One Customer chat, read-only. A chat that does not
// load goes to the route's error screen.
// -----
export function CustomerThreadSuspenseViewMain({ threadId }: CustomerThreadSuspenseViewMainProps) {
  return (
    <Suspense fallback={<CustomerThreadViewSkeleton />}>
      <CustomerThreadView threadId={threadId} />
    </Suspense>
  );
}

function CustomerThreadView({ threadId }: CustomerThreadViewProps) {
  const { data } = useSuspenseCustomerThread(threadId);

  return (
    <div className="space-y-4">
      <div>
        <Link to="/customers" className="text-muted-foreground text-xs">
          ← All Customer chats
        </Link>
        <h2 className="text-sm font-semibold">{data.title ?? "Chat"}</h2>
        <p className="text-muted-foreground text-xs">Started <LocalDateTime iso={data.startedAt} /></p>
      </div>
      <CustomerThreadMessages messages={data.messages} />
    </div>
  );
}
