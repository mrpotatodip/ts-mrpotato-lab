const COLOR = {
  page: "#eff1f4",
  card: "#fbfcfd",
  strip: "#f3f4f6",
  inset: "#f5f6f8",
  border: "#e4e5e6",
  text: "#171b20",
  muted: "#393d44",
  primary: "#23272c",
  onPrimary: "#fbfcfd",
};

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const escapeEmailHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export type EmailSegment = { text: string; strong?: true };

export type EmailContent = {
  subject: string;
  preheader: string;
  heading: string;
  intro: EmailSegment[];
  facts: { label: string; value: string }[];
  button: { label: string; url: string };
  footer: string;
};

const segmentText = (segment: EmailSegment) => segment.text;

const segmentHtml = (segment: EmailSegment) =>
  segment.strong ? `<strong style="color:${COLOR.text};">${escapeEmailHtml(segment.text)}</strong>` : escapeEmailHtml(segment.text);

const factRow = (fact: { label: string; value: string }) =>
  `<tr><td style="padding:10px 16px;font-size:13px;color:${COLOR.muted};width:110px;">${escapeEmailHtml(fact.label)}</td><td style="padding:10px 16px;font-size:15px;font-weight:600;color:${COLOR.text};">${escapeEmailHtml(fact.value)}</td></tr>`;

const DIVIDER = `<tr><td colspan="2" style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;">&nbsp;</td></tr>`;

const factsPanel = (facts: EmailContent["facts"]) =>
  facts.length === 0
    ? ""
    : `<tr><td style="padding:20px 24px 4px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.inset};border:1px solid ${COLOR.border};border-radius:12px;">
${facts.map(factRow).join(`\n${DIVIDER}\n`)}
</table>
</td></tr>
`;

export const renderEmailLayout = (content: EmailContent) => {
  const { subject, preheader, heading, intro, facts, button, footer } = content;
  const url = escapeEmailHtml(button.url);

  const text = [
    intro.map(segmentText).join(""),
    "",
    ...facts.map((fact) => `${fact.label}: ${fact.value}`),
    ...(facts.length === 0 ? [] : [""]),
    `${button.label}: ${button.url}`,
    "",
    footer,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeEmailHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeEmailHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:12px;font-family:${SANS};color:${COLOR.text};">
<tr><td style="padding:16px 24px;background:${COLOR.strip};border-bottom:1px solid ${COLOR.border};border-radius:12px 12px 0 0;">
<span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:${COLOR.text};">EliseLAB</span>
<span style="font-size:12px;color:${COLOR.muted};">&nbsp;&nbsp;Security audits</span>
</td></tr>
<tr><td style="padding:28px 24px 8px 24px;">
<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:${COLOR.text};">${escapeEmailHtml(heading)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.muted};">${intro.map(segmentHtml).join("")}</p>
</td></tr>
${factsPanel(facts)}<tr><td style="padding:24px 24px 8px 24px;">
<a href="${url}" style="display:inline-block;background:${COLOR.primary};color:${COLOR.onPrimary};font-size:15px;font-weight:600;text-decoration:none;line-height:20px;padding:10px 20px;border-radius:8px;">${escapeEmailHtml(button.label)}</a>
</td></tr>
<tr><td style="padding:16px 24px 28px 24px;">
<p style="margin:0 0 6px 0;font-size:13px;line-height:1.5;color:${COLOR.muted};">Or paste this link into your browser:</p>
<p style="margin:0;font-family:${MONO};font-size:12px;line-height:1.5;color:${COLOR.text};word-break:break-all;">${url}</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${COLOR.border};">
<p style="margin:0;font-size:13px;line-height:1.5;color:${COLOR.muted};">${escapeEmailHtml(footer)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
};
