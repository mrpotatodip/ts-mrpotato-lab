export const SITE = {
  name: "EliseLAB",
  title: "EliseLAB: security audits for your repositories",
  description: "Connect a GitHub repository and an AI model reads the code for security flaws. Every finding comes with the fix, and every commit gets a pass or a fail.",
  appUrl: "https://app.eliselab.com",
} as const;

export const STEPS = [
  { title: "Connect a repository", text: "Paste a GitHub URL or connect your account. Private repositories work too." },
  { title: "Elise audits the code", text: "The repository is cloned into an isolated sandbox and an AI model reads it for security problems." },
  { title: "Read the report", text: "You get a report with every finding, what it means and what to change." },
] as const;

export const FEATURES = [
  { title: "Reads your code, private repos included", text: "Elise looks at the source itself, not just a dependency list." },
  { title: "Shows the fix with every finding", text: "Each finding says what it means and what to change." },
  { title: "Marks each commit pass or fail", text: "Check before you ship. With too few scans, it says \"not enough scans\" instead of guessing." },
] as const;

export const EXAMPLE_FINDING = {
  severity: "High",
  title: "User input reaches a SQL query unescaped",
  file: "src/routes/search.ts:42",
  meaning: "A search term is joined into the query string, so a crafted term can read or change other rows.",
  fix: "Pass the term as a query parameter instead of building the string.",
} as const;
