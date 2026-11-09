import { createFileRoute } from "@tanstack/react-router";
import { RepoAttentionList, RepoSummaryStrip } from "#/modules/repo";
import { buildReposPrototype } from "#/modules/repo/prototypes";
import { ScanOverview } from "#/modules/scan";

export const Route = createFileRoute("/prototype/overview")({
  head: () => ({ meta: [{ title: "Demo overview · Elise" }] }),
  component: PrototypeOverview,
});

function PrototypeOverview() {
  const repos = buildReposPrototype();
  return <ScanOverview decide={<RepoSummaryStrip repos={repos} />} attention={<RepoAttentionList repos={repos} />} />;
}
