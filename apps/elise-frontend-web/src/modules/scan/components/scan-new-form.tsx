import { useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { DialogBody, DialogClose, DialogFooter } from "#/components/ui/dialog";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { RadioCard, RadioGroup } from "#/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { cn } from "#/lib/utils";
import { githubReposQuery, type GithubRepo } from "#/modules/github";
import { runnersQuery } from "#/modules/runner";
import { usageQuery, usageUsd } from "#/modules/usage";
import {
  SCAN_DEFAULT_BRANCH,
  SCAN_EFFORT_OPTIONS,
  SCAN_MODEL_OPTIONS,
  SCAN_OTHER_BRANCH,
  SCAN_PROFILE_OPTIONS,
  SCAN_PUBLIC_HELP,
  SCAN_SKILL_OPTIONS,
  SCAN_SOURCE_OPTIONS,
  type ScanOption,
  type ScanSource,
} from "../constants";
import { createScan } from "../api";
import { scanKeys, scanRepoBranchesQuery, scanReposQuery, scansQuery } from "../hooks";
import { CreateScanInputSchema, type CreateScanInput } from "../schemas";
import { scanKnownRepos, scanPlanSummary, scanRepoChoices, scanRepoName } from "../utils";
import { ScanNewPrivate } from "./scan-new-private";

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
const RUN_IN_CLOUD = "cloud";

const DEFAULT_BRANCH = SCAN_DEFAULT_BRANCH;
const OTHER_BRANCH = SCAN_OTHER_BRANCH;

const LAST_SCAN_NOTE = {
  none: "Not scanned yet",
  queued: "A scan is waiting to start",
  running: "A scan is running now",
  succeeded: "Last scan succeeded",
  failed: "Last scan failed",
} as const;

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
// A branch problem goes under the branch field; any other goes under the
// repository field, where the person is already looking.
// -----
const planErrors = (plan: CreateScanInput) => {
  const parsed = CreateScanInputSchema.safeParse(plan);
  if (parsed.success) return undefined;
  const refIssue = parsed.error.issues.find((issue) => issue.path[0] === "ref");
  const repoIssue = parsed.error.issues.find((issue) => issue.path[0] !== "ref");
  return { fields: { ...(repoIssue && { repo: repoIssue.message }), ...(refIssue && { ref: refIssue.message }) } };
};

export function ScanNewForm({ onDone, repo, startBranch, startRef, startOptions }: ScanNewFormProps) {
  const initial: CreateScanInput = { ...INITIAL, ...startOptions, ref: startRef };
  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: () => planErrors(plan) },
    onSubmit: () => start.mutate(CreateScanInputSchema.parse(plan)),
    onSubmitInvalid: () => repoInput.current?.focus(),
  });
  const values = useStore(form.store, (state) => state.values);
  const [picked, setPicked] = useState<string | null>(null);
  const repoInput = useRef<HTMLInputElement>(null);
  const { data: list } = useQuery(scansQuery());
  const { data: usage } = useQuery(usageQuery());
  const budgetSpent = usage !== undefined && usage.remainingUsd <= 0;
  const { data: repoList } = useQuery(scanReposQuery());
  const everyKnown = repoList ? scanRepoChoices(repoList.repos, list?.scans ?? []) : scanKnownRepos(list?.scans ?? []);
  const known = everyKnown.filter((item) => !item.isPrivate);
  const [userSource, setUserSource] = useState<ScanSource | null>(null);
  const [privateRepo, setPrivateRepo] = useState<GithubRepo | undefined>(undefined);
  const [privateBranch, setPrivateBranch] = useState(startRef ? OTHER_BRANCH : (startBranch ?? DEFAULT_BRANCH));
  const { data: connected } = useQuery({ ...githubReposQuery(), enabled: repo !== undefined });
  const connectedMatch = repo === undefined ? undefined : connected?.find((item) => item.url.toLowerCase() === repo.replace(/(\.git)?\/?$/, "").toLowerCase());
  const source: ScanSource = userSource ?? (connectedMatch?.private ? "private" : "public");
  const isPrivate = source === "private";
  // -----
  // A scan can run on one of the account's connected runners: the person's own
  // computer, on their own Claude. Only a public repository can, because a private one
  // needs the GitHub token that only EliseLAB's container can make.
  // -----
  const { data: runners } = useQuery(runnersQuery());
  const connectedRunners = (runners ?? []).filter((item) => item.state === "connected");
  const runner = isPrivate ? undefined : connectedRunners.find((item) => item.id === values.runnerId);
  const privatePicked = isPrivate ? (privateRepo ?? connectedMatch) : undefined;
  const privateRunning = privatePicked === undefined ? false : everyKnown.find((item) => item.url.toLowerCase() === privatePicked.url.toLowerCase())?.running === true;
  const choice = picked ?? repo ?? known[0]?.url ?? OTHER_REPO;
  const chosen = known.find((item) => item.url === choice);
  const typing = choice === OTHER_REPO || (chosen === undefined && repo === undefined);
  const [branchPick, setBranchPick] = useState(startRef ? OTHER_BRANCH : (startBranch ?? DEFAULT_BRANCH));
  const { data: detail } = useQuery({ ...scanRepoBranchesQuery(chosen?.repoId ?? ""), enabled: !typing && chosen !== undefined });
  const ref = typing || branchPick === OTHER_BRANCH ? values.ref : branchPick === DEFAULT_BRANCH ? undefined : branchPick;
  const privateRef = privateBranch === OTHER_BRANCH ? values.ref : privateBranch === DEFAULT_BRANCH ? undefined : privateBranch;
  const plan: CreateScanInput = isPrivate
    ? { ...values, runnerId: undefined, repo: privatePicked?.url ?? "", ref: privateRef }
    : { ...values, runnerId: runner?.id, repo: typing ? values.repo : choice, ref };
  const freeBranch = typing || branchPick === OTHER_BRANCH;
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

  const summary = scanPlanSummary(plan, runner?.name);

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
        <div className="grid gap-2">
          <span id="source-label" className="text-sm font-medium leading-none">
            Is the repository public or private?
          </span>
          <RadioGroup
            aria-labelledby="source-label"
            value={source}
            onValueChange={(next) => setUserSource(SCAN_SOURCE_OPTIONS.find((option) => option.value === next)?.value ?? "public")}
            className="grid-cols-2"
          >
            {SCAN_SOURCE_OPTIONS.map((option) => (
              <RadioCard key={option.value} value={option.value} title={option.label} description={option.description} />
            ))}
          </RadioGroup>
        </div>

        {isPrivate ? (
          <>
            <ScanNewPrivate
              repo={privatePicked}
              branchPick={privateBranch}
              typedRef={values.ref}
              onRepo={(next) => {
                setPrivateRepo(next);
                setPrivateBranch(DEFAULT_BRANCH);
                form.setFieldValue("ref", undefined);
              }}
              onBranchPick={setPrivateBranch}
              onTypedRef={(next) => form.setFieldValue("ref", next)}
            />
            {privateRunning && privatePicked && (
              <output className="block rounded-md border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-sm text-status-warning">
                A scan of {privatePicked.fullName} is already running. Wait for it to finish before you start another.
              </output>
            )}
          </>
        ) : (
        <div className="grid gap-2">
          {known.length > 0 && (
            <>
              <Label htmlFor="repo-pick">Which repository should we audit?</Label>
              <Select
                value={typing ? OTHER_REPO : choice}
                items={[...known.map((item) => ({ value: item.url, label: item.label })), ...(chosen === undefined && !typing ? [{ value: choice, label: scanRepoLabel(choice) }] : []), { value: OTHER_REPO, label: "A different repository" }]}
                onValueChange={(next) => {
                  if (next) {
                    form.setFieldMeta("repo", (meta) => ({ ...meta, errorMap: {} }));
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
              <form.Field name="repo">
                {(field) => (
                  <>
                    <div className="relative">
                      <GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="repo"
                        ref={repoInput}
                        name={field.name}
                        className="pl-9"
                        placeholder="https://github.com/owner/name"
                        autoComplete="off"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        {...fieldAria(field, "repo", "repo-help")}
                      />
                    </div>
                    {fieldMessage(field) ? (
                      <FieldError id="repo" message={fieldMessage(field)} />
                    ) : (
                      <p id="repo-help" className="text-xs text-muted-foreground">
                        {SCAN_PUBLIC_HELP}
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </>
          )}
          {!typing && chosen !== undefined && (
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
              <form.Field name="ref">
                {(field) => (
                  <>
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
                      <p id="ref-help" className="text-xs text-muted-foreground">
                        Capital letters count. A branch, tag or commit of the repository.
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </>
          )}
          {!typing && chosen?.running && (
            <output className="block rounded-md border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-sm text-status-warning">
              A scan of {chosen.label} is already running. Wait for it to finish before you start another.
            </output>
          )}
        </div>
        )}

        {!isPrivate && connectedRunners.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="run-where">Where should it run?</Label>
            <Select
              value={runner?.id ?? RUN_IN_CLOUD}
              items={[{ value: RUN_IN_CLOUD, label: "EliseLAB's cloud" }, ...connectedRunners.map((item) => ({ value: item.id, label: item.name }))]}
              onValueChange={(next) => form.setFieldValue("runnerId", connectedRunners.find((item) => item.id === next)?.id)}
            >
              <SelectTrigger id="run-where">
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
            <p className="text-xs text-muted-foreground">
              {runner === undefined
                ? "Public repositories can also run on a computer you have paired. Add one in Settings, under Providers."
                : "The EliseLAB Runner app must be open on that computer, with Claude Code signed in. Private repositories can't run there yet."}
            </p>
          </div>
        )}

        <div className="grid gap-2">
          <span id="skill-label" className="text-sm font-medium leading-none">
            How thorough should the review be?
          </span>
          <RadioGroup aria-labelledby="skill-label" value={values.skill} onValueChange={(next) => form.setFieldValue("skill", SCAN_SKILL_OPTIONS.find((o) => o.value === next)?.value ?? "lite")} className="grid-cols-2">
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
              onValueChange={(next) => form.setFieldValue("profile", SCAN_PROFILE_OPTIONS.find((o) => o.value === next)?.value ?? "standard")}
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
                <OptionSelect id="model" options={SCAN_MODEL_OPTIONS} value={values.model} onPick={(v) => form.setFieldValue("model", v)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effort">How much effort should it put in?</Label>
                <OptionSelect id="effort" options={SCAN_EFFORT_OPTIONS} value={values.effort} onPick={(v) => form.setFieldValue("effort", v)} />
                <p className="text-xs text-muted-foreground">More effort can find more issues, but takes longer and costs more.</p>
              </div>
            </div>
          </CollapsiblePanel>
        </Collapsible>
      </DialogBody>

      <DialogFooter className="grid gap-3">
        <p className="text-sm leading-relaxed" aria-live="polite">
          {summary ?? <span className="text-muted-foreground">{isPrivate ? "Choose a repository and we'll summarise what is about to run." : "Add a repository link and we'll summarise what is about to run."}</span>}
        </p>
        <div className="flex items-center justify-end gap-3">
          <p className={cn("mr-auto text-xs", budgetSpent ? "text-status-danger" : "text-muted-foreground")} role={budgetSpent ? "alert" : undefined}>
            {usage === undefined
              ? "Each audit stops at a spend limit, and your account has a monthly budget."
              : budgetSpent
                ? "This month's budget is used up or held by running scans, so no new audit can start. It resets on the 1st (UTC)."
                : `${usageUsd(usage.remainingUsd)} of this month's budget is left. Each audit stops at its own spend limit.`}
          </p>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={start.isPending || (budgetSpent && runner === undefined) || (isPrivate ? privatePicked === undefined || privateRunning : !typing && chosen?.running === true)}>
            {start.isPending ? "Starting…" : "Start audit"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
