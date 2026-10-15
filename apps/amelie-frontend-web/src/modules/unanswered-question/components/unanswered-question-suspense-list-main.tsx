import { Suspense } from "react";

import { PageCard, PageHeader } from "#/modules/shared";
import { useSuspenseUnansweredQuestions, useUnansweredQuestionActions } from "../hooks";
import { UnansweredQuestionItem } from "./unanswered-question-item";
import { UnansweredQuestionListSkeleton } from "./unanswered-question-list-skeleton";
import { UnansweredQuestionSummary } from "./unanswered-question-summary";

const CARD_TITLE = "Need information";
const CARD_DESCRIPTION = "Newest first. Dismiss one once you have covered it.";

// -----
// What Customers asked that the assistant had no
// answer for, newest first; dismiss to clear.
// -----
export function UnansweredQuestionSuspenseListMain() {
  return (
    <>
      <PageHeader
        title="Unanswered questions"
        description="What customers asked that the assistant could not answer. Add an FAQ to cover it."
      />
      <Suspense fallback={<UnansweredQuestionListSkeleton />}>
        <UnansweredQuestionListView />
      </Suspense>
    </>
  );
}

function UnansweredQuestionListView() {
  const { data } = useSuspenseUnansweredQuestions();
  const { dismiss } = useUnansweredQuestionActions();

  return (
    <div className="flex flex-col gap-6">
      <UnansweredQuestionSummary summary={data.summary} />
      <PageCard title={CARD_TITLE} description={CARD_DESCRIPTION} contentClassName="p-0">
        {data.questions.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">Nothing is waiting. Every question had an answer.</p>
        ) : (
          <ul className="divide-y">
            {data.questions.map((item) => (
              <UnansweredQuestionItem
                key={item.messageId}
                item={item}
                isDismissing={dismiss.isPending && dismiss.variables === item.messageId}
                onDismiss={(messageId) => dismiss.mutate(messageId)}
              />
            ))}
          </ul>
        )}
      </PageCard>
      {dismiss.error ? <p className="text-destructive text-sm">{dismiss.error.message}</p> : null}
    </div>
  );
}
