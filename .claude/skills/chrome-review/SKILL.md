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

Take the URL from the user. With none given, find the dev script and port in the project's `package.json` or framework config, and start it in the background if nothing answers. `navigate_page` to the route under review. Done when `take_snapshot` shows the route's content, not an error or a login wall.

If navigation fails because another instance holds the browser ("already running", profile lock), kill that instance and retry:

```
pkill -f chrome-devtools-mcp
```

The pattern matches the MCP's own Chrome profile, so the user's regular Chrome stays open.

## 3. Review

Run every pass; each ends with a finding or an explicit "clean".

- **Look**: `take_screenshot` at desktop, then `resize_page` to phone width and again. Compare against the project's design doc or style guide if one exists.
- **Console**: `list_console_messages`; every error and warning accounted for.
- **Network**: `list_network_requests`; every 4xx/5xx and slow request accounted for.
- **Behaviour**: drive the changed flow with `click`, `fill`, `press_key`; re-check console and network after each action.
- **Quality**: `lighthouse_audit` for accessibility; add a performance trace only when the change touches load or rendering.
- **Design**: do the design pass in section 4.

## 4. Design pass

Read the app's `DESIGN.md` and walk it against the screenshots and snapshot: Hierarchy and space, Usability, Forms, Accessibility, and the Do's and Don'ts. Tag each finding `UI` (Hierarchy and space, Colors, Typography, Layout) or `UX` (Usability, Forms). Each section ends with a finding or "clean". `DESIGN.md` is the only source for the rules. Every rule in it is mandatory, including the Do's and Don'ts and the Known gaps (a known gap is still a violation). Report each miss as a defect, never as "something to weigh", even where DESIGN.md calls its guidelines general. A rule is exempt only after the human says so for that item; until then, list it as a violation. If the app has none, say so, and judge with Nielsen's usability heuristics and WCAG 2.2 AA.

## 5. Report

One line per finding: route, what is wrong, evidence (message, request URL, screenshot path). Fix only what the user asked for; list the rest.
