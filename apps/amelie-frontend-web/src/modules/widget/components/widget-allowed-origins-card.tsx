import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ALLOWED_ORIGINS_INVALID, UpdateTenantAllowedOriginsBodySchema } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { PageCard, PowerMark } from "#/modules/shared";
import { toAllowedOriginsPayload } from "../utils";

type WidgetAllowedOriginsCardProps = {
  allowedOrigins: string[];
  canEdit: boolean;
  isPending: boolean;
  error: string | null;
  onSave: (allowedOrigins: string[]) => void;
};

const EMPTY_WARNING = "The cafe site cannot iframe the chat. Chat on Amelie still works.";

export function WidgetAllowedOriginsCard({
  allowedOrigins,
  canEdit,
  isPending,
  error,
  onSave,
}: WidgetAllowedOriginsCardProps) {
  const [rows, setRows] = useState(allowedOrigins);
  const [localError, setLocalError] = useState<string | null>(null);

  const payload = toAllowedOriginsPayload(rows);
  const empty = payload.length === 0;

  const save = () => {
    const parsed = UpdateTenantAllowedOriginsBodySchema.safeParse({ allowedOrigins: payload });
    if (!parsed.success) {
      setLocalError(ALLOWED_ORIGINS_INVALID);
      return;
    }
    setLocalError(null);
    onSave(payload);
  };

  return (
    <PageCard
      title="Allowed origins"
      description="Websites that may iframe the Customer chat. Paste a page URL; Amelie keeps the origin."
      action={canEdit ? <PowerMark power="integration:widget:origins:update" /> : undefined}
    >
      {empty ? <p className="mb-4 text-sm text-muted-foreground">{EMPTY_WARNING}</p> : null}
      {canEdit ? (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Allowed origin ${index + 1}`}
                placeholder="https://your-cafe.com"
                className="min-w-0 flex-1"
                value={row}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = event.target.value;
                  setRows(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove allowed origin ${index + 1}`}
                title="Remove"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : empty ? null : (
        <ul className="space-y-2">
          {allowedOrigins.map((origin) => (
            <li key={origin} className="text-sm break-all">
              {origin}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, ""])}>
            <Plus />
            Add website
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={save}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : null}
      {localError || error ? <p className="mt-4 text-xs text-destructive">{localError ?? error}</p> : null}
    </PageCard>
  );
}
