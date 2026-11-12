import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { errorChainForLog } from "#/lib/redact-log";
import { renderInviteEmail } from "#/modules/team/utils";
import { renderPasswordResetEmail } from "#/modules/auth/utils";
import type { QueuedEmail } from "#/modules/auth/types";
import type { Bindings } from "#/types/variables";

const RETRY_BASE_SECONDS = 30;
const SENDER_NAME = "EliseLAB";

const renderQueuedEmail = (mail: QueuedEmail) => ("kind" in mail ? renderPasswordResetEmail(mail) : renderInviteEmail(mail));

// -----
// Queue consumer: one email for each message, an
// invite or a password reset. A failed send goes
// back with a longer wait each time; after the
// queue's max_retries it lands in the dead-letter
// queue. Only the error is logged, never the
// address or the link.
// -----
export const consumeQueuedEmails = (batch: MessageBatch<QueuedEmail>, env: Bindings): Promise<void> =>
  runEffect(
    Effect.forEach(
      batch.messages,
      (message) =>
        Effect.tryPromise({
          try: () => env.EMAIL.send({ to: message.body.to, from: { email: env.INVITE_FROM, name: SENDER_NAME }, ...renderQueuedEmail(message.body) }),
          catch: (cause) => (cause instanceof Error ? cause : new Error("Email send failed")),
        }).pipe(
          Effect.match({
            onSuccess: () => message.ack(),
            onFailure: (error) => {
              console.error("Email not sent", errorChainForLog(error));
              message.retry({ delaySeconds: RETRY_BASE_SECONDS * 2 ** (message.attempts - 1) });
            },
          }),
        ),
      { concurrency: 5, discard: true },
    ),
  );
