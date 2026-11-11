# Sources

Reach for this when a finding needs a source, or a criterion's pass condition is unclear. Cite the source by name in the finding.

## Design

- **WCAG 2.2, level AA** (w3.org/TR/WCAG22): testable pass or fail rules for contrast, target size, focus, labels and keyboard use. A violation is a finding with the success criterion number.
- **Nielsen's ten usability heuristics** (nngroup.com): the checklist for judgement calls. Error prevention, recognition over recall, and help with recovering from errors are the ones `DESIGN.md` does not spell out.
- **ISO 9241-110** dialogue principles: self-descriptiveness, error tolerance, suitability for the task. Paywalled; NN/g summarises them.
- **Design systems**, for patterns and never for a score: GOV.UK Design System (the most tested; the model for error messages and forms), GitHub Primer and Atlassian (closest to a developer tool), Apple HIG and Material 3 (component detail). Each is tuned to its own product.

## Junior and Layperson

- **plainlanguage.gov** (the US federal guidelines) and **GOV.UK content design**: short sentences, common words, the point first. The source for L1 and L3.
- **NN/g on error messages**: say what happened, why, and what to do next, in words. The source for J3 and every error state.
- **NN/g heuristics 2 and 4** (match between system and the real world; consistency and standards): the source for J6 and L6. One name per thing, in the reader's words, on every screen.
- No standard exists for "informative to a junior developer". J1 to J5 are this skill's own criteria, and so are the parts of J6 and L6 about units, time zones and hover-only help.

## Rating instruments

- **Nielsen's severity scale** (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe): the scale behind the severity table in `SKILL.md`.
- **SUS** (System Usability Scale, average about 68) and **UMUX-Lite**: short questionnaires for real users. A reviewer cannot fill them in; they are the next step when a rating needs proof.

## What the ratings are

A rating measures this rubric against the screen. It is a heuristic review: it finds rule violations well and cannot find where a real person gets lost. 9.5 has no meaning outside this skill; it compares a screen with itself before and after. Laws of UX and Refactoring UI are opinion, not research: use them to explain a finding, never to score one. Where two sources disagree (density against whitespace, say), `DESIGN.md` decides.
