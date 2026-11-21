# A running Scan sends its verified Findings early

How a running Runner Scan shows its Findings before it ends (#318, #319). Terms: `apps/elise-engine-api/GLOSSARY.md` (Finding, Live finding). The Trace rule it sits next to: `docs/adr/0009-trace-labels-only.md`.

## The rule

**A running Runner Scan may send a Finding record once a verifier has decided it `confirmed` or `needs_validation`. Nothing else leaves the Runner early.** A `rejected` record, a hunt candidate and anything from the ledger never go. The record is the one the final result carries, parsed with the same schema (`ConfirmedFindingRecordSchema` and `NeedsValidationFindingRecordSchema` in `@repo/contracts/elise`). The Trace is unchanged: labels only.

## Why

- The result already sends these records, with their evidence and fix. Sending them minutes earlier exposes nothing new to the engine; it only lets a person start on a confirmed problem before a long Scan ends.
- A verifier's decision is the line between a guess and a Finding. Records before it are noise a person should not read.

## What it keeps

- **`POST /runners/jobs/:scanId/findings`** upserts `scan_findings` by the Scan and the record's fingerprint. It answers 404 for a Scan the Runner does not hold and 409 for a Scan that is not `running`, and writes nothing in either case.
- **The final result replaces every live row** (the result keeps its clear-then-insert), so a record the last check changed or dropped does not linger.
- **A stopped or failed Scan drops its live rows** in the same step that ends it.
- **Readers ignore them.** Branch findings, the Findings page, the Verdict and the Overview read only succeeded Scans. The Scans list counts rows by Scan, so a running Scan's counts grow.
- **Hidden decisions.** Triage, Comments and Discussion wait until the Scan succeeds.
- **Capture never fails or slows a Scan.** The Runner drops a batch that fails. The engine caps a Scan at 1,000 live rows and a batch at 200 records, and drops new fingerprints past the cap.
- **Tenant isolation is the table's.** Rows are under the same row-level security as every `scan_findings` row.

## What would change it

Sending a rejected record, a candidate or any text the verifier did not decide is a new decision with its own review of what leaves the customer's repository. It does not follow from this one.
