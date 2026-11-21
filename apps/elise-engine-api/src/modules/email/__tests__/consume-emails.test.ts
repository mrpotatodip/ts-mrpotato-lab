import { describe, expect, it } from "vitest";
import { handleEmailQueue } from "#/modules/email";
import type { QueueBody } from "#/modules/email";

const invite = {
  to: "bo@example.com",
  accountName: "Acme",
  inviterName: "Ada",
  roleLabel: "Member",
  link: "https://app.eliselab.com/invite/abc",
  expiresAt: "2026-11-15T09:00:00.000Z",
};

const run = async (queue: string, body: QueueBody, failWith: string | undefined) => {
  const calls: string[] = [];
  const sent: { from: unknown }[] = [];
  const message = {
    body,
    attempts: 2,
    ack: () => calls.push("ack"),
    retry: (options?: { delaySeconds?: number }) => calls.push(`retry ${options?.delaySeconds}`),
  };
  // SAFETY: the consumer reads only queue, messages, ack, retry, attempts and body.
  const batch = { queue, messages: [message] } as never;
  const env = {
    EMAIL_FROM: "no-reply@example.com",
    DATABASE_URL: "postgres://unused",
    // SAFETY: the consumer calls only send, with one builder object.
    EMAIL: {
      send: async (mail: { from: unknown }) => {
        sent.push(mail);
        if (failWith !== undefined) throw Object.assign(new Error("send failed"), { code: failWith });
        return { messageId: "m-1" };
      },
    } as never,
  };
  const statuses: string[] = [];
  await handleEmailQueue(batch, env, async (inviteId, status) => {
    statuses.push(`${inviteId} ${status}`);
  });
  return { calls, sent, statuses };
};

describe("email queue consumer", () => {
  it.each([
    ["E_RATE_LIMIT_EXCEEDED", "retry 60"],
    ["E_DELIVERY_FAILED", "retry 60"],
    ["E_INTERNAL_SERVER_ERROR", "retry 60"],
    ["E_DAILY_LIMIT_EXCEEDED", "retry 43200"],
    ["E_RECIPIENT_SUPPRESSED", "ack"],
    ["E_SENDER_NOT_VERIFIED", "ack"],
    ["E_VALIDATION_ERROR", "ack"],
    ["E_FIELD_MISSING", "ack"],
    ["SOMETHING_NEW", "ack"],
  ])("sorts %s into %s", async (code, expected) => {
    const { calls } = await run("elise-invite-emails", { kind: "password-reset", to: "bo@example.com", link: "https://x/y", expiresAt: "2026-11-15T09:00:00.000Z" }, code);

    expect(calls).toEqual([expected]);
  });

  it("sends a message and acknowledges it, from the configured sender", async () => {
    const { calls, sent } = await run("elise-invite-emails", { kind: "team-invite", ...invite }, undefined);

    expect(calls).toEqual(["ack"]);
    expect(sent[0]?.from).toEqual({ email: "no-reply@example.com", name: "EliseLAB" });
  });

  it("reads a message with no kind as a Team invite", async () => {
    const { calls, sent } = await run("elise-invite-emails", invite, undefined);

    expect(calls).toEqual(["ack"]);
    expect(sent).toHaveLength(1);
  });

  it.each([
    ["sent", undefined, "queue", "i-1 sent"],
    ["dropped", "E_RECIPIENT_SUPPRESSED", "queue", "i-1 failed"],
    ["retried", "E_DELIVERY_FAILED", "queue", undefined],
    ["dead-lettered", undefined, "dlq", "i-1 failed"],
  ])("tells a Team invite with an ID whether it was %s", async (_name, failWith, where, expected) => {
    const queue = where === "dlq" ? "elise-invite-emails-dlq" : "elise-invite-emails";
    const { statuses } = await run(queue, { kind: "team-invite", inviteId: "i-1", ...invite }, failWith);

    expect(statuses).toEqual(expected ? [expected] : []);
  });

  it("records nothing for a message with no invite ID", async () => {
    const { statuses } = await run("elise-invite-emails", { kind: "team-invite", ...invite }, undefined);

    expect(statuses).toEqual([]);
  });

  it("acknowledges a dead letter without sending", async () => {
    const { calls, sent } = await run("elise-invite-emails-dlq", { kind: "team-invite", ...invite }, undefined);

    expect(calls).toEqual(["ack"]);
    expect(sent).toHaveLength(0);
  });
});
