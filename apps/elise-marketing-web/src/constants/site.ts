export const SITE = {
  name: "EliseLAB",
  title: "Security audits for your repositories · EliseLAB",
  description: "Connect a GitHub repository and an AI model reads its code for security flaws. Each finding comes with a fix. Each commit gets a pass or a fail.",
  appUrl: "https://app.eliselab.com",
} as const;

export const STEPS = [
  { title: "Connect a repository", text: "Paste a GitHub URL or connect your account. Private repositories work too." },
  { title: "Elise audits the code", text: "The repository is copied into a locked-down temporary workspace, and an AI model reads the code there." },
  { title: "Read the report", text: "Each finding comes with its file, what it means and a fix." },
] as const;

export const FEATURES = [
  { title: "Reads the source", text: "Elise reads the code in your repository, including private repositories you connect." },
  { title: "A fix with every finding", text: "You get the change to make, next to the problem." },
  { title: "Pass or fail for each commit", text: "A commit is one saved change to your code. Check one before you ship it. With too few scans, Elise says \"not enough scans\" instead of guessing." },
] as const;

export const EXAMPLE_FINDING = {
  label: "Example",
  severity: "High",
  title: "A search box can read other people's data",
  file: "src/routes/search.ts:42",
  seriousness: "High means fix it before you ship.",
  meaning: "The search term goes straight into a database query, so a crafted term can read or change other rows.",
  fix: "Send the term to the database as a parameter, not as part of the query text.",
} as const;