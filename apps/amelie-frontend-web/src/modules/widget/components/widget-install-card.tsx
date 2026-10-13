import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { tryCatch } from "#/lib/try-catch";
import { PageCard } from "#/modules/shared";
import { toWidgetSnippet } from "../utils";

type WidgetInstallCardProps = {
  slug: string;
  origin: string;
};

export function WidgetInstallCard({ slug, origin }: WidgetInstallCardProps) {
  const snippet = toWidgetSnippet(origin, slug);
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
      <pre className="overflow-x-auto text-sm break-all whitespace-pre-wrap">{snippet}</pre>
      <p className="mt-4 text-sm">
        <Link className="underline" to="/chat/$slug" params={{ slug }}>
          Try the chat on Amelie
        </Link>
      </p>
    </PageCard>
  );
}
