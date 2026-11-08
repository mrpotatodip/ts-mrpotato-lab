import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { PROTOTYPE_FEATURED } from "#/modules/scan/prototypes";
import { ShellPageHeader } from "#/modules/shell";

export const Route = createFileRoute("/prototype/")({
  head: () => ({ meta: [{ title: "Demo screens · Elise" }] }),
  component: PrototypeIndex,
});

const CARD_CLASS = "group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function PrototypeIndex() {
  return (
    <>
      <ShellPageHeader title="Demo screens" description="Preview the dashboard with a busy account: 40 scans, mixed states and long findings." />

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Pages</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/prototype/overview" className={CARD_CLASS}>
            <Card className="h-full transition-colors group-hover:bg-popover">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Overview</CardTitle>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Stat cards, 14-day activity, success rate, severity split and recent scans.</CardContent>
            </Card>
          </Link>
          <Link to="/prototype/scans" className={CARD_CLASS}>
            <Card className="h-full transition-colors group-hover:bg-popover">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Scans list</CardTitle>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">40 rows with every status, skill and model, plus a very long repository name.</CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Scan reports</h2>
        <div className="grid grid-cols-3 gap-4">
          {PROTOTYPE_FEATURED.map((item) => (
            <Link key={item.scanId} to="/prototype/scans/$scanId" params={{ scanId: item.scanId }} className={CARD_CLASS}>
              <Card className="h-full transition-colors group-hover:bg-popover">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{item.title}</CardTitle>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.detail}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
