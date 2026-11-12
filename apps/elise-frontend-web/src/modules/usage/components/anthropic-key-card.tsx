import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { removeAnthropicKey, setAnthropicKey } from "../api";
import { anthropicKeyQuery, usageKeys } from "../hooks";
import { usageChangedAt } from "../utils";
import { AnthropicKeyForm } from "./anthropic-key-form";

export function AnthropicKeyCard() {
  const { data } = useSuspenseQuery(anthropicKeyQuery());
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const own = data.source === "account";

  const save = useMutation({
    mutationFn: (apiKey: string) => setAnthropicKey({ data: { apiKey } }),
    onSuccess: async (key) => {
      queryClient.setQueryData(usageKeys.anthropicKey(), key);
      setEditing(false);
      toast.success(`New scans now use your key ending in ${key.lastFour}.`);
      await queryClient.invalidateQueries({ queryKey: usageKeys.changes() });
    },
    onError: (error: Error) => toast.error(`We couldn't save the key. ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: () => removeAnthropicKey(),
    onSuccess: async (key) => {
      queryClient.setQueryData(usageKeys.anthropicKey(), key);
      toast.success("New scans use the Elise key again.");
      await queryClient.invalidateQueries({ queryKey: usageKeys.changes() });
    },
    onError: (error: Error) => toast.error(`We couldn't remove the key. ${error.message}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anthropic API key</CardTitle>
        <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
          Scans run on Elise&apos;s key by default. Bring your own and new scans run on it, billed to your Anthropic organization. A scan already running keeps the key it started with. The monthly budget still applies.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-sm font-medium">{own ? "Your own key" : "Elise's key"}</p>
            {own && data.lastFour !== null && (
              <p className="text-sm text-muted-foreground">
                <span className="font-mono">sk-ant-…{data.lastFour}</span>
                {data.updatedAt !== null && ` · saved ${usageChangedAt(data.updatedAt)}`}
              </p>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <KeyRound aria-hidden="true" />
                {own ? "Replace key" : "Use my own key"}
              </Button>
              {own && (
                <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
                  {remove.isPending ? "Removing" : "Remove key"}
                </Button>
              )}
            </div>
          )}
        </div>
        {editing && <AnthropicKeyForm pending={save.isPending} onSave={(apiKey) => save.mutate(apiKey)} onCancel={() => setEditing(false)} />}
      </CardContent>
    </Card>
  );
}
