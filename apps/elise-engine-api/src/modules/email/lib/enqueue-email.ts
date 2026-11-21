import type { QueuedEmail } from "#/modules/email/types";
import type { Bindings } from "#/types/variables";

export const enqueueEmail = async (env: Pick<Bindings, "EMAIL_QUEUE">, mail: QueuedEmail): Promise<void> => {
  await env.EMAIL_QUEUE.send(mail, { contentType: "json" });
};
