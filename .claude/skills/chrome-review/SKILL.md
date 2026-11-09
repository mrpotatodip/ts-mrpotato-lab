---
name: chrome-review
description: Review a running web page in Chrome DevTools: visual check, console errors, failed requests, performance, accessibility. Use when asked to review, inspect, or verify UI in the browser, or to confirm a frontend change renders correctly.
---

# Chrome review

Review the live page through the `chrome-devtools` MCP, never from code alone.

## 1. Tools present

The `mcp__chrome-devtools__*` tools must be callable (load them with ToolSearch if deferred). If none exist, install and stop until the user restarts the session:

```
claude mcp add chrome-devtools --scope project -- npx -y chrome-devtools-mcp@latest
```

## 2. Page up

Take the URL from the user. With none given, find the dev script and port in the project's `package.json` or framework config, and start it in the background if nothing answers. `navigate_page` to the route under review. Done when `take_snapshot` shows the route's content, not an error or a login wall. On the Elise dashboard a login wall means the MCP's Chrome profile has no `elise_session` cookie (it lasts 7 days): ask the user to sign in once in that window, then continue. Never ask for or type their password.

If navigation fails because another instance holds the browser ("already running", profile lock), kill that instance and retry:

```
pkill -f chrome-devtools-mcp
```

The pattern matches the MCP's own Chrome profile, so the user's regular Chrome stays open.

Reload a signed-out or isolated tab after any server restart: it keeps the 500 it saw while the server was down.

Work in your own tab: `new_page` with the URL, then pass its `pageId` to every call. The person may be using the shared window and will navigate it under you. The `measure.js` result carries `path` and `theme`, so a measurement of the wrong page shows at once.

The Elise dashboard has three themes (`default`, `daylight`, `moonlight`). Review each: `localStorage.setItem('elise.theme', '<name>')` then reload the page, and read `theme` in the `measure.js` result to confirm it took.

A page that answers 500 hides its cause in the server's log, and the log file is whichever one the running server's stdout points to. Find it with `lsof -p $(lsof -ti tcp:3100 | head -1) | grep ' 1w'` (port 3100 is the dashboard), then read its tail. On the Elise dashboard the log names the failing engine call (`engine: GET /scans answered 500`).

Drive a Base UI select (`role=combobox`) with the keyboard: `click` the combobox by a uid from the latest snapshot, press `Home`, `End` or `ArrowDown`, then `Enter`. Option clicks time out and uids go stale after every open, so take a fresh `take_snapshot` before the next control. Confirm the choice by reading the trigger with `evaluate_script` (`document.querySelector('#id').innerText`) before submitting.

## 3. Review

Keep output small. Judge a long list from a screenshot and Lighthouse, and take `take_snapshot` only on short pages. Save any screenshot or snapshot with `filePath` inside the repo, in the gitignored `.review/` directory: the tools refuse paths outside the workspace.

Run every pass; each ends with a finding or an explicit "clean".

- **Look**: `take_screenshot` at desktop, then `resize_page` to phone width and again. Compare against the project's design doc or style guide if one exists. A full-page screenshot draws a sticky sidebar and top bar over the middle of the page: crop one region with `uid`, or take the viewport.
- **Measure**: pass `measure.js` (next to this file) as the `function` of `evaluate_script`. It returns the type sizes, contrast under 4.5:1, paragraph line height and length, targets under 24px and heading gaps. A design finding about size, space or contrast cites these numbers. `needsEyes.textOnGlass` counts the text on translucent surfaces, whose contrast the script cannot see: an empty `contrastBelow4_5` does not clear it. Read those on the screenshot, in every theme.
- **Console**: `list_console_messages`; every error and warning accounted for.
- **Network**: `list_network_requests`; every 4xx/5xx and slow request accounted for.
- **Behaviour**: drive the changed flow with `click`, `fill`, `press_key`; re-check console and network after each action.
- **Quality**: `lighthouse_audit` for accessibility; add a performance trace only when the change touches load or rendering.
- **Design**: do the design pass in section 4.

## 4. Design pass

Read the app's `DESIGN.md`, and the files it points to for the screen under review, and walk them against the screenshots, the snapshot and the `measure.js` numbers: Hierarchy and space, Usability, Forms, Accessibility, and the Do's and Don'ts. Tag each finding `UI` (Hierarchy and space, Colors, Typography, Layout) or `UX` (Usability, Forms). Each section ends with a finding or "clean". `DESIGN.md` is the only source for the rules. Every rule in it is mandatory, including the Do's and Don'ts and the Known gaps (a known gap is still a violation). Report each miss as a defect, never as "something to weigh", even where DESIGN.md calls its guidelines general. A rule is exempt only after the human says so for that item; until then, list it as a violation. If the app has none, say so, and judge with Nielsen's usability heuristics and WCAG 2.2 AA.

## 5. Report

One line per finding: route, what is wrong, evidence (message, request URL, screenshot path). Fix only what the user asked for; list the rest.
