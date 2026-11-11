import { Fragment } from "react";

type FindingLocationProps = {
  file: string | null;
  line: number | null;
};

export function FindingLocation({ file, line }: FindingLocationProps) {
  if (!file) return <span className="text-muted-foreground">-</span>;
  const parts = file.split("/");
  return (
    <span className="font-mono text-xs text-muted-foreground [overflow-wrap:normal]">
      {parts.map((part, index) => (
        <Fragment key={`${index}-${part}`}>
          {index > 0 && <wbr />}
          {index > 0 && "/"}
          {part}
        </Fragment>
      ))}
      {line ? <span className="whitespace-nowrap">:{line}</span> : null}
    </span>
  );
}
