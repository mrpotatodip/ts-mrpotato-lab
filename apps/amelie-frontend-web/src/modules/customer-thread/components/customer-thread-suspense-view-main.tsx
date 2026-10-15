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
    <>
      <header className="mb-6 space-y-2">
        <Link to="/customers" className="text-muted-foreground hover:text-foreground text-sm">
          All Customer chats
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{data.title ?? "Chat"}</h1>
        <p className="text-muted-foreground text-base">
          Started <LocalDateTime iso={data.startedAt} />
        </p>
      </header>
      <div className="mx-auto w-full max-w-2xl">
        <CustomerThreadMessages messages={data.messages} />
      </div>
    </>
  );
}
