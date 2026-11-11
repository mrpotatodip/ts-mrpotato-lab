import { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { DialogBody, DialogClose, DialogFooter } from "#/components/ui/dialog";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { RadioCard, RadioGroup } from "#/components/ui/radio-group";
import { Segmented } from "#/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { cn } from "#/lib/utils";
import { githubInstallationsQuery, githubReposQuery } from "#/modules/github";
import { runnersQuery } from "#/modules/runner";
import { usageBlockedNote, usageQuery, usageUsd } from "#/modules/usage";
import {
  SCAN_DEFAULT_BRANCH,
  SCAN_EFFORT_OPTIONS,
  SCAN_MODEL_OPTIONS,
  SCAN_OTHER_BRANCH,
  SCAN_PRIVATE_BRANCH_FAILED,
  SCAN_PRIVATE_TRUNCATED,
  SCAN_PROFILE_OPTIONS,
  SCAN_SKILL_OPTIONS,
  SCAN_SKILL_SHORT,
  type ScanOption,
} from "../constants";
import { createScan } from "../api";
import { scanKeys, scanReposQuery, scansQuery } from "../hooks";
import { CreateScanInputSchema, type CreateScanInput } from "../schemas";
import { scanKnownRepos, scanPlanSummary, scanRepoChoices, scanRepoLinkPick, scanRepoPickSame, scanRepoPicks, type ScanRepoPick } from "../utils";
import { ScanNewBranch, useScanBranches } from "./scan-new-branch";
import { ScanNewSearch, ScanRepoIcon } from "./scan-new-search";

const INITIAL: CreateScanInput = {
  repo: "",
  model: "claude-sonnet-5-5",
  effort: "high",
  skill: "lite",
  profile: "standard",
};

type OptionSelectProps<T extends string> = {
  id: string;
  label: string;
  options: readonly ScanOption<T>[];
  value: T;
  onPick: (value: T) => void;
};

function OptionSelect<T extends string>({ id, label, options, value, onPick }: OptionSelectProps<T>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        items={options.map((option) => ({ value: option.value, label: option.label }))}
        onValueChange={(next) => {
          const picked = options.find((option) => option.value === next);
          if (picked) onPick(picked.value);
        }}
      >
        <SelectTrigger id={id} className="h-9">
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
    </div>
  );
}

const RUN_IN_CLOUD = "cloud";

const labelOf = (options: readonly { value: string; label: string }[], value: string) => options.find((option) => option.value === value)?.label ?? value;

type ScanNewFormProps = {
  onDone: () => void;
  repo?: string;
  startBranch?: string;
  startRef?: string;
  startOptions?: Partial<Pick<CreateScanInput, "model" | "effort" | "skill" | "profile">>;
};

// -----
// The plan is the repository and branch the person chose plus the form's
// own values, so the validator runs on the plan, not on the raw fields.
// A branch problem goes under the branch field; any other is a repository
// problem, which only a bad link or a changed address can cause.
// -----
const planErrors = (plan: CreateScanInput) => {
  const parsed = CreateScanInputSchema.safeParse(plan);
  if (parsed.success) return undefined;
  const refIssue = parsed.error.issues.find((issue) => issue.path[0] === "ref");
  const repoIssue = parsed.error.issues.find((issue) => issue.path[0] !== "ref");
  return { fields: { ...(repoIssue && { repo: repoIssue.message }), ...(refIssue && { ref: refIssue.message }) } };
};

