# Private repos: a GitHub App, and the key stays outside the Container

How a Scan reads a private GitHub repo in `apps/elise-engine-api`. Terms: `apps/elise-engine-api/GLOSSARY.md` (Install, Outbound handler, Allowlist). GitHub only; GitLab is not built.

## The rule

**The Container never holds a GitHub credential.** It clones `https://github.com/owner/name` with no password. The Outbound handler adds the credential, outside the Container, to the one request that reads that Scan's own repo. The Agent reads untrusted code and can be steered by it, so a key it never held cannot be leaked.

## Auth model

- **A GitHub App with `Contents: read` and `Metadata: read`.** Not OAuth `repo` scope (read and write on everything the person can reach), and not a pasted token (a long-lived secret in our database).
- **Nothing secret is stored per customer.** The `github_installations` row holds IDs and a status. The App's private key (`GITHUB_APP_PRIVATE_KEY`, PKCS#8 PEM) and `GITHUB_APP_ID` are Worker Secrets. `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` serve the install check below.
- **An Install belongs to one Account.** The unique index on `(provider, installation_id)` refuses a second claim. A removed Install keeps its row, so old Scans keep their link.
- **`provider` is on the Install and the Repo** (`github` only), so another host is an addition, not a rewrite.

## Connecting

- Only a `tenant_admin` connects or disconnects. Any member reads the status and the repo list.
- **The number in the redirect address proves nothing.** The flow signs a `state` (account, admin, 10 minutes). GitHub returns a one-time `code` because "Request user authorization during installation" is on. The Worker trades it for a token that acts as the person, asks GitHub which Installs that person can use, and drops the token. An Install not on that list is refused. A `state` made for another admin or Account is refused.
- A required checkbox says code excerpts go to Anthropic. Its time and the admin are in the Audit trail (`github.install.connected`, `github.install.removed`).
- No webhook. The list of Installs asks GitHub again when a check is over five minutes old, so a removed or suspended Install shows as such. If GitHub cannot answer, the status stays.
- Disconnect marks the row `removed`. It cannot take access away on GitHub; the dialog says where.

## At a Scan

- Create-scan asks GitHub which Install covers the repo, then uses it only if it is an **active Install of the same Account**. Otherwise the clone is anonymous, as for any public repo. If GitHub's lookup is down, the Scan also goes on anonymously, so a public Scan never waits on the GitHub API.
- The Scan saves `installation_id`, `github_repo_id` and `is_private` at that moment. A composite foreign key on `(installation_id, tenant_id)` makes another Account's Install impossible. The Repo keeps the last answer for display.
- The Workflow hands the Sandbox only the install, repo ID and `owner/name`. For each GitHub request the Outbound handler makes a one-hour token **limited to that repo** with `contents: read`, and signs only when the path names that same repo. Nothing is stored in props, Durable Object storage or logs. A failed token blocks the clone, so the Scan fails.
- The Allowlist already passes only `info/refs` and `git-upload-pack`, so a leaked header could not push.

## Reads

- The repo picker and the branch dropdown read GitHub live (first 100 repos per Install, first 100 branches). Our database keeps what the person chose (Repos and tracked Branches), not a catalogue: it would go stale with no webhook and hold private names nobody chose. Branch rules are unchanged (ADR 0004).

## Not built

- `repo_not_accessible`: a failed clone still ends with the clone's own error.
- Paging past 100 repos or branches; search-as-you-type for branches.
- GitLab. It has no App model, so it needs a stored secret per connection, an Allowlist entry per self-hosted host, and a repo name that allows `group/subgroup/name`.
- The Files list shows no private marker.
