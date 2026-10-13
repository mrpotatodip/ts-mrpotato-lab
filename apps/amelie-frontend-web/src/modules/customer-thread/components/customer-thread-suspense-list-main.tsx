import { Suspense } from "react";

import { Card } from "#/components/ui/card";
import { PageHeader } from "#/modules/shared";
import { useSuspenseCustomerThreads } from "../hooks";
import { CustomerThreadItem } from "./customer-thread-item";
import { CustomerThreadListSkeleton } from "./customer-thread-list-skeleton";

// -----
// What Customers asked, newest chat first. A badge
// shows the chats that left a question unanswered.
// -----
export function CustomerThreadSuspenseListMain() {
  return (
    <>
      <PageHeader title="Customer chats" description="Every conversation customers have had with the assistant." />
      <Suspense fallback={<CustomerThreadListSkeleton />}>
        <CustomerThreadListView />
      </Suspense>
    </>
  );
}

function CustomerThreadListView() {
  const { data } = useSuspenseCustomerThreads();

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No Customer has chatted yet.</p>;
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y">
        {data.map((thread) => (
          <CustomerThreadItem key={thread.id} thread={thread} />
        ))}
      </ul>
    </Card>
  );
}
