import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { createScan } from "../api";
import { scanKeys } from "../hooks";
import {
  CreateScanInputSchema,
  SCAN_EFFORTS,
  SCAN_MODELS,
  SCAN_PROFILES,
  SCAN_SKILLS,
  type CreateScanInput,
} from "../schemas";

const FIELD_CLASS = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function ScanSelect<T extends string>({
  id,
  options,
  value,
  disabled,
  onPick,
}: {
  id: string;
  options: readonly T[];
  value: T;
  disabled?: boolean;
  onPick: (value: T) => void;
}) {
  return (
    <select
      id={id}
      className={FIELD_CLASS}
      disabled={disabled}
      value={value}
      onChange={(e) => {
        const picked = options.find((o) => o === e.target.value);
        if (picked) onPick(picked);
      }}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

const INITIAL: CreateScanInput = {
  repo: "",
  model: "claude-sonnet-5-5",
  effort: "high",
  skill: "lite",
  profile: "quick",
};

export function ScanNewForm() {
  const [values, setValues] = useState(INITIAL);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const start = useMutation({
    mutationFn: (input: CreateScanInput) => createScan({ data: input }),
    onSuccess: async (scan) => {
      await queryClient.invalidateQueries({ queryKey: scanKeys.all });
      await navigate({ to: "/scans/$scanId", params: { scanId: scan.scanId } });
    },
    onError: (error) => toast.error(error.message),
  });

  const set = <K extends keyof CreateScanInput>(key: K, value: CreateScanInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = CreateScanInputSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    start.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New scan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="repo">Repository</Label>
            <Input
              id="repo"
              placeholder="https://github.com/owner/name"
              value={values.repo}
              onChange={(e) => set("repo", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <ScanSelect id="model" options={SCAN_MODELS} value={values.model} onPick={(v) => set("model", v)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="effort">Effort</Label>
              <ScanSelect id="effort" options={SCAN_EFFORTS} value={values.effort} onPick={(v) => set("effort", v)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skill">Skill</Label>
              <ScanSelect id="skill" options={SCAN_SKILLS} value={values.skill} onPick={(v) => set("skill", v)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile">Profile (full only)</Label>
              <ScanSelect id="profile" options={SCAN_PROFILES} value={values.profile} disabled={values.skill !== "full"} onPick={(v) => set("profile", v)} />
            </div>
          </div>
          <div>
            <Button type="submit" disabled={start.isPending}>
              {start.isPending ? "Starting…" : "Start scan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
