import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Badge } from "#/components/ui/badge";
import { repoName, reposQuery, RepoSummaryStrip } from "#/modules/repo";
import { ShellPageHeader } from "#/modules/shell";
import { REPO_STATUS_BADGE, repoStatus, repoSubtitle } from "../utils";
import { SummaryFindings } from "./summary-findings";

export function SummaryRepoPage({ repoId }: { repoId: string }) {
  const { data } = useSuspenseQuery(reposQuery());
  const repo = data.repos.find((candidate) => candidate.id === repoId);
  if (!repo) throw notFound();
  const status = REPO_STATUS_BADGE[repoStatus(repo)];

  return (
    <>
      <ShellPageHeader title={repoName(repo.url)} description={`${repoSubtitle(repo)} Nothing here changes anything.`} badges={<Badge variant={status.variant}>{status.label}</Badge>} />
      <RepoSummaryStrip repos={[repo]} />
      <SummaryFindings repo={repo} />
    </>
  );
}
