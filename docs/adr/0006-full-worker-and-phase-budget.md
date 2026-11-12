# Full worker: a lite path, a full path and a Budget cap sliced by Phase

How `apps/elise-engine-api` runs a Scan with the `full` Skill, and how the Budget cap of that Scan is shared. Terms: `apps/elise-engine-api/GLOSSARY.md` (Full worker, Phase, Partial Scan, Budget cap, Outbound handler). A Step is still cloning, auditing or saving; a Phase is a part of the audit and is never called a Step.

## Two workers inside one Worker

- **The lite path and the full path are separate.** A full Scan has its own Workflow, its own Sandbox class and its own Image. A lite Scan keeps the existing ones, and the lite Image no longer carries the full Skill. The reason: a full Scan runs for an hour or more and holds a Sandbox the whole time. On shared classes it would take the place of lite Scans and a slow full Scan would stop a person's quick check from starting.
- **It stays one Worker.** Two Workers would mean two deploys, two sets of secrets and two copies of the `Outbound` code that holds the Anthropic key. Separate classes give the isolation we need without that.
- **Limits are separate too.** Full has its own time limits (a limit for each Phase and 90 minutes in all; lite keeps 40), its own count of active Scans for each Account and a global cap for each path across all Accounts. A new Scan that meets a full cap is refused with a busy message and no queue. We do not queue because a queue hides a wait that the person cannot see and cannot cancel.
- **The request chooses the path** by its Skill field. A Scan already running finishes on the class it started on.

## The Budget cap is sliced by Phase (full only)

- **Four Phases, four runs.** A full Scan runs `recon`, `hunt`, `check` and `report` as four Detached runs. Each has its own Budget cap and its own meter in the `Outbound` handler, which refuses a new model call when that Phase's slice is empty. A lite Scan stays one run with one cap.
- **The slices are provisional shares:** 10, 55, 25 and 10 percent, in one config object. They are guesses until the measurement ticket (#69) replaces them with what real repos cost.
- **Spare money passes forward.** Money left after `recon` goes to `hunt`, and money left after `hunt` goes to `check`. A Phase that finishes cheap never wastes its slice, and a Phase that runs dry does not borrow from the next one.
- **The report slice is fixed.** It never gives money to an earlier Phase and never takes from one. A Scan that spent everything on hunting and checking would otherwise end with no Report, and the Report is what the person reads.
- **At most 3 sub-agents at a time** in `hunt` and `check`. `recon` and `report` use one Agent with no sub-agents. The cap is on parallel calls in flight, because that is what lets a Phase pass its slice before the meter reacts.
- **A phase reads its state from the files the Skill already writes**, so a Phase can start on its own with no memory of the one before.

## A capped Scan is a Partial Scan

A full Scan that runs out of money in `hunt` or `check` still ends with a Report and a findings file. Both say it is partial and name the units that were not covered. It is charged only what was metered. The reason: an error with no Report loses the money already spent and tells the person nothing. A partial Report with its gaps named is something a person can act on, and they can start a second Scan for what was missed. Whether a Partial Scan counts toward a Verdict is settled in #66, and a partial one must never count as passing.

## Who may run a full Scan

- **Everyone may run full Scans.** There is no Plan that is locked out of the Skill.
- **On the platform's key it is behind a switch, off at first.** While the switch is off, a platform-key full request is refused with a clear message, and a Bring your own key Scan or a Runner Scan works. The switch goes on only after the measurement (#69) has set the full ceiling and the minimum cap, because a full Scan costs far more than a lite one and a wrong guess is paid by us, not by the person.
- **Tenant isolation is checked before the switch.** Row-level security on the remaining tenant tables and the two-Account test (#60) must pass first. Full Scans keep more of a customer's code in one place for longer, so a leak between Accounts costs more.
- **Runners follow later.** A Runner has no `Outbound` handler, so it cannot meter a Phase by itself. It will run the same four Phases, with each slice sent by the server, after the worker is measured (#72).

## Not built here

- The numbers: slices, the full ceiling, the minimum cap, the time limits and the caps are set by the tickets that build them, and the measurement ticket replaces the provisional ones.
- Phase costs and a Partial badge in the dashboard (#67).
