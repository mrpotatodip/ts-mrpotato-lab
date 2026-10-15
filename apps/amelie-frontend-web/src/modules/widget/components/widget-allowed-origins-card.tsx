import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { PageCard } from "#/modules/shared";

type WidgetAllowedOriginsCardProps = {
  allowedOrigins: readonly string[];
  canEdit: boolean;
  isPending?: boolean;
  error?: string | null;
  onSave: (allowedOrigins: string[]) => void;
};

const filledRows = (rows: readonly string[]) => rows.map((row) => row.trim()).filter((row) => row.length > 0);

export function WidgetAllowedOriginsCard({
  allowedOrigins,
  canEdit,
  isPending = false,
  error = null,
  onSave,
}: WidgetAllowedOriginsCardProps) {
  const [rows, setRows] = useState(() => (allowedOrigins.length > 0 ? [...allowedOrigins] : [""]));
  const empty = filledRows(canEdit ? rows : allowedOrigins).length === 0;

  return (
    <PageCard
      title="Allowed origins"
      description="Websites that may embed the Customer chat. Paste a page URL; Amelie stores the origin."
    >
      {canEdit ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSave(filledRows(rows));
          }}
        >
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label="Allowed origin"
                placeholder="https://yourcafe.com"
                value={row}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = event.target.value;
                  setRows(next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Remove website"
                title="Remove"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, ""])}>
              <Plus />
              Add website
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {allowedOrigins.map((origin) => (
            <li key={origin}>{origin}</li>
          ))}
        </ul>
      )}
      {empty ? (
        <p className="text-muted-foreground mt-3 text-sm">
          The cafe site cannot iframe the chat. Customers can still use the chat on Amelie.
        </p>
      ) : null}
      {error ? <p className="text-destructive mt-3 text-xs">{error}</p> : null}
    </PageCard>
  );
}
