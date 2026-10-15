import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { timezoneOptions } from "../utils";

type LocationTimezoneSelectProps = {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
};

// -----
// A pick from the IANA zones the browser knows,
// as the Region card picks a country.
// -----
export function LocationTimezoneSelect({ value, onChange, disabled }: LocationTimezoneSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(timezone) => {
        if (timezone) onChange(timezone);
      }}
    >
      <SelectTrigger aria-label="Timezone" className="w-fit min-w-56">
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {timezoneOptions(value).map((zone) => (
          <SelectItem key={zone} value={zone}>
            {zone}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
