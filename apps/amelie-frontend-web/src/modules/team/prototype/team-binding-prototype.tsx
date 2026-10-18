// PROTOTYPE (throwaway): three variants of the member-edit and invite forms for
// binding a team member to Countries or Locations, on the existing /team route,
// switched with ?variant=A|B|C. Stub data, nothing is saved.
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, TriangleAlert, X } from "lucide-react";
import type { TeamRole } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { PageCard, PageHeader } from "#/modules/shared";
import { TeamRoleSelect } from "../components/team-role-select";
import {
  PROTO_COUNTRIES,
  PROTO_LOCATIONS,
  PROTO_MEMBERS,
  PROTO_ROLES,
  affectedByArchive,
  coveredLocations,
  describeAccess,
  hasNoActiveLocations,
  isCountryBound,
  isLocationBound,
  protoCountryName,
  protoLocationName,
  protoRole,
  toggleBinding,
  type ProtoAccess,
  type ProtoBinding,
  type ProtoMember,
} from "./team-binding-prototype-data";

export type ProtoVariant = "A" | "B" | "C";
const VARIANTS: { key: ProtoVariant; name: string }[] = [
  { key: "A", name: "Radio choice" },
  { key: "B", name: "Country tree" },
  { key: "C", name: "Chips" },
];
const ROLES = PROTO_ROLES.map(({ key, label }) => ({ key, label })) as unknown as TeamRole[];

type PickerProps = { value: ProtoAccess; onChange: (next: ProtoAccess) => void };

