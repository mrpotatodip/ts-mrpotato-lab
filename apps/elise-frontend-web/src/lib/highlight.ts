import { createHighlighter } from "@tanstack/highlight/core";
import { ts } from "@tanstack/highlight/languages/ts";
import { createThemeCss } from "@tanstack/highlight/theme";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

const highlighter = createHighlighter({ languages: [ts] });

// -----
// GitHub Light, with the colours that fall under 4.5:1 on our grey panels
// darkened just enough to clear 4.8:1 on both white and the panel grey.
// -----
const readableTheme = {
  ...githubLightTheme,
  tokens: {
    ...githubLightTheme.tokens,
    command: "#7a4bd2",
    comment: "#616972",
    deleted: "#cb212d",
    function: "#7a4bd2",
    inserted: "#187734",
    keyword: "#cb212d",
    link: "#0965d1",
    operator: "#7a4bd2",
    string: "#09775e",
  },
};

export const highlightThemeCss = createThemeCss({ light: readableTheme });

// -----
// Splits a code snippet into tokens with a class each (`th-keyword`,
// `th-string`, ...). It returns tokens, never HTML, so React renders them and
// nothing is injected. The colours come from `highlightThemeCss`.
// -----
export const highlightCode = (code: string) => highlighter.tokenize(code, { lang: "ts" }).tokens;
