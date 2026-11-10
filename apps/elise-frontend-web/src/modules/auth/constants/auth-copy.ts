export const AUTH_COPY = {
  signin: {
    title: "Sign in",
    hint: "Sign in to see your repositories and security audits.",
    submit: "Sign in",
    swap: "Have an invite? Create an account",
    to: "/signup",
    forgot: "Forgot your password? Contact the person who set up your EliseLAB account.",
  },
  signup: {
    title: "Create an account",
    hint: "You need an invite code to join.",
    submit: "Create account",
    swap: "I already have an account",
    to: "/signin",
    inviteCodeHelp: "Ask the person who invited you for a code.",
    accountNameHelp: "The name of the new EliseLAB account you are creating, for example your company or team.",
    consequence: "You will own this new account, and we will sign you in.",
  },
} as const;

// -----
// The panel beside the form on wide screens: what EliseLAB does, in plain words.
// -----
export const AUTH_BRAND_COPY = {
  headline: "Security audits for your code, in plain words.",
  points: [
    { title: "Audits your repositories", text: "Connect GitHub and an AI model reads your code for security problems, private repositories included." },
    { title: "Explains every finding", text: "Each problem comes with what it means and how to fix it." },
    { title: "Checks a commit before you ship", text: "A pass, a fail, or not enough scans yet, for each commit." },
  ],
} as const;

// -----
// What a field says when it is wrong: what to type, never the rule that failed.
// -----
export const AUTH_ERRORS = {
  emailEmpty: "Enter your email address.",
  email: "Enter a valid email address, like name@company.com.",
  password: "Enter your password.",
  inviteCode: "Enter your invite code.",
  firstName: "Enter your first name.",
  lastName: "Enter your last name.",
  accountName: "Enter a name for your account.",
  tooLong: (limit: number) => `Use ${limit} characters or fewer.`,
  newPasswordTooShort: (min: number) => `Use at least ${min} characters.`,
} as const;
