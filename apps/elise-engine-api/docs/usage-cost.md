# Scan usage and cost

Where the numbers come from, and how to check them.

- The `Outbound` proxy meters every `/v1/messages` call: it reads the `usage` of each response, prices it with `SCAN_SANDBOX_MODEL_PRICES` and adds it to the scan's meter in the `ScanSandbox` Durable Object. It refuses new calls once the meter reaches the scan's `maxBudgetUsd`, and caps `max_tokens`. `readUsage` records the meter's tokens and cost; only turns and duration still come from the agent's report in `agent.log` (`parseAgentUsage`), which code in the container can rewrite.
- Token counts are the model API's own counts. `cost_usd` is our estimate at the list prices in `constants/index.ts`, not an invoice; keep the table current when a model's price changes. A model missing from the table is priced like the dearest one. Haiku uses its rate above 100K prompt tokens, so it may overcount. A call in flight when the cap is reached still finishes, so a scan can pass its cap by those calls.
- A scan that times out, or fails before the agent starts, has no usage (null). It still counts against the budget through its reserved cap while it runs.

## Check the estimate

1. In the Anthropic Console, open Usage for the key and read one day's cost per model.
2. Add the same day from Neon: `pnpm --filter @repo/db-elise db:query "select model, sum(cost_usd), sum(input_tokens), sum(output_tokens), sum(cache_read_tokens) from scans where created_at::date = '2026-11-07' group by 1"`.
3. If they differ by more than a few percent, store the token counts (exact) and price them in the Worker with a table we keep, instead of trusting `cost_usd`.

Not checked yet: the estimate has never been compared with a bill.
