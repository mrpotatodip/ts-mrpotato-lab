import { useId } from "react";

import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

type ScheduleHoursFieldsProps = {
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
  onChange: (next: { isClosed: boolean; opensAt: string; closesAt: string }) => void;
};

// -----
// Closed, or opening and closing time. A closed
// day shows no times, like the server expects.
// -----
export function ScheduleHoursFields({ isClosed, opensAt, closesAt, onChange }: ScheduleHoursFieldsProps) {
  const closedId = useId();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={closedId}
          checked={isClosed}
          onCheckedChange={(checked) => onChange({ isClosed: checked === true, opensAt, closesAt })}
        />
        <Label htmlFor={closedId} className="font-normal">
          Closed
        </Label>
      </div>
      {isClosed ? null : (
        <>
          <Input
            type="time"
            aria-label="Opens at"
            className="w-32"
            value={opensAt}
              onChange={(event) => onChange({ isClosed, opensAt: event.target.value, closesAt })}
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="time"
            aria-label="Closes at"
            className="w-32"
            value={closesAt}
              onChange={(event) => onChange({ isClosed, opensAt, closesAt: event.target.value })}
          />
        </>
      )}
    </div>
  );
}
