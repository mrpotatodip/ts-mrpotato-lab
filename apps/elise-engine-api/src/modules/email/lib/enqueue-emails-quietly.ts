import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import type { QueuedEmail } from "#/modules/email/types";

export const enqueueEmailsQuietly = (enqueue: (mail: QueuedEmail) => Promise<void>, mails: QueuedEmail[]): Promise<void> =>
  runEffect(
    Effect.forEach(
      mails,
      (mail) =>
        Effect.tryPromise({ try: () => enqueue(mail), catch: (cause) => cause }).pipe(
          Effect.match({ onSuccess: () => undefined, onFailure: () => console.error("Email not queued", { kind: mail.kind }) }),
        ),
      { discard: true },
    ),
  );
