import { z } from "zod";
import { RUNNER_NAME_MAX, RunnerParamSchema } from "@repo/contracts/elise";

export { CreatedRunnerSchema, CreateRunnerBodySchema, RunnerParamSchema, RunnerRemovedSchema, RunnersSchema } from "@repo/contracts/elise";
export type { CreatedRunner, Runner, RunnerState, Runners } from "@repo/contracts/elise";

// -----
// What the add dialog checks before it asks the engine. The words
// say what to type, never the rule that failed.
// -----
export const RunnerDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this computer a name, like “Jayson’s MacBook”.")
    .max(RUNNER_NAME_MAX, `Use ${RUNNER_NAME_MAX} characters or fewer.`),
});

export type RunnerDetails = z.infer<typeof RunnerDetailsSchema>;

export type RunnerRemoveInput = z.infer<typeof RunnerParamSchema>;
