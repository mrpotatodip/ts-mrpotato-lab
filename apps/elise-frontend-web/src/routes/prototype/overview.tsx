import { createFileRoute } from "@tanstack/react-router";
import { ScanOverview } from "#/modules/scan";

export const Route = createFileRoute("/prototype/overview")({
  head: () => ({ meta: [{ title: "Demo overview · Elise" }] }),
  component: ScanOverview,
});
