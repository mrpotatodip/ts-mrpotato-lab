import { eslintCompatPlugin } from "@oxlint/plugins";

import { noAsyncInEffectLayersRule } from "./rules/no-async-in-effect-layers.ts";
import { noEffectCatchAllRule } from "./rules/no-effect-catch-all.ts";
import { noEffectRunOutsideRunnerRule } from "./rules/no-effect-run-outside-runner.ts";
import { noRunEffectInEffectLayersRule } from "./rules/no-run-effect-in-effect-layers.ts";
import { noServiceConstructorImportsRule } from "./rules/no-service-constructor-imports.ts";
import { noThrowInEffectGenRule } from "./rules/no-throw-in-effect-gen.ts";
import { requireEffectReturnTypeRule } from "./rules/require-effect-return-type.ts";
import { requireTryPromiseCatchRule } from "./rules/require-try-promise-catch.ts";

/** Opt-in Oxlint rules for Effect services, layers and run points. */
const antiSlopEffectPlugin = eslintCompatPlugin({
	meta: { name: "anti-slop-effect" },
	rules: {
		"no-async-in-effect-layers": noAsyncInEffectLayersRule,
		"no-effect-catch-all": noEffectCatchAllRule,
		"no-effect-run-outside-runner": noEffectRunOutsideRunnerRule,
		"no-run-effect-in-effect-layers": noRunEffectInEffectLayersRule,
		"no-service-constructor-imports": noServiceConstructorImportsRule,
		"no-throw-in-effect-gen": noThrowInEffectGenRule,
		"require-effect-return-type": requireEffectReturnTypeRule,
		"require-try-promise-catch": requireTryPromiseCatchRule,
	},
});

export default antiSlopEffectPlugin;
