import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { DialogBody, DialogClose, DialogFooter } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { RadioCard, RadioGroup } from "#/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { SCAN_EFFORT_OPTIONS, SCAN_MODEL_OPTIONS, SCAN_PROFILE_OPTIONS, SCAN_SKILL_OPTIONS, type ScanOption } from "../constants";
import { createScan } from "../api";
import { scanKeys, scanRepoBranchesQuery, scanReposQuery, scansQuery } from "../hooks";
import { CreateScanInputSchema, type CreateScanInput } from "../schemas";
import { scanKnownRepos, scanPlanSummary, scanRepoChoices, scanRepoName } from "../utils";

const scanRepoLabel = (url: string) => {
  const { owner, name } = scanRepoName(url, url);
  return owner ? `${owner}/${name}` : name;
};

const INITIAL: CreateScanInput = {
  repo: "",
  model: "claude-sonnet-5-5",
  effort: "high",
  skill: "lite",
  profile: "standard",
};

type OptionSelectProps<T extends string> = {
  id: string;
  options: readonly ScanOption<T>[];
  value: T;
  onPick: (value: T) => void;
};

function OptionSelect<T extends string>({ id, options, value, onPick }: OptionSelectProps<T>) {
  return (
    <Select
      value={value}
      items={options.map((option) => ({ value: option.value, label: option.label }))}
      onValueChange={(next) => {
        const picked = options.find((option) => option.value === next);
        if (picked) onPick(picked.value);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="grid">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const OTHER_REPO = "other";

const DEFAULT_BRANCH = "";
const OTHER_BRANCH = "\u0000other";

const LAST_SCAN_NOTE = {
  none: "Not scanned yet",
  queued: "A scan is waiting to start",
  running: "A scan is running now",
  succeeded: "Last scan succeeded",
  failed: "Last scan failed",
} as const;

type ScanNewFormProps = {
  preview: boolean;
  onDone: () => void;
  repo?: string;
  startBranch?: string;
  startRef?: string;
  startOptions?: Partial<Pick<CreateScanInput, "model" | "effort" | "skill" | "profile">>;
};

export function ScanNewForm({ preview, onDone, repo, startBranch, startRef, startOptions }: ScanNewFormProps) {
  const [values, setValues] = useState<CreateScanInput>({ ...INITIAL, ...startOptions, ref: startRef });
  const [picked, setPicked] = useState<string | null>(null);
  const repoInput = useRef<HTMLInputElement>(null);
  const { data: list } = useQuery(scansQuery());
  const { data: repoList } = useQuery({ ...scanReposQuery(), enabled: !preview });
  const known = repoList ? scanRepoChoices(repoList.repos, list?.scans ?? []) : scanKnownRepos(list?.scans ?? []);
  const choice = picked ?? repo ?? known[0]?.url ?? OTHER_REPO;
  const chosen = known.find((item) => item.url === choice);
  const typing = choice === OTHER_REPO || (chosen === undefined && repo === undefined);
  const [branchPick, setBranchPick] = useState(startRef ? OTHER_BRANCH : (startBranch ?? DEFAULT_BRANCH));
  const { data: detail } = useQuery({ ...scanRepoBranchesQuery(chosen?.repoId ?? ""), enabled: !preview && !typing && chosen !== undefined });
  const ref = typing || branchPick === OTHER_BRANCH ? values.ref : branchPick === DEFAULT_BRANCH ? undefined : branchPick;
  const plan: CreateScanInput = { ...values, repo: typing ? values.repo : choice, ref };
  const freeBranch = typing || branchPick === OTHER_BRANCH;
  const [repoError, setRepoError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const start = useMutation({
    mutationFn: (input: CreateScanInput) => createScan({ data: input }),
    onSuccess: async (scan) => {
      onDone();
      toast.success("Audit started. This page will update as it runs.");
      await queryClient.invalidateQueries({ queryKey: scanKeys.all });
      await navigate({ to: "/scans/$scanId", params: { scanId: scan.scanId } });
    },
    onError: (error) => toast.error(`We couldn't start the audit. ${error.message}`),
  });

  const set = <K extends keyof CreateScanInput>(key: K, value: CreateScanInput[K]) => {
    if (key === "repo") setRepoError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = CreateScanInputSchema.safeParse(plan);
    if (!parsed.success) {
      setRepoError(parsed.error.issues[0]?.message ?? "Check the repository link and try again.");
      repoInput.current?.focus();
      return;
    }
    if (preview) {
      toast.info("This is a demo, so no audit was started.");
      onDone();
      return;
    }
    start.mutate(parsed.data);
  };

  const summary = scanPlanSummary(plan);

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="grid content-start gap-6">
        <div className="grid gap-2">
          {known.length > 0 && (
            <>
              <Label htmlFor="repo-pick">Which repository should we audit?</Label>
              <Select
                value={typing ? OTHER_REPO : choice}
                items={[...known.map((item) => ({ value: item.url, label: item.label })), ...(chosen === undefined && !typing ? [{ value: choice, label: scanRepoLabel(choice) }] : []), { value: OTHER_REPO, label: "A different repository" }]}
                onValueChange={(next) => {
                  if (next) {
                    setRepoError(null);
                    setBranchPick(DEFAULT_BRANCH);
                    setPicked(next);
                  }
                }}
              >
                <SelectTrigger id="repo-pick">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {known.map((item) => (
                    <SelectItem key={item.repoId} value={item.url}>
                      <span className="grid">
                        <span>{item.label}</span>
                        <span className="text-xs text-muted-foreground">{LAST_SCAN_NOTE[item.running ? "running" : (item.last ?? "none")]}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_REPO}>
                    <span className="grid">
                      <span>A different repository</span>
                      <span className="text-xs text-muted-foreground">Paste a link to another public GitHub repository</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {typing && (
            <>
              <Label htmlFor="repo" className={known.length > 0 ? "mt-2" : undefined}>
                {known.length > 0 ? "Link to the GitHub repository" : "Which repository should we audit?"}
              </Label>
              <div className="relative">
                <GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="repo"
                  ref={repoInput}
                  className="pl-9"
                  placeholder="https://github.com/owner/name"
                  autoComplete="off"
                  value={values.repo}
                  onChange={(e) => set("repo", e.target.value)}
                  aria-invalid={repoError ? true : undefined}
                  aria-describedby={repoError ? "repo-error" : "repo-help"}
                  required
                />
              </div>
              {repoError ? (
                <p id="repo-error" role="alert" className="text-sm text-destructive">
                  {repoError}
                </p>
              ) : (
                <p id="repo-help" className="text-xs text-muted-foreground">
                  Paste the link to a public GitHub repository. Private repositories can't be cloned.
                </p>
              )}
            </>
          )}
          {!typing && chosen !== undefined && !preview && (
            <>
              <Label htmlFor="branch-pick" className="mt-2">
                Which branch should we audit?
              </Label>
              <Select
                value={branchPick}
                items={[
                  { value: DEFAULT_BRANCH, label: detail?.defaultBranch === null ? "Default branch (not scanned yet)" : "Default branch" },
                  ...(detail?.branches ?? []).map((branch) => ({ value: branch.name, label: branch.name })),
                  { value: OTHER_BRANCH, label: "Other…" },
                ]}
                onValueChange={(next) => {
                  if (next !== null) setBranchPick(next);
                }}
              >
                <SelectTrigger id="branch-pick">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_BRANCH}>
                    <span className="grid">
                      <span>{detail?.defaultBranch === null ? "Default branch (not scanned yet)" : "Default branch"}</span>
                      <span className="text-xs text-muted-foreground">{detail?.defaultBranch ? detail.defaultBranch : "The repository's own default"}</span>
                    </span>
                  </SelectItem>
                  {(detail?.branches ?? []).map((branch) => (
                    <SelectItem key={branch.id} value={branch.name}>
                      <span className="grid">
                        <span className="font-mono">{branch.name}</span>
                        {branch.latestCommit === null && <span className="text-xs text-muted-foreground">Never scanned</span>}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_BRANCH}>
                    <span className="grid">
                      <span>Other…</span>
                      <span className="text-xs text-muted-foreground">Type the exact name. A real branch is tracked after the scan.</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {freeBranch && (
            <>
              <Label htmlFor="ref" className={typing ? "mt-2" : undefined}>
                {typing ? "Which branch should we audit? (optional)" : "Branch name or commit"}
              </Label>
              <Input id="ref" className="font-mono" autoComplete="off" placeholder="Leave empty for the default branch" value={values.ref ?? ""} onChange={(e) => set("ref", e.target.value === "" ? undefined : e.target.value)} />
              <p className="text-xs text-muted-foreground">Capital letters count. A branch, tag or commit of the repository.</p>
            </>
          )}
          {!typing && chosen?.running && (
            <output className="block rounded-md border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-sm text-status-warning">
              A scan of {chosen.label} is already running. Wait for it to finish before you start another.
            </output>
          )}
        </div>

        <div className="grid gap-2">
          <span id="skill-label" className="text-sm font-medium leading-none">
            How thorough should the review be?
          </span>
          <RadioGroup aria-labelledby="skill-label" value={values.skill} onValueChange={(next) => set("skill", SCAN_SKILL_OPTIONS.find((o) => o.value === next)?.value ?? "lite")} className="grid-cols-2">
            {SCAN_SKILL_OPTIONS.map((option) => (
              <RadioCard key={option.value} value={option.value} title={option.label} description={option.description} />
            ))}
          </RadioGroup>
        </div>

        {values.skill === "full" && (
          <div className="grid gap-2">
            <span id="profile-label" className="text-sm font-medium leading-none">
              How much of the codebase should the full audit cover?
            </span>
            <RadioGroup
              aria-labelledby="profile-label"
              value={values.profile}
              onValueChange={(next) => set("profile", SCAN_PROFILE_OPTIONS.find((o) => o.value === next)?.value ?? "standard")}
              className="grid-cols-3"
            >
              {SCAN_PROFILE_OPTIONS.map((option) => (
                <RadioCard key={option.value} value={option.value} title={option.label} description={option.description} />
              ))}
            </RadioGroup>
          </div>
        )}

        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown className="size-4 -rotate-90 transition-transform group-data-[panel-open]:rotate-0" />
            Advanced settings
            <span className="text-xs font-normal">Model and effort. The defaults suit most audits.</span>
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <div className="grid grid-cols-2 items-start gap-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="model">Which Claude model should run the audit?</Label>
                <OptionSelect id="model" options={SCAN_MODEL_OPTIONS} value={values.model} onPick={(v) => set("model", v)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effort">How much effort should it put in?</Label>
                <OptionSelect id="effort" options={SCAN_EFFORT_OPTIONS} value={values.effort} onPick={(v) => set("effort", v)} />
                <p className="text-xs text-muted-foreground">More effort can find more issues, but takes longer and costs more.</p>
              </div>
            </div>
          </CollapsiblePanel>
        </Collapsible>
      </DialogBody>

      <DialogFooter className="grid gap-3">
        <p className="text-sm leading-relaxed" aria-live="polite">
          {summary ?? <span className="text-muted-foreground">Add a repository link and we'll summarise what is about to run.</span>}
        </p>
        <div className="flex items-center justify-end gap-3">
          <p className="mr-auto text-xs text-muted-foreground">Each audit stops at a spend limit, and your account has a monthly budget.</p>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={start.isPending || (!typing && chosen?.running === true)}>
            {start.isPending ? "Starting…" : "Start audit"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
