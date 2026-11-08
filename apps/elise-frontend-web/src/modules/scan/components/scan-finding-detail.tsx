import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { SCAN_FINDING_STATE_COPY } from "../constants";
import type { Finding } from "../schemas";
import { scanFindingPrompt } from "../utils";
import { ScanEvidence } from "./scan-evidence";
import { ScanFindingCopy } from "./scan-finding-copy";

type SectionProps = { title: string; children: string | null | undefined; mono?: boolean };

function Section({ title, children, mono = false }: SectionProps) {
  if (!children) return null;
  return (
    <div className="grid content-start gap-1">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", mono && "font-mono text-[13px]")}>{children}</p>
    </div>
  );
}

const SHEET_TONE = {
  danger: "text-status-danger",
  success: "text-status-success",
  warning: "text-status-warning",
  neutral: "text-muted-foreground",
} as const;

type SheetSectionProps = { title: string; tone: keyof typeof SHEET_TONE; code?: boolean; children: string | null | undefined };

function SheetSection({ title, tone, code = false, children }: SheetSectionProps) {
  if (!children) return null;
  return (
    <section className="grid content-start gap-3">
      <h3 className={cn("text-xs font-semibold uppercase tracking-widest", SHEET_TONE[tone])}>{title}</h3>
      {code ? (
        <ScanEvidence text={children} />
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{children}</p>
      )}
    </section>
  );
}

type ScanFindingDetailProps = {
  finding: Finding;
  layout?: "table" | "sheet";
};

export function ScanFindingDetail({ finding, layout = "table" }: ScanFindingDetailProps) {
  const { detail } = finding;
  if (!detail) return null;
  const state = SCAN_FINDING_STATE_COPY[finding.state];

  if (layout === "sheet") {
    return (
      <div className="grid gap-9">
        <SheetSection title="What could happen" tone="danger">
          {detail.impact}
        </SheetSection>
        <SheetSection title="Evidence in the code" tone="neutral" code>
          {detail.evidence}
        </SheetSection>
        <SheetSection title="Suggested fix" tone="success">
          {detail.fix}
        </SheetSection>
        {detail.fix && <ScanFindingCopy text={scanFindingPrompt(finding)} />}
        {finding.state === "needs_validation" ? (
          <SheetSection title="What a person should check" tone="warning">
            {detail.needs}
          </SheetSection>
        ) : (
          <SheetSection title="Who could exploit it" tone="warning">
            {detail.actor}
          </SheetSection>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
      <Section title="What could happen">{detail.impact}</Section>
      <Section title="Suggested fix">{detail.fix}</Section>
      <Section title="Evidence in the code" mono>
        {detail.evidence}
      </Section>
      {finding.state === "needs_validation" ? <Section title="What a person should check">{detail.needs}</Section> : <Section title="Who could exploit it">{detail.actor}</Section>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground lg:col-span-2">
        <span>
          Type <Badge variant="outline">{detail.class}</Badge>
        </span>
        <span>{state.note}</span>
      </div>
    </div>
  );
}

