import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { tryCatch } from "#/lib/try-catch";
import { PageCard } from "#/modules/shared";
import { toWidgetSnippet, type WidgetLocationExample } from "../utils";

const SNIPPET_CLASS = "overflow-x-auto break-all whitespace-pre-wrap rounded-md bg-muted px-3 py-2 font-mono text-sm";

type WidgetInstallCardProps = {
  slug: string;
  origin: string;
  locations: WidgetLocationExample[];
};

export function WidgetInstallCard({ slug, origin, locations }: WidgetInstallCardProps) {
  const pinned = locations.length === 1 ? locations[0] : undefined;
  const snippet = toWidgetSnippet(origin, slug, pinned ? { location: pinned.slug, country: pinned.country } : {});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    const { error } = await tryCatch(navigator.clipboard.writeText(snippet));
    setCopyState(error ? "failed" : "copied");
  };

  return (
    <PageCard
      title="Install on your website"
      description="Paste this on the cafe site. Only websites in Allowed origins can iframe the chat."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copyState === "copied" ? <Check /> : <Copy />}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
        </Button>
      }
    >
      <pre className={SNIPPET_CLASS}>{snippet}</pre>
      <Link
        to="/chat/$slug"
        params={{ slug }}
        className={cn(buttonVariants({ variant: "link", size: "sm" }), "mt-4 h-auto w-fit px-0")}
      >
        Try the chat on Amelie
      </Link>
      <WidgetLocationGuide origin={origin} slug={slug} locations={locations} />
    </PageCard>
  );
}

function WidgetLocationGuide({
  origin,
  slug,
  locations,
}: {
  origin: string;
  slug: string;
  locations: WidgetLocationExample[];
}) {
  return (
    <div className="mt-6 space-y-3 border-t pt-6">
      <p className="text-sm font-medium">Country and location</p>
      <p className="text-sm text-muted-foreground">
        Add <code className="text-foreground">data-location</code> with the Location slug and{" "}
        <code className="text-foreground">data-country</code> with the country code on the same tag. The chat stores
        them when the thread starts. If both are set, the location's country wins. If they disagree, the chat will
        not start.
      </p>
      <p className="text-sm text-muted-foreground">
        You can leave them off. The assistant then asks which location when hours, address, or prices depend on it.
      </p>
      {locations.length > 1 ? (
        <p className="text-sm text-muted-foreground">Use the location for that website.</p>
      ) : null}
      {locations.length > 0 ? (
        <ul className="space-y-4">
          {locations.map((location) => (
            <li key={location.slug} className="space-y-2">
              <p className="text-sm">
                {location.name}. <code className="text-foreground">data-location="{location.slug}"</code>{" "}
                <code className="text-foreground">data-country="{location.country}"</code>
              </p>
              {locations.length > 1 ? (
                <pre className={SNIPPET_CLASS}>
                  {toWidgetSnippet(origin, slug, { location: location.slug, country: location.country })}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
