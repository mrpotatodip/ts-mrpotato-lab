import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { Bindings } from "#/types/variables";
import { ImportQueueMessageSchema } from "#/modules/menu-import/schemas";
import type { ImportQueueMessage } from "#/modules/menu-import/types";
import { runImportSvc } from "#/modules/menu-import/handlers";
import { createImportRuntime } from "./create-import-runtime";

// -----
// The queue consumer: each message is one Import to
// extract. A bad message is dropped; a database
// failure is retried, up to the queue's own limit.
// -----
export const handleImportQueue = async (batch: MessageBatch<ImportQueueMessage>, env: Bindings): Promise<void> => {
  const db = db_connect(env.HYPERDRIVE_REALTIME.connectionString);
  const runtime = createImportRuntime(env, db);
  for (const message of batch.messages) {
    const parsed = ImportQueueMessageSchema.safeParse(message.body);
    if (!parsed.success) {
      message.ack();
      continue;
    }
    try {
      await runEffect(runImportSvc(runtime, parsed.data));
      message.ack();
    } catch (error) {
      console.error("menu import: the queue consumer failed", error);
      message.retry();
    }
  }
};