// ---------- A: three radio cards, a checklist only when you pick a part ----------
function PickerA({ value, onChange }: PickerProps) {
  const mode = value === null ? null : value.mode === "whole" ? "whole" : "bound";
  const card = (key: "whole" | "bound", title: string, hint: string) => (
    <button
      type="button"
      key={key}
      aria-pressed={mode === key}
      onClick={() => onChange(key === "whole" ? { mode: "whole" } : value?.mode === "bound" ? value : null)}
      className={`flex flex-col gap-0.5 rounded-2xl border p-3 text-left text-sm transition-colors ${mode === key ? "border-primary bg-accent/50" : "hover:bg-accent/40"}`}
    >
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </button>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {card("whole", "Whole cafe", "Every Country and Location, including new ones.")}
        {card("bound", "Only some", "Pick Countries or Locations below.")}
      </div>
      {mode === null ? <p className="text-muted-foreground text-xs">Choose one. There is no default.</p> : null}
      {mode === "bound" || (mode === null && value === null) ? (
        <div className="rounded-2xl border p-3">
          {PROTO_COUNTRIES.map((country) => (
            <div key={country.id} className="flex flex-col gap-1 py-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={isCountryBound(value, country.id)}
                  onCheckedChange={() => onChange(toggleBinding(value, { kind: "country", id: country.id }))}
                />
                All of {country.name}
                <span className="text-muted-foreground text-xs font-normal">(includes new Locations)</span>
              </Label>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
                {PROTO_LOCATIONS.filter((l) => l.countryId === country.id && !l.archived).map((location) => (
                  <Label key={location.id} className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={isLocationBound(value, location.id) || isCountryBound(value, country.id)}
                      disabled={isCountryBound(value, country.id)}
                      onCheckedChange={() => onChange(toggleBinding(value, { kind: "location", id: location.id }))}
                    />
                    {location.name}
                  </Label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------- B: one tree, Country rows are tri-state, "Whole cafe" is a switch row ----------
function PickerB({ value, onChange }: PickerProps) {
  const whole = value?.mode === "whole";
  return (
    <div className="overflow-hidden rounded-2xl border">
      <Label className="bg-muted/40 flex items-center justify-between px-4 py-3 text-sm font-medium">
        <span>
          Whole cafe
          <span className="text-muted-foreground block text-xs font-normal">Nothing is limited. Untick to choose parts.</span>
        </span>
        <Checkbox checked={whole} onCheckedChange={(checked) => onChange(checked ? { mode: "whole" } : null)} />
      </Label>
      {PROTO_COUNTRIES.map((country) => {
        const locations = PROTO_LOCATIONS.filter((l) => l.countryId === country.id && !l.archived);
        const countryOn = isCountryBound(value, country.id);
        const some = locations.some((l) => isLocationBound(value, l.id));
        return (
          <div key={country.id} className={`border-t ${whole ? "opacity-50" : ""}`}>
            <Label className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium">
              <Checkbox
                disabled={whole}
                checked={countryOn}
                indeterminate={!countryOn && some}
                onCheckedChange={() => onChange(toggleBinding(whole ? null : value, { kind: "country", id: country.id }))}
              />
              {country.name}
              <span className="text-muted-foreground ml-auto text-xs font-normal">
                {countryOn ? "all, even new Locations" : some ? "some Locations" : ""}
              </span>
            </Label>
            {locations.map((location) => (
              <Label key={location.id} className="flex items-center gap-3 py-2 pr-4 pl-11 text-sm font-normal">
                <Checkbox
                  disabled={whole || countryOn}
                  checked={countryOn || isLocationBound(value, location.id)}
                  onCheckedChange={() => onChange(toggleBinding(value, { kind: "location", id: location.id }))}
                />
                {location.name}
              </Label>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---------- C: chips with an add list; empty state asks for a choice ----------
function PickerC({ value, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const bindings: ProtoBinding[] = value?.mode === "bound" ? value.bindings : [];
  const chip = (label: string, onRemove: () => void, key: string) => (
    <Badge key={key} variant="secondary" className="gap-1 py-1 pr-1.5 text-sm font-normal">
      {label}
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="hover:text-destructive">
        <X className="size-3.5" />
      </button>
    </Badge>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border p-2">
        {value?.mode === "whole" ? chip("Whole cafe", () => onChange(null), "whole") : null}
        {bindings.map((b) =>
          chip(
            b.kind === "country" ? `All of ${protoCountryName(b.id)}` : protoLocationName(b.id),
            () => onChange(toggleBinding(value, b)),
            `${b.kind}-${b.id}`,
          ),
        )}
        {value === null ? <span className="text-muted-foreground px-1 text-xs">Nothing chosen yet</span> : null}
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setOpen((o) => !o)}>
          {open ? "Done" : "Add"}
        </Button>
      </div>
      {open ? (
        <div className="flex flex-col gap-1 rounded-2xl border p-2 text-sm">
          <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => onChange({ mode: "whole" })}>
            Whole cafe
          </Button>
          {PROTO_COUNTRIES.map((country) => (
            <div key={country.id} className="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start font-medium"
                onClick={() => onChange(toggleBinding(value?.mode === "whole" ? null : value, { kind: "country", id: country.id }))}
              >
                All of {country.name}
              </Button>
              {PROTO_LOCATIONS.filter((l) => l.countryId === country.id && !l.archived).map((location) => (
                <Button
                  key={location.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground justify-start pl-8"
                  onClick={() => onChange(toggleBinding(value?.mode === "whole" ? null : value, { kind: "location", id: location.id }))}
                >
                  {location.name}
                </Button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const PICKERS: Record<ProtoVariant, (props: PickerProps) => ReactNode> = { A: PickerA, B: PickerB, C: PickerC };

// How a member's access reads on the list row (also differs per variant).
function AccessSummary({ variant, member }: { variant: ProtoVariant; member: ProtoMember }) {
  const bindable = protoRole(member.role)?.bindable;
  const warn = hasNoActiveLocations(member.access);
  if (!bindable) return <span className="text-muted-foreground text-xs">Whole cafe (this Role is never limited)</span>;
  const text = describeAccess(member.access);
  const chips = member.access?.mode === "bound" ? member.access.bindings : [];
  return (
    <div className="flex flex-col gap-1">
      {variant === "C" ? (
        <div className="flex flex-wrap gap-1.5">
          {member.access?.mode === "whole" ? <Badge variant="outline">Whole cafe</Badge> : null}
          {chips.map((b) => (
            <Badge key={`${b.kind}-${b.id}`} variant="secondary" className="font-normal">
              {b.kind === "country" ? `All of ${protoCountryName(b.id)}` : protoLocationName(b.id)}
            </Badge>
          ))}
        </div>
      ) : variant === "B" ? (
        <span className="text-muted-foreground text-xs">
          {member.access?.mode === "whole" ? "Whole cafe" : `${coveredLocations(member.access).length} Locations: ${text}`}
        </span>
      ) : (
        <Badge variant={member.access?.mode === "whole" ? "outline" : "secondary"} className="w-fit font-normal">
          {text}
        </Badge>
      )}
      {warn ? (
        <span className="text-destructive flex items-center gap-1 text-xs">
          <TriangleAlert className="size-3.5" /> No active Locations: every limited action is refused until you reassign.
        </span>
      ) : null}
    </div>
  );
}

function EditDialog({ variant, member, onClose, onSave }: { variant: ProtoVariant; member: ProtoMember | null; onClose: () => void; onSave: (m: ProtoMember) => void }) {
  const [role, setRole] = useState(member?.role ?? "");
  const [access, setAccess] = useState<ProtoAccess>(member?.access ?? null);
  useEffect(() => {
    setRole(member?.role ?? "");
    setAccess(member?.access ?? null);
  }, [member]);
  const Picker = PICKERS[variant];
  const bindable = protoRole(role)?.bindable ?? false;
  const effective: ProtoAccess = bindable ? access : { mode: "whole" };
  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Access for {member?.name}</DialogTitle>
          <DialogDescription>Role and where it applies.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="stat-label">Role</label>
            <TeamRoleSelect aria-label="Role" roles={ROLES} value={role} valueLabel={protoRole(role)?.label ?? ""} onChange={(r) => { setRole(r); if (!protoRole(r)?.bindable) setAccess(null); }} />
          </div>
          {bindable ? (
            <div className="flex flex-col gap-1.5">
              <label className="stat-label">Where</label>
              <Picker value={access} onChange={setAccess} />
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">This Role is never limited, so any Locations are cleared when you save.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={effective === null} onClick={() => member && onSave({ ...member, role, access: effective })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteCard({ variant }: { variant: ProtoVariant }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("store_staff");
  const [access, setAccess] = useState<ProtoAccess>(null);
  const [sent, setSent] = useState(false);
  const Picker = PICKERS[variant];
  const bindable = protoRole(role)?.bindable ?? false;
  const ready = email !== "" && (!bindable || access !== null);
  return (
    <PageCard title="Invite" description="Send a join link. Amelie does not email it.">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
        <div className="flex flex-col gap-1.5">
          <label className="stat-label" htmlFor="proto-email">Email</label>
          <Input id="proto-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} placeholder="Who is this for?" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="stat-label">Role</label>
          <TeamRoleSelect aria-label="Role" roles={ROLES} value={role} valueLabel={protoRole(role)?.label ?? ""} onChange={(r) => { setRole(r); setAccess(null); }} />
        </div>
        {bindable ? (
          <div className="flex flex-col gap-1.5">
            <label className="stat-label">Where</label>
            <Picker value={access} onChange={setAccess} />
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-3">
          <Button type="submit" size="sm" disabled={!ready}>Invite</Button>
          {sent ? <span className="text-muted-foreground text-xs">Invite created (stub, nothing saved).</span> : null}
          {!ready && email !== "" ? <span className="text-muted-foreground text-xs">Choose where this Role applies first.</span> : null}
        </div>
      </form>
    </PageCard>
  );
}

function ArchiveCard({ members }: { members: ProtoMember[] }) {
  const [target, setTarget] = useState<string | null>(null);
  const affected = target ? affectedByArchive(members, target) : [];
  return (
    <PageCard title="Locations" description="Preview of the archive confirmation.">
      <div className="flex flex-wrap gap-2">
        {PROTO_LOCATIONS.filter((l) => !l.archived).map((l) => (
          <Button key={l.id} type="button" variant="outline" size="sm" onClick={() => setTarget(l.id)}>
            Archive {l.name}
          </Button>
        ))}
      </div>
      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {target ? protoLocationName(target) : ""}?</DialogTitle>
            <DialogDescription>
              {affected.length === 0
                ? "No team member is left without an active Location."
                : `${affected.length} team member${affected.length === 1 ? "" : "s"} will be left with no active Location and cannot use limited actions until reassigned:`}
            </DialogDescription>
          </DialogHeader>
          {affected.length > 0 ? (
            <ul className="rounded-2xl border text-sm">
              {affected.map((m) => (
                <li key={m.id} className="border-b px-4 py-2 last:border-b-0">{m.name} <span className="text-muted-foreground text-xs">{m.email}</span></li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => setTarget(null)}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageCard>
  );
}

function RoleFlagCard() {
  const [on, setOn] = useState(true);
  const [error, setError] = useState(false);
  return (
    <PageCard title="Superuser: Store admin Role" description="The Role page setting (stub).">
      <Label className="flex items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={on}
          onCheckedChange={(checked) => { if (!checked) { setError(true); return; } setError(false); setOn(true); }}
        />
        Can be limited to Countries or Locations
      </Label>
      {error ? <p className="text-xs text-destructive mt-2">Cannot turn this off: 2 members still have bindings. Clear them first.</p> : null}
    </PageCard>
  );
}

function Switcher({ current }: { current: ProtoVariant }) {
  const navigate = useNavigate();
  const index = VARIANTS.findIndex((v) => v.key === current);
  const go = (offset: number) => {
    const next = VARIANTS[(index + offset + VARIANTS.length) % VARIANTS.length];
    void navigate({ to: ".", search: { variant: next.key }, replace: true });
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="bg-foreground text-background fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2 text-sm shadow-lg">
      <button type="button" aria-label="Previous variant" onClick={() => go(-1)}><ChevronLeft className="size-4" /></button>
      <span>{current} ({VARIANTS[index]?.name})</span>
      <button type="button" aria-label="Next variant" onClick={() => go(1)}><ChevronRight className="size-4" /></button>
    </div>
  );
}

export function TeamBindingPrototype({ variant }: { variant: ProtoVariant }) {
  const [members, setMembers] = useState<ProtoMember[]>(PROTO_MEMBERS);
  const [editing, setEditing] = useState<ProtoMember | null>(null);
  return (
    <>
      <PageHeader title="Team" description="PROTOTYPE: how a member is limited to Countries or Locations. Nothing is saved." />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div className="flex flex-col gap-8">
          <InviteCard key={variant} variant={variant} />
          <ArchiveCard members={members} />
          <RoleFlagCard />
        </div>
        <PageCard title="Team members" contentClassName="p-0">
          <ul className="divide-y">
            {members.map((member) => (
              <li key={member.id} className="hover:bg-accent/40 flex flex-wrap items-start justify-between gap-3 px-6 py-5">
                <div className="flex min-w-0 flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">{member.name} <span className="text-muted-foreground text-xs font-normal">{protoRole(member.role)?.label}</span></p>
                    <p className="stat-label break-all">{member.email}</p>
                  </div>
                  <AccessSummary variant={variant} member={member} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(member)}>Edit access</Button>
              </li>
            ))}
          </ul>
        </PageCard>
      </div>
      <EditDialog
        variant={variant}
        member={editing}
        onClose={() => setEditing(null)}
        onSave={(next) => { setMembers((all) => all.map((m) => (m.id === next.id ? next : m))); setEditing(null); }}
      />
      {import.meta.env.PROD ? null : <Switcher current={variant} />}
    </>
  );
}
