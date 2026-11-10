// -----
// What the person agrees to before an install is saved. The engine
// refuses the save unless the checkbox for it was ticked.
// -----
export const GITHUB_NOTICE =
  "While a scan runs, Elise reads the repository and sends code excerpts to Anthropic, the company that makes Claude, to look for security problems. Elise can only read code: it cannot change it. Connect only repositories you are allowed to share this way.";

// -----
// For an install the engine has not checked yet, so it has no address
// of its own to send the person to.
// -----
export const GITHUB_INSTALLATIONS_URL = "https://github.com/settings/installations";

export const GITHUB_NOT_CONNECTED = "Connect GitHub so Elise can scan your private repositories. Public repositories need no connection.";
export const GITHUB_ASK_ADMIN = "Private repositories need GitHub to be connected. Ask an admin of this account to connect it.";
