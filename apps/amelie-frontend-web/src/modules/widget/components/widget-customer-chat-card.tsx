import { useState } from "react";
import {
  CUSTOMER_CHAT_APPEARANCE_INVALID,
  CUSTOMER_CHAT_LABEL_DEFAULT,
  CUSTOMER_CHAT_LABEL_MAX,
} from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { PageCard } from "#/modules/shared";
import { toAccentSwatchValue } from "../utils";

type WidgetCustomerChatCardProps = {
  customerChatLabel: string;
  customerChatAccent: string | null;
  canEdit: boolean;
  isPending: boolean;
  error: string | null;
  onSave: (look: { customerChatLabel: string; customerChatAccent: string | null }) => void;
};

const FIELD_CLASS = "flex flex-col gap-1.5 text-sm";

export function WidgetCustomerChatCard({
  customerChatLabel,
  customerChatAccent,
  canEdit,
  isPending,
  error,
  onSave,
}: WidgetCustomerChatCardProps) {
  const [label, setLabel] = useState(customerChatLabel);
  const [accent, setAccent] = useState(customerChatAccent);
  const [localError, setLocalError] = useState<string | null>(null);

  const save = () => {
    const trimmed = label.trim();
    if (trimmed.length < 1 || trimmed.length > CUSTOMER_CHAT_LABEL_MAX) {
      setLocalError(CUSTOMER_CHAT_APPEARANCE_INVALID);
      return;
    }
    setLocalError(null);
    onSave({ customerChatLabel: trimmed, customerChatAccent: accent });
  };

  return (
    <PageCard
      title="Customer chat look"
      description="Bubble colour on the cafe site. The name is the accessible label, not title text."
    >
      {canEdit ? (
        <div className="flex flex-col gap-3">
          <label htmlFor="customer-chat-label" className={FIELD_CLASS}>
            Button label
            <Input
              id="customer-chat-label"
              value={label}
              maxLength={CUSTOMER_CHAT_LABEL_MAX}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <div className={FIELD_CLASS}>
            <label htmlFor="customer-chat-accent">Colour</label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="customer-chat-accent"
                type="color"
                className="h-10 w-14 cursor-pointer p-1"
                value={toAccentSwatchValue(accent)}
                onChange={(event) => setAccent(event.target.value)}
              />
              <p className="text-muted-foreground">{accent ?? "Amelie default"}</p>
              {accent ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setAccent(null)}>
                  Use default
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-3">
            <Button type="button" size="sm" disabled={isPending} onClick={save}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p>{customerChatLabel || CUSTOMER_CHAT_LABEL_DEFAULT}</p>
          <p className="text-muted-foreground">{customerChatAccent ?? "Amelie default"}</p>
        </div>
      )}
      {localError || error ? <p className="mt-4 text-xs text-destructive">{localError ?? error}</p> : null}
    </PageCard>
  );
}
