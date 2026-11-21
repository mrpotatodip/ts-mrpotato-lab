import { Effect } from "effect";
import { ExternalError, runEffect } from "#/lib/effect-query";
import { errorChainForLog } from "#/lib/redact-log";
import { EMAIL_DEAD_LETTER_QUEUE, EMAIL_LONG_WAIT_SECONDS, EMAIL_RETRY_BASE_SECONDS, EMAIL_SENDER_NAME } from "#/modules/email/constants";
import type { QueueBody, QueuedEmail, RecordInviteStatus } from "#/modules/email/types";
import { renderEmail, retryRuleOf, sendErrorCode } from "#/modules/email/utils";
import type { Bindings } from "#/types/variables";
import { loadRunnerNames } from "./load-runner-names";

export const withKind = (body: QueueBody): QueuedEmail => ("kind" in body ? body : { kind: "team-invite", ...body });

const recordStatus = (mail: QueuedEmail, status: "sent" | "failed", record: RecordInviteStatus) => {
  const inviteId = mail.kind === "team-invite" ? mail.inviteId : undefined;
  if (inviteId === undefined) return Effect.void;
  return Effect.tryPromise({ try: () => record(inviteId, status), catch: (cause) => new ExternalError({ cause }) }).pipe(
    Effect.catchTag("ExternalError", (error) => Effect.sync(() => console.error("Invite email status not recorded", { status, error: errorChainForLog(error) }))),
  );
};

const namesOf = (mail: QueuedEmail, env: Pick<Bindings, "DATABASE_URL">) =>
  mail.kind === "runner-added" || mail.kind === "runner-removed" ? loadRunnerNames(env.DATABASE_URL, mail).pipe(Effect.orElseSucceed(() => undefined)) : Effect.succeed(undefined);

export const consumeEmails = (batch: MessageBatch<QueueBody>, env: Pick<Bindings, "EMAIL" | "EMAIL_FROM" | "DATABASE_URL">, record: RecordInviteStatus): Promise<void> =>
  runEffect(
    Effect.forEach(
      batch.messages,
      (message) => {
        const mail = withKind(message.body);
        return namesOf(mail, env).pipe(
          Effect.flatMap((names) =>
            Effect.tryPromise({
              try: () => env.EMAIL.send({ to: mail.to, from: { email: env.EMAIL_FROM, name: EMAIL_SENDER_NAME }, ...renderEmail(mail, names) }),
              catch: (cause) => (cause instanceof Error ? cause : new Error("Email send failed")),
            }),
          ),
          Effect.matchEffect({
            onSuccess: (sent) =>
              Effect.suspend(() => {
                console.log("Email sent", { kind: mail.kind, messageId: sent.messageId });
                message.ack();
                return recordStatus(mail, "sent", record);
              }),
            onFailure: (error) =>
              Effect.suspend(() => {
                const code = sendErrorCode(error);
                const rule = retryRuleOf(code);
                console.error("Email not sent", { kind: mail.kind, code, rule, attempt: message.attempts });
                if (rule !== "drop") {
                  message.retry({ delaySeconds: rule === "long-wait" ? EMAIL_LONG_WAIT_SECONDS : EMAIL_RETRY_BASE_SECONDS * 2 ** (message.attempts - 1) });
                  return Effect.void;
                }
                message.ack();
                return recordStatus(mail, "failed", record);
              }),
          }),
        );
      },
      { concurrency: 5, discard: true },
    ),
  );

export const consumeDeadLetters = (batch: MessageBatch<QueueBody>, record: RecordInviteStatus): Promise<void> =>
  runEffect(
    Effect.forEach(
      batch.messages,
      (message) =>
        Effect.suspend(() => {
          const mail = withKind(message.body);
          console.error("Email dead-lettered", { kind: mail.kind });
          message.ack();
          return recordStatus(mail, "failed", record);
        }),
      { discard: true },
    ),
  );

export const handleEmailQueue = (batch: MessageBatch<QueueBody>, env: Pick<Bindings, "EMAIL" | "EMAIL_FROM" | "DATABASE_URL">, record: RecordInviteStatus): Promise<void> =>
  batch.queue === EMAIL_DEAD_LETTER_QUEUE ? consumeDeadLetters(batch, record) : consumeEmails(batch, env, record);
