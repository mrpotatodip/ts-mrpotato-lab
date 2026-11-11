import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { usageQuery } from "#/modules/usage";
import { createScan } from "../api";
import { isScanActive, scanKeys, scansQuery } from "../hooks";
import type { CreateScanInput, ScanStatus } from "../schemas";

type ScanVerdictRunProps = { repoId: string; repoUrl: string; commit: string; last: ScanStatus };

// -----
// One click starts the scan the verdict is waiting for: this exact commit,
// with the settings of the scan that was counted last. The engine allows one
// live scan per repository, so it is one scan at a time; the button is off
// while one runs, and when the month's budget is used up.
// -----
export function ScanVerdictRun({ repoId, repoUrl, commit, last }: ScanVerdictRunProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: list } = useQuery(scansQuery());
  const { data: usage } = useQuery(usageQuery());
  const running = list?.scans.some((scan) => scan.repoId === repoId && isScanActive(scan.status)) === true;
  const budgetSpent = usage !== undefined && usage.budgetApplies !== false && usage.remainingUsd <= 0;

  const start = useMutation({
    mutationFn: (input: CreateScanInput) => createScan({ data: input }),
    onSuccess: async (scan) => {
      toast.success("Scan started. This page will update as it runs.");
      await queryClient.invalidateQueries({ queryKey: scanKeys.all });
      await navigate({ to: "/scans/$scanId", params: { scanId: scan.scanId } });
    },
    onError: (error) => toast.error(`We couldn't start the scan. ${error.message}`),
  });

  const reason = running ? "A scan of this repository is already running." : budgetSpent ? "This month's budget is used up." : null;

  return (
    <div className="grid justify-items-start gap-1.5">
      <Button disabled={start.isPending || reason !== null} onClick={() => start.mutate({ repo: repoUrl, ref: commit, model: last.model === "claude-opus-5-5" ? "claude-sonnet-5-5" : last.model, effort: last.effort, skill: "lite", profile: last.profile })}>
        <Play className="size-3.5" />
        {start.isPending ? "Starting…" : "Run the missing scan"}
      </Button>
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
    </div>
  );
}
