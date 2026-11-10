import { useState } from "react";
import { useRouteContext } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { hasAccessPower } from "@repo/contracts/elise";
import { setFindingTriage } from "../api";
import { FINDING_TRIAGE_OPTIONS } from "../constants";
import type { Finding, FindingTriage, FindingTriageStatus } from "../schemas";
import { FindingRiskDialog, type RiskInput } from "./finding-risk-dialog";

type FindingTriageSelectProps = {
  finding: Pick<Finding, "repo" | "fingerprint" | "triage" | "title">;
  also?: readonly (readonly unknown[])[];
  onSaved?: (fingerprint: string, triage: FindingTriage) => void;
};

type Decision = { status: FindingTriageStatus; acceptDays?: number; note?: string | null };

const SAVED_COPY = {
  open: "Reopened. It counts as open again.",
  fixed: "Marked fixed. It leaves the open count now, and the next scan will confirm it.",
  false_positive: "Dismissed as a false positive. It no longer counts as open.",
  accepted_risk: "Risk accepted. It stays out of the open count until the date you chose.",
} as const satisfies Record<FindingTriageStatus, string>;

export function FindingTriageSelect({ finding, also = [], onSaved }: FindingTriageSelectProps) {
  const { user } = useRouteContext({ from: "/_app" });
  const canAcceptRisk = hasAccessPower(user?.powers ?? [], "company:findings:accepted_risk:update");
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState(false);

  const save = useMutation({
    mutationFn: ({ status, acceptDays, note }: Decision) =>
      setFindingTriage({ data: { repo: finding.repo, fingerprint: finding.fingerprint, status, note: note === undefined ? (finding.triage?.note ?? null) : note, acceptDays } }),
    onSuccess: (saved, decision) => {
      setAccepting(false);
      onSaved?.(finding.fingerprint, saved);
      toast.success(SAVED_COPY[decision.status]);
      void Promise.all(also.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: (error) => toast.error(error.message === "Forbidden" ? "Only account admins can accept a risk." : `We couldn't save that decision. ${error.message}`),
  });

  return (
    <>
      <Select
        value={finding.triage?.status ?? "open"}
        items={FINDING_TRIAGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        disabled={save.isPending}
        onValueChange={(next) => {
          const picked = FINDING_TRIAGE_OPTIONS.find((option) => option.value === next);
          if (!picked || picked.value === (finding.triage?.status ?? "open")) return;
          if (picked.value === "accepted_risk") setAccepting(true);
          else save.mutate({ status: picked.value, note: picked.value === "open" ? null : undefined });
        }}
      >
        <SelectTrigger aria-label="Your decision" className="h-8 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FINDING_TRIAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.value === "accepted_risk" && !canAcceptRisk}>
              <span className="grid">
                <span>{option.label}</span>
                {option.value === "accepted_risk" && !canAcceptRisk && <span className="text-xs text-muted-foreground">Account admins only</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FindingRiskDialog
        open={accepting}
        onOpenChange={setAccepting}
        findingTitle={finding.title}
        initialNote={finding.triage?.note ?? ""}
        pending={save.isPending}
        onConfirm={({ note, days }: RiskInput) => save.mutate({ status: "accepted_risk", note, acceptDays: days })}
      />
    </>
  );
}