export function ScanNewForm({ onDone, repo, startBranch, startRef, startOptions }: ScanNewFormProps) {
  const initial: CreateScanInput = { ...INITIAL, ...startOptions, ref: startRef ?? startBranch };
  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: () => planErrors(plan) },
    onSubmit: () => start.mutate(CreateScanInputSchema.parse(plan)),
    onSubmitInvalid: () => {
      const problem = planErrors(plan)?.fields.repo;
      if (problem) toast.error(problem);
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const [picked, setPicked] = useState<ScanRepoPick | null | undefined>(undefined);
  const [branchPick, setBranchPick] = useState(startRef ? SCAN_OTHER_BRANCH : (startBranch ?? SCAN_DEFAULT_BRANCH));
  const { data: list } = useQuery(scansQuery());
  const { data: usage } = useQuery(usageQuery());
  const budgetSpent = usage !== undefined && usage.remainingUsd <= 0;
  const { data: repoList } = useQuery(scanReposQuery());
  const { data: connected, isPending: connecting } = useQuery(githubReposQuery());
  const { data: installs } = useQuery(githubInstallationsQuery());
  const everyKnown = repoList ? scanRepoChoices(repoList.repos, list?.scans ?? []) : scanKnownRepos(list?.scans ?? []);
  const picks = scanRepoPicks(everyKnown, connected ?? []);
  const fromProp = repo === undefined ? null : (picks.find((item) => scanRepoPickSame(item.url, repo)) ?? scanRepoLinkPick(repo));
  // -----
  // The choice is remembered as a repository, not as the row that was clicked:
  // the list changes when the GitHub connection's repositories arrive (a
  // repository the account scanned turns out to be private), and the card
  // must follow it. A pasted link is in no list, so it keeps its own row.
  // -----
  const selected = picked === undefined ? fromProp : picked === null ? null : (picks.find((item) => scanRepoPickSame(item.url, picked.url)) ?? picked);
  const isPrivate = selected?.isPrivate === true;
  const branches = useScanBranches(selected);
  const typedBranch = selected !== null && (branches.kind === "typed" || branches.isError || branchPick === SCAN_OTHER_BRANCH);
  const noConnection = installs !== undefined && !installs.some((install) => install.status === "active");
  // -----
  // A scan can run on one of the account's connected runners: the person's own
  // computer, on their own Claude. Only a public repository can, because a private one
  // needs the GitHub token that only EliseLAB's container can make.
  // -----
  const { data: runners } = useQuery(runnersQuery());
  const connectedRunners = (runners ?? []).filter((item) => item.state === "connected");
  const runner = isPrivate ? undefined : connectedRunners.find((item) => item.id === values.runnerId);
  const showRunner = !isPrivate && connectedRunners.length > 0;
  const ref = typedBranch ? values.ref : branchPick === SCAN_DEFAULT_BRANCH ? undefined : branchPick;
  const plan: CreateScanInput = { ...values, runnerId: runner?.id, repo: selected?.url ?? "", ref };
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const choose = (next: ScanRepoPick | null) => {
    setPicked(next);
    setBranchPick(SCAN_DEFAULT_BRANCH);
    form.setFieldValue("ref", undefined);
  };

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

  const summary = scanPlanSummary(plan, runner?.name);
  const chips = [runner?.name ?? "EliseLAB's cloud", labelOf(SCAN_MODEL_OPTIONS, values.model), `${labelOf(SCAN_EFFORT_OPTIONS, values.effort)} effort`];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="grid content-start gap-6">
        {selected === null ? (
          <ScanNewSearch
            picks={picks}
            loading={connecting}
            onPick={choose}
            hint={
              noConnection ? (
                <p className="px-1 text-sm leading-relaxed text-muted-foreground">
                  To scan a private repository, an admin connects GitHub on the{" "}
                  <Link to="/connections" className="font-medium underline underline-offset-2">
                    Connections
                  </Link>{" "}
                  page.
                </p>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-6 animate-in fade-in-0 duration-200">
            <div className="grid gap-3">
              <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-control">
                <div className="flex items-center gap-3">
                  <ScanRepoIcon pick={selected} />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-medium">{selected.label}</span>
                    <span className="text-xs text-muted-foreground">{selected.isPrivate ? "Private repository" : "Public repository"}</span>
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => choose(null)}>
                    Change
                  </Button>
                </div>
                <ScanNewBranch branches={branches} branchPick={branchPick} onBranchPick={setBranchPick} />
              </div>
              {branches.isError && (
                <Alert variant="destructive">
                  <AlertDescription>{SCAN_PRIVATE_BRANCH_FAILED}</AlertDescription>
                </Alert>
              )}
              {branches.truncated && <p className="px-1 text-sm leading-relaxed text-muted-foreground">{SCAN_PRIVATE_TRUNCATED}</p>}
              {typedBranch && (
                <form.Field name="ref">
                  {(field) => (
                    <div className="grid gap-1.5">
                      <Label htmlFor="ref">{branches.kind === "typed" ? "Branch, tag or commit (optional)" : "Branch name or commit"}</Label>
                      <Input
                        id="ref"
                        name={field.name}
                        className="font-mono"
                        autoComplete="off"
                        placeholder="Leave empty for the default branch"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value === "" ? undefined : event.target.value)}
                        {...fieldAria(field, "ref", "ref-help")}
                      />
                      {fieldMessage(field) ? (
                        <FieldError id="ref" message={fieldMessage(field)} />
                      ) : (
                        <p id="ref-help" className="text-sm leading-relaxed text-muted-foreground">
                          Capital letters count. A branch, tag or commit of the repository.
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              )}
              {selected.running && (
                <output className="block rounded-md border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-sm text-status-warning">
                  A scan of {selected.label} is already running. Wait for it to finish before you start another.
                </output>
              )}
            </div>

            <div className="grid gap-3">
              <RadioGroup aria-label="How thorough should the review be?" value={values.skill} onValueChange={(next) => form.setFieldValue("skill", SCAN_SKILL_OPTIONS.find((o) => o.value === next)?.value ?? "lite")} className="grid-cols-2">
                {SCAN_SKILL_OPTIONS.map((option) => (
                  <RadioCard key={option.value} value={option.value} title={option.label} description={SCAN_SKILL_SHORT[option.value]} />
                ))}
              </RadioGroup>
              {values.skill === "full" && (
                <div className="grid gap-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium">Coverage</span>
                    <Segmented
                      label="How much of the codebase should the full audit cover?"
                      value={values.profile}
                      options={SCAN_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                      onChange={(next) => form.setFieldValue("profile", next)}
                      className="w-full sm:w-72"
                    />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{SCAN_PROFILE_OPTIONS.find((option) => option.value === values.profile)?.description}</p>
                </div>
              )}
            </div>

            <Collapsible>
              <CollapsibleTrigger className="group flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {chips.map((chip) => (
                  <span key={chip} className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground group-data-[panel-open]:hidden">
                    {chip}
                  </span>
                ))}
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                  Customize
                  <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[panel-open]:rotate-180" />
                </span>
              </CollapsibleTrigger>
              <CollapsiblePanel>
                <div className={cn("grid items-start gap-3 pt-3", showRunner ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                  {showRunner && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="run-where" className="text-xs text-muted-foreground">
                        Run on
                      </Label>
                      <Select
                        value={runner?.id ?? RUN_IN_CLOUD}
                        items={[{ value: RUN_IN_CLOUD, label: "EliseLAB's cloud" }, ...connectedRunners.map((item) => ({ value: item.id, label: item.name }))]}
                        onValueChange={(next) => form.setFieldValue("runnerId", connectedRunners.find((item) => item.id === next)?.id)}
                      >
                        <SelectTrigger id="run-where" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={RUN_IN_CLOUD}>
                            <span className="grid">
                              <span>EliseLAB&apos;s cloud</span>
                              <span className="text-xs text-muted-foreground">Runs in an isolated container, and uses your plan&apos;s credit or key.</span>
                            </span>
                          </SelectItem>
                          {connectedRunners.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <span className="grid">
                                <span>{item.name}</span>
                                <span className="text-xs text-muted-foreground">Your own computer. Uses its Claude login, not your credit.</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <OptionSelect id="model" label="Model" options={SCAN_MODEL_OPTIONS} value={values.model} onPick={(v) => form.setFieldValue("model", v)} />
                  <OptionSelect id="effort" label="Effort" options={SCAN_EFFORT_OPTIONS} value={values.effort} onPick={(v) => form.setFieldValue("effort", v)} />
                </div>
                <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                  {runner === undefined
                    ? "More effort can find more issues, but takes longer and costs more."
                    : "The EliseLAB Runner app must be open on that computer, with Claude Code signed in. Private repositories can't run there yet."}
                </p>
              </CollapsiblePanel>
            </Collapsible>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="grid gap-3">
        <p className="sr-only" aria-live="polite">
          {summary ?? (selected === null ? "Choose a repository and we'll summarise what is about to run." : "")}
        </p>
        <div className="flex items-center justify-end gap-3">
          <p className={cn("mr-auto text-sm leading-relaxed", budgetSpent ? "text-status-danger" : "text-muted-foreground")} role={budgetSpent ? "alert" : undefined}>
            {usage === undefined
              ? "Each audit stops at a spend limit, and your account has a monthly budget."
              : budgetSpent
                ? usageBlockedNote(usage)
                : `${usageUsd(usage.remainingUsd)} of this month's budget is left. Each audit stops at its own spend limit.`}
          </p>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={start.isPending || connecting || selected === null || selected.running || (budgetSpent && runner === undefined)}>
            {start.isPending ? "Starting…" : "Start audit"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
