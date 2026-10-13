import { Fragment } from "react";

// Handles just **bold** — the only inline markdown entity the agent copy
// actually uses. Splits on the marker pairs and wraps the captured groups
// in <strong>, leaving everything else as plain text.
export function renderInlineMarkdown(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong className="font-bold" key={index}>
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
