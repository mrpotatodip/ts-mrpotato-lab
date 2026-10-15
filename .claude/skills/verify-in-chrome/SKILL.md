---
name: verify-in-chrome
description: Drive the running app in Chrome DevTools to check this session's changes work in the browser.
disable-model-invocation: true
---

# Verify in Chrome

Check the changes of this session against the real app through the `chrome-devtools` MCP. Tests prove the code; this proves the page.

The `chrome-devtools` tools are deferred: load the ones you use with one `ToolSearch` call (`select:mcp__chrome-devtools__take_snapshot,mcp__chrome-devtools__take_screenshot,...`) before the first call.

## 1. List the observables

Read `git diff main...HEAD`, `git status` and the conversation. Write one line per user-visible behaviour the session changed: `route → action → expected result`.

Done when every changed component, route, or endpoint the UI calls appears in a line, or is named as having no browser-visible effect.

## 2. Bring the app up

Probe each port the observables need (`curl -s -o /dev/null -w '%{http_code}' http://localhost:<port>/`). Start every server that does not answer with its per-app dev command from `CLAUDE.md`, in the background, and poll until it answers.

Done when every needed server answers.

## 3. Open the page

`list_pages`, then `navigate_page` the selected page to the first route. A redirect to `/signin` means the session is signed out: ask the user to sign in on that page, wait for them, and continue once the dashboard loads. Credentials come from the user only.

## 4. Observe each line

For each observable: `take_snapshot`, perform the action with the snapshot `uid`s, `take_snapshot` again, and compare with the expected result. Cover each changed viewport with `resize_page` (desktop and mobile when layout changed) and each theme with `emulate colorScheme` when styling changed.

After the last action on each route, read `list_console_messages` (types `error`, `warn`) and `list_network_requests` (`fetch`, `xhr`), and open any failed request with `get_network_request`.

Done when every line from step 1 has a verdict backed by evidence: a snapshot fact, a screenshot, a console message, or a request status.

## 5. Report

One table: observable, verdict (pass / fail / not reached), evidence. Follow with the console errors and failed requests found, including ones outside the changed code. Mark every line that could not be reached as `not reached` with the blocker.

Hand failures back with a proposed fix and wait for the user's go-ahead before editing code.
