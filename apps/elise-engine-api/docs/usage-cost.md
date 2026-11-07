# Scan usage and cost

Where the numbers come from, and how to check them.

- The agent runs with `--output-format json`. When it ends it prints one report with its token counts, `total_cost_usd`, turns and duration. The Worker saves it as-is (`parseAgentUsage`).
- Token counts are the model API's own counts. `cost_usd` is the Claude Code CLI's estimate at the list price in its built-in table, not an invoice. A model newer than the installed CLI may be priced wrongly. Cache reads and writes are priced apart from plain input.
- A scan that times out, or fails before the agent starts, has no usage (null). It still counts against the budget through its reserved cap while it runs.

## Check the estimate

1. In the Anthropic Console, open Usage for the key and read one day's cost per model.
2. Add the same day from Neon: `pnpm --filter @repo/db-elise db:query "select model, sum(cost_usd), sum(input_tokens), sum(output_tokens), sum(cache_read_tokens) from scans where created_at::date = '2026-11-07' group by 1"`.
3. If they differ by more than a few percent, store the token counts (exact) and price them in the Worker with a table we keep, instead of trusting `cost_usd`.

Not checked yet: the estimate has never been compared with a bill.
