import { useSuspenseQuery } from "@tanstack/react-query";
import { FolderGit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { rankRepos, reposQuery, RepoSummaryStrip } from "#/modules/repo";
import { ShellPageHeader } from "#/modules/shell";
import { SUMMARY_COPY } from "../constants";
import { summaryStanding } from "../utils";
import { SummaryRepo } from "./summary-repo";

export function SummaryPage() {
  const { data } = useSuspenseQuery(reposQuery());
  const ranked = rankRepos(data.repos);

  return (
    <>
      <ShellPageHeader title="Summary" description="Where each repository stands, and what is still open. Nothing here changes anything." />

      {ranked.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderGit2 />
                </EmptyMedia>
                <EmptyTitle>Nothing to review yet</EmptyTitle>
                <EmptyDescription>A repository appears here after its first scan.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <RepoSummaryStrip repos={ranked} />
          <Card>
            <CardHeader className="gap-1.5">
              <CardTitle>Repositories</CardTitle>
              <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
                {summaryStanding(ranked)} {SUMMARY_COPY.readMore}
              </p>
            </CardHeader>
            <CardContent className="overflow-hidden p-0">
              <ul className="divide-y">
                {ranked.map((repo) => (
                  <li key={repo.id}>
                    <SummaryRepo repo={repo} />
                  </li>
                ))}
              </ul>
              <div className="border-t px-5 py-4">
                <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{SUMMARY_COPY.listLegend}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
