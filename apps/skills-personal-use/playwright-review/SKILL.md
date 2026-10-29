---
name: playwright-review
description: Review a running web page with Playwright: visual check, console errors, failed requests, accessibility. Use when asked to review, inspect, or verify UI in the browser with Playwright, or to confirm a frontend change renders correctly.
---

# Playwright review

Review the live page through the `playwright` MCP, never from code alone.

## 1. Tools present

The `mcp__playwright__browser_*` tools must be callable (load them with ToolSearch if deferred). If none exist, install and stop until the user restarts the session:

```
claude mcp add playwright --scope project -- npx -y @playwright/mcp@latest
```

## 2. Page up

Take the URL from the user. With none given, find the dev script and port in the project's `package.json` or framework config, and start it in the background if nothing answers. `browser_navigate` to the route under review. Done when `browser_snapshot` shows the route's content, not an error or a login wall.

If navigation fails because another instance holds the browser ("browser is already in use", profile lock), call `browser_close` and retry; if it persists, kill the MCP's own process:

```
pkill -f @playwright/mcp
```

The pattern matches the MCP only, so the user's regular browser stays open.

## 3. Review

Run every pass; each ends with a finding or an explicit "clean".

- **Look**: `browser_take_screenshot` at desktop, then `browser_resize` to phone width and again. Compare against the project's design doc or style guide if one exists.
- **Console**: `browser_console_messages`; every error and warning accounted for.
- **Network**: `browser_network_requests`; every 4xx/5xx and slow request accounted for.
- **Behaviour**: drive the changed flow with `browser_click`, `browser_type`, `browser_fill_form`, `browser_press_key`; re-check console and network after each action.
- **Quality**: no Lighthouse here. Read the `browser_snapshot` accessibility tree for missing names, roles and labels, and tab through the flow with `browser_press_key` to check focus order and visible focus. Use `browser_evaluate` for anything else (e.g. contrast, overflow).
- **Design**: do the design pass in section 4.

## 4. Design pass

Read the app's `DESIGN.md` and walk it against the screenshots and snapshot: Hierarchy and space, Usability, Forms, Accessibility, and the Do's and Don'ts. Tag each finding `UI` (Hierarchy and space, Colors, Typography, Layout) or `UX` (Usability, Forms). Each section ends with a finding or "clean". `DESIGN.md` is the only source for the rules. Every rule in it is mandatory, including the Do's and Don'ts and the Known gaps (a known gap is still a violation). Report each miss as a defect, never as "something to weigh", even where DESIGN.md calls its guidelines general. A rule is exempt only after the human says so for that item; until then, list it as a violation. If the app has none, say so, and judge with Nielsen's usability heuristics and WCAG 2.2 AA.

## 5. Report

One line per finding: route, what is wrong, evidence (message, request URL, screenshot path). Fix only what the user asked for; list the rest.
