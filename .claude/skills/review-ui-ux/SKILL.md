---
name: review-ui-ux
description: Rate a screen's UI/UX, how well it informs a junior developer, and how well it informs a non-technical user. Fix until each rating reaches 9.5/10, re-rate cold, and report before and after.
disable-model-invocation: true
---

# Review UI/UX

Three ratings out of 10, taken **before** any change and again **after**: **Design** (UI/UX best practice), **Junior** (a developer new to security work, reading a result to act on it), **Layperson** (someone who does not write code, deciding whether the product is safe to ship). The goal is 9.5 or higher on all three, on every screen.

## 1. Evidence

Take the route(s) from the user, and the widths they name (default: desktop). Run `chrome-review` on each route and save its screenshots, `measure.js` numbers, console, network and Lighthouse results under `.review/review-ui-ux/`.

Record `git diff --stat` and `git status --short` in `.review/review-ui-ux/start-diff.txt` before any run step, because the tree may already hold other work.

Done when every route has a screenshot, a snapshot, the measurements and the start-diff file. Every score below cites one of these.

## 2. Rubric

A **finding** cites evidence: a screenshot path, a measured number, or quoted on-screen text. A finding that names a rule also cites its source, listed in `SOURCES.md`. A finding with no evidence is not scored. A finding that depends on what is deployed (a field or count the screen should show) is confirmed with `pnpm engine:probe <path>` first; with no token in the environment, list it as unverified and not as a defect of the screen.

Each criterion starts at 10 and loses points per finding on it, with a floor of 1:

| Severity | Meaning | Nielsen scale | Loses |
|---|---|---|---|
| blocker | the reader cannot finish the task, or is misled | 4 | 3 |
| major | the reader stalls or makes a mistake | 3 | 1.5 |
| minor | polish | 1 or 2 | 0.5 |

A **rating** is the mean of its criteria, to one decimal. A rating fails when any criterion is under 7, whatever the mean.

**Design** has twelve criteria, so before and after scores compare: D1 to D10 are the ten items of "Design standard" in `DESIGN.md` (each judged with the screen's entry in `DESIGN-SCREENS.md`), D11 is WCAG 2.2 AA and D12 is Nielsen's ten heuristics. Every rule in each is mandatory. Where they disagree, `DESIGN.md` decides. `DESIGN.md` accepts a screen at 9; this skill's 9.5 is the bar.

**Junior** and **Layperson** are a **cold read**, a cognitive walkthrough of what is on screen: the reader sees the snapshot text and screenshot, never the code. Each criterion quotes the on-screen text that passes or fails it; without a quote it cannot score 10.

| Junior criterion | Passes when |
|---|---|
| J1 Orientation | the first view says what the screen is and what to do next |
| J2 Terms | each domain or security term is explained on screen, or one hover or click away |
| J3 Cause and fix | each finding, error and failed state says what happened, why, and how to fix it, with an example or link |
| J4 Consequence | each action says what it will do, what it costs and whether it can be undone, before it runs |
| J5 Traceability | each number and status points to its source: the scan, commit or file |
| J6 Labels and help | each column, field and control says what it holds and how to use it, in the same words as on every other screen; a hint sits next to anything a first-time reader could misread (a unit, a time zone, a filter) |

| Layperson criterion | Passes when |
|---|---|
| L1 Plain words | the main text has no identifiers, file names, enum values or jargon |
| L2 Meaning | each colour, badge and number says what it means for the business, in a sentence |
| L3 Next step | each screen, empty state and error names the one thing to do next, and it needs no developer |
| L4 Safety | each costly, irreversible or outward-facing action says so and asks to confirm |
| L5 Reassurance | when nothing is wrong, the screen says so in words and is not blank |
| L6 Words match | one plain name per thing across screens (the same column is not "Scan" on one page and "Status" on another), and the answer to "what is this?" is on the screen, not only behind a hover |

`DESIGN.md` "Form copy" rules count toward L1 and L3. Check L1, L3 and every error message against the writing guidance in `SOURCES.md`.

## 3. Rate before

Score all three ratings for every route and save `.review/review-ui-ux/<route>-before.md`: each criterion's score, each finding (severity, evidence), and the three means.

Done when every criterion of every rating has a score and a finding or "clean", and `git diff --stat` matches `start-diff.txt`.

## 4. Raise to the goal

Fix findings worst first: blockers, then majors, then minors. After each round, re-run step 1 and re-score. Put the words a person reads in the module's constants, so one edit changes them everywhere.

Stop when all three ratings reach 9.5 with no criterion under 7, or when a round raises none of them. A stalled run lists what blocks it: a decision for the user, an engine change, missing data.

Edit code on the current branch. Another session may edit the same files: re-read a file before each Edit, and re-run step 1 on the final state, since a file can change after your last check. Leave commits, pushes and deploys to the user. A fix that needs an engine or contract change ships backend first (`docs/standards/contracts.md` section 5): write the code and tests, and say it needs a deploy.

## 5. Rate after

Re-score **cold**, from fresh evidence taken after the last fix, never from the before file or the diff: a rater who made the fix scores it high. Running this skill is the user's request for one rater subagent: spawn it, and hand it the rubric and the live URL only. If no subagent can run, mark every "after" score "self-scored" in the file and the report, and do not say the goal is met. Save `.review/review-ui-ux/<route>-after.md` in the same form.

Done when every criterion has a new score and each rating shows its change.

## 6. Report

One table, a row per route: Design, Junior and Layperson as `before → after`, with ✓ when the goal is met. Under it, one line per remaining finding: route, what is wrong, evidence. Say the goal is met only when all three ratings reach 9.5 on the cold re-score. End with the line "Heuristic review, not user-tested: the ratings compare this screen with itself, and real users are the next check."
