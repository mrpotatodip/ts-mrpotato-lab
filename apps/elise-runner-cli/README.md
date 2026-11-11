# elise-runner-cli

EliseLAB Runner is a small desktop app (Tauri 2, Rust and TypeScript) that runs a scan on your own computer. You pair it with an EliseLAB account using a one-time code. When someone starts a scan and picks this computer, the app clones the repo, runs `claude` on it locally, and sends the report back to EliseLAB.

## What you need

- Claude Code installed and signed in on the computer. The app looks for `claude` in the usual places, then asks a login shell.
- The app kept open while a scan runs.
- A pairing code. Add a runner in EliseLAB to get one. A code works once and expires after 10 minutes.

## How it is built

The page never holds the API token. Rust keeps it in the system keychain and makes every call to EliseLAB. The page asks Rust through Tauri commands in `src/api.ts` and draws what comes back.

| Path | What it is |
| --- | --- |
| `src/` | The page: `main.ts`, `views.ts`, `api.ts` (the Tauri commands), `copy.ts` (every string the user reads). |
| `src-tauri/src/runner.rs` | Pairing, unpairing and the keychain. |
| `src-tauri/src/jobs.rs` | The work loop: clone, run `claude` with a fixed tool allowlist, validate the output, upload. |

The runner status is one of `unpaired`, `revoked`, `offline` or `connected`. The activity is `idle`, `running` or `finished`.

## Run it

```bash
pnpm --filter elise-runner-cli app:dev     # tauri dev
pnpm --filter elise-runner-cli app:build   # tauri build
pnpm --filter elise-runner-cli check       # tsc --noEmit
```

You need a Rust toolchain for `app:dev` and `app:build`. `check` only type-checks the TypeScript and does not touch Rust.
