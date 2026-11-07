# elise-engine-api Resources

All links below were opened and read in the session that wrote this workspace.

## Knowledge

- [Cloudflare Sandbox SDK docs](https://developers.cloudflare.com/sandbox/)
  Official guide to running code in sandboxes on Workers. Use for: how a sandbox starts, runs commands, and reads files.
- [Build a coding agent runner (Cloudflare)](https://developers.cloudflare.com/sandbox/get-started/build-a-coding-agent-runner/)
  Tutorial that runs Claude Code on a GitHub repo in a sandbox. Our code follows it. Use for: the detached run, the outbound handler, and the image.
- [Cloudflare Containers: limits and instance types](https://developers.cloudflare.com/containers/platform-details/limits/)
  The table of instance types (vCPU, memory, disk) and account limits. Use for: choosing the container size.
- [What are Durable Objects?](https://developers.cloudflare.com/durable-objects/what-are-durable-objects/)
  Official definition and storage model. Use for: why each scan has its own named object.
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
  Object storage with no egress fees. Use for: where reports are saved.
- [Run Claude Code programmatically (`claude -p`)](https://code.claude.com/docs/en/headless)
  Official guide to print mode, exit codes, output formats, and permissions. Use for: how the agent runs without a person.
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
  All flags, such as `--model`, `--effort`, and `--max-budget-usd`. Use for: checking a flag before you use it.
- [cloudflare/sandbox-sdk on GitHub](https://github.com/cloudflare/sandbox-sdk)
  Source and examples, including `examples/coding-agents`. Use for: reading a working example when the docs are short.

## Wisdom (Communities)

None vetted yet. See Gaps.

## Gaps

- No community is vetted. Candidates to check before you add them: the Cloudflare Developers Discord and the Cloudflare community forum.
- No source yet for how to judge AI security findings (false positives and false negatives). Find one before lesson 7 is final.
- The Wrangler CLI docs are not in this list. Add them when you need exact command flags.
