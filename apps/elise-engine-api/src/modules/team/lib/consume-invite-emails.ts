import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { errorChainForLog } from "#/lib/redact-log";
import { renderInviteEmail } from "#/modules/team/utils";
import type { InviteEmail } from "#/modules/team/types";
import type { Bindings } from "#/types/variables";

const RETRY_BASE_SECONDS = 30;
const SENDER_NAME = "EliseLAB";

// -----
// Queue consumer: one email for each message. A
// failed send goes back with a longer wait each
// time; after the queue's max_retries it lands in
// the dead-letter queue. Only the error is logged,
// never the address or the link.
// -----
export const consumeInviteEmails = (batch: MessageBatch<InviteEmail>, env: Bindings): Promise<void> =>
  runEffect(
    Effect.forEach(
      batch.messages,
      (message) =>
        Effect.tryPromise({
          try: () => env.EMAIL.send({ to: message.body.to, from: { email: env.INVITE_FROM, name: SENDER_NAME }, ...renderInviteEmail(message.body) }),
          catch: (cause) => (cause instanceof Error ? cause : new Error("Invite email send failed")),
        }).pipe(
          Effect.match({
            onSuccess: () => message.ack(),
            onFailure: (error) => {
              console.error("Invite email not sent", errorChainForLog(error));
              message.retry({ delaySeconds: RETRY_BASE_SECONDS * 2 ** (message.attempts - 1) });
            },
          }),
        ),
      { concurrency: 5, discard: true },
    ),
  );
