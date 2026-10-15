import { Suspense } from "react";

import { PageCard, PageHeader } from "#/modules/shared";
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

  return (
    <PageCard
      title="Conversations"
      description="Newest first. Amber means the assistant had to say it didn't know."
      contentClassName="p-0"
    >
      {data.length === 0 ? (
        <p className="stat-label p-6">No Customer has chatted yet.</p>
      ) : (
        <ul className="divide-y">
          {data.map((thread) => (
            <CustomerThreadItem key={thread.id} thread={thread} />
          ))}
        </ul>
      )}
    </PageCard>
  );
}
