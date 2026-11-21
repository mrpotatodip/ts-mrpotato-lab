// -----
// The one reviewed list of the owner role: every source file that
// opens the owner connection (dbConnect, poolConnect, withPool,
// or the client's createDb and createPoolDb) or reads
// DATABASE_URL, with how many uses it has and why it cannot run
// as one Account through withTenant. The owner role bypasses
// row-level security, so each of these queries keeps its own
// Account filter. A file's uses must equal its count, a file that
// no longer uses the owner
// connection must leave the list, and a new entry needs a reason
// a reviewer accepts. Every tenant route runs through withTenant.
// -----
export const OWNER_CONNECTION_USES = {
  "lib/app-deps.ts": {
    uses: 8,
    reason:
      "The membership checks read a person's Roles across Accounts before one is chosen; a Runner token names the Runner, and only the Runner row names its Account; Stripe's webhook has no session, so only the event names its Account",
  },
  "lib/auth.ts": { uses: 2, reason: "better-auth reads users and sessions before any Account is known" },
  "lib/db-connection.ts": { uses: 3, reason: "Defines the owner connections the other entries open" },
  "modules/archives/api/run-upload-retention.ts": {
    uses: 2,
    reason: "The daily cron has no request and no Account: the upload retention sweep crosses Accounts, and touches only upload rows",
  },
  "modules/email/lib/consume-emails.ts": { uses: 4, reason: "The queue consumer has no request and no session: it passes the connection to the lookup of names" },
  "modules/email/lib/load-runner-names.ts": { uses: 1, reason: "The queue consumer has no request: it reads names of one Runner, one Login and one Account, each filtered by an ID from the message" },
  "modules/email/lib/record-invite-status.ts": {
    uses: 3,
    reason: "The queue handler has no request and no Account: it records one invite's email status, filtered by the invite's ID",
  },
  "modules/me/api/get-me.ts": { uses: 2, reason: "Lists the Accounts a person belongs to, across Accounts" },
  "modules/runners/api/claim-job.ts": { uses: 2, reason: "A Runner token names the Runner, and only the Runner row names its Account" },
  "modules/runners/api/disconnect-runner.ts": { uses: 2, reason: "A Runner token names the Runner, and only the Runner row names its Account" },
  "modules/runners/api/lookup-runner-login.ts": { uses: 2, reason: "A user code names a login before any Account is chosen" },
  "modules/runners/api/check-runner-login.ts": { uses: 2, reason: "A device code is looked up before its Account is known" },
  "modules/runners/api/start-runner-login.ts": { uses: 2, reason: "A Runner starts a login with no session and no Account" },
  "modules/runners/api/enroll-runner.ts": { uses: 2, reason: "A pairing code is looked up before its Account is known" },
  "modules/runners/api/job-archive.ts": { uses: 2, reason: "A Runner token names the Runner, and only the Runner row names its Account; the zip is served only for the job that Runner claimed" },
  "modules/runners/api/job-state.ts": { uses: 2, reason: "A Runner token names the Runner, and only the Runner row names its Account; the state is read only for a job that Runner holds" },
  "modules/runners/api/report-job.ts": { uses: 2, reason: "A Runner token names the Runner, and only the Runner row names its Account" },
  "modules/runners/api/runner-me.ts": { uses: 2, reason: "A Runner token names the Runner, and only the Runner row names its Account" },
  "modules/scan-records/handlers/record-scan-svc.ts": { uses: 4, reason: "A Workflow step with no request: records the finished Scan, its files and findings, filtered by the Scan's Account" },
  "modules/scan-records/types/scan-records-types.ts": { uses: 1, reason: "The env type of record-scan, which the Workflow passes" },
  "modules/scan-workflow/lib/full-scan-workflow.ts": {
    uses: 8,
    reason: "Workflow steps with no request: mark the Scan, read the priors and the sealed key, drive a Runner job, write its Trace entries, each filtered by the Scan's Account",
  },
  "modules/scan-workflow/lib/settle-scan-credit.ts": { uses: 4, reason: "A Workflow step with no request: reads the Plan and settles the Scan's credit hold for the Scan's Account" },
  "modules/sign-up/api/create-account.ts": { uses: 2, reason: "Creates the Account, so none exists to run as yet" },
  "modules/team/api/accept-team-invite.ts": { uses: 2, reason: "An invite token is looked up before its Account is known" },
  "modules/team/api/preview-team-invite.ts": { uses: 2, reason: "An invite token is looked up before its Account is known" },
  "types/variables.ts": { uses: 1, reason: "Declares the DATABASE_URL binding" },
} satisfies Record<string, { uses: number; reason: string }>;
