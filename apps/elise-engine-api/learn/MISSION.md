# Mission: Understand and operate the elise-engine-api MVP

## Why
You are a junior developer. You will own and extend a small Cloudflare service that clones a GitHub repo into a throwaway sandbox, runs an AI security review, and saves a report. You must be able to explain each part, run a scan safely, and debug it when it breaks.

## Success looks like
- You can name the parts of the MVP and say what each part does.
- You can follow one scan from request to saved report, step by step.
- You can explain why the API key never enters the container, and what the allowlist blocks.
- You can set the cost limits for a scan and say what each limit does.
- You can find the cause of a hung scan with `wrangler tail` and the container list.
- You can read a report and say which findings need a human check.

## Constraints
- Short lessons. One idea and one quiz per lesson.
- Simple Technical English (ASD-STE100), with terms from `GLOSSARY.md`.
- Every lesson has a diagram.
- Facts come from `RESOURCES.md` or from the code in this folder.

## Out of scope
- Writing new security skills.
- Private repos, async scans, and CI deploy (planned, not built).
- Anthropic AI Gateway and Cloudflare billing (we did not choose them).
