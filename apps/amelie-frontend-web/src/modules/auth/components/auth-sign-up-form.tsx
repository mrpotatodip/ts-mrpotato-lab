import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import {
  SIGN_UP_PASSWORD_MAX,
  SIGN_UP_PASSWORD_MIN,
  SignUpBodySchema,
} from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { RegionFields, currencyForCountry } from "#/modules/shared";

import { useAuthActions } from "../hooks";
import { countryFromLocale } from "../utils";

type FormValues = {
  inviteCode: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  cafeName: string;
  timezone: string;
  country: string;
  currency: string;
  website: string;
};

type FieldName = keyof FormValues;

const LABEL_CLASS =
  "text-[10px] text-muted-foreground font-medium uppercase tracking-wide";

const FIELD_LABELS = {
  inviteCode: "Invite code",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  cafeName: "Cafe name",
  timezone: "Timezone",
  country: "Country",
  currency: "Currency",
  website: "Website",
} satisfies Record<FieldName, string>;

const FIELD_NAMES = Object.keys(FIELD_LABELS).filter(
  (key): key is FieldName => key in FIELD_LABELS,
);

// -----
// A blank website is left out: the contract
// rejects an empty string.
// -----
function toBody(value: FormValues) {
  const { website, ...rest } = value;
  const trimmed = website.trim();
  return trimmed ? { ...rest, website: trimmed } : rest;
}

function fieldMessage(field: FieldName, value: string): string {
  const label = FIELD_LABELS[field];
  if (!value.trim()) return `${label} is required`;
  if (field === "password") {
    return `Password must be ${SIGN_UP_PASSWORD_MIN} to ${SIGN_UP_PASSWORD_MAX} characters`;
  }
  if (field === "email") return "Enter a valid email";
  if (field === "website") return "Enter a full web address, like https://mycafe.com";
  return `${label} is too long or not valid`;
}

// -----
// Timezones the browser knows, plus the user's own
// in case the list leaves it out (UTC on some engines).
// -----
function listTimezones(current: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return current && !zones.includes(current) ? [current, ...zones] : zones;
}

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const EMPTY_VALUES: FormValues = {
  inviteCode: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  cafeName: "",
  timezone: "",
  country: "",
  currency: "",
  website: "",
};

type SignUpFormProps = {
  inviteCode?: string;
};

export function SignUpForm({ inviteCode }: SignUpFormProps) {
  const { signUp } = useAuthActions();

  const form = useForm({
    defaultValues: { ...EMPTY_VALUES, inviteCode: inviteCode ?? "" },
    validators: {
      onSubmit: ({ value }) => {
        const result = SignUpBodySchema.safeParse(toBody(value));
        if (result.success) return undefined;

        const fields: Partial<Record<FieldName, string>> = {};
        for (const issue of result.error.issues) {
          const name = FIELD_NAMES.find((n) => n === issue.path[0]);
          if (name && !fields[name]) {
            fields[name] = fieldMessage(name, value[name]);
          }
        }
        return { fields };
      },
    },
    onSubmit: ({ value }) => {
      signUp.mutate(SignUpBodySchema.parse(toBody(value)));
    },
  });

  // -----
  // Prefilled after mount: the server renders in its
  // own timezone, so reading it during render would mismatch.
  // -----
  useEffect(() => {
    if (!form.getFieldValue("timezone")) {
      form.setFieldValue("timezone", browserTimezone());
    }
  }, [form]);

  useEffect(() => {
    if (form.getFieldValue("country")) return;
    const country = countryFromLocale(navigator.language);
    form.setFieldValue("country", country);
    form.setFieldValue("currency", currencyForCountry(country));
  }, [form]);

  const text = (
    name: Exclude<FieldName, "timezone" | "country" | "currency">,
    props: {
      type?: string;
      autoComplete?: string;
      placeholder?: string;
      hint?: string;
    } = {},
  ) => (
    <form.Field name={name}>
      {(field) => (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={name} className={LABEL_CLASS}>
            {FIELD_LABELS[name]}
            {props.hint ? ` (${props.hint})` : ""}
          </label>
          <Input
            id={name}
            type={props.type ?? "text"}
            autoComplete={props.autoComplete}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder={props.placeholder}
          />
          {field.state.meta.errors.map((e, i) => (
            <span key={i} className="text-xs text-destructive">
              {String(e)}
            </span>
          ))}
        </div>
      )}
    </form.Field>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      {text("inviteCode", { placeholder: "Your invite code" })}
      <div className="grid grid-cols-2 gap-3">
        {text("firstName", { autoComplete: "given-name" })}
        {text("lastName", { autoComplete: "family-name" })}
      </div>
      {text("email", {
        type: "email",
        autoComplete: "email",
        placeholder: "you@example.com",
      })}
      {text("password", {
        type: "password",
        autoComplete: "new-password",
        placeholder: "••••••••",
      })}
      {text("cafeName", { placeholder: "Sorella Cafe" })}

      <form.Field name="timezone">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="timezone" className={LABEL_CLASS}>
              {FIELD_LABELS.timezone}
            </label>
            <Select value={field.state.value} onValueChange={(value) => field.handleChange(value ?? "")}>
              <SelectTrigger id="timezone">
                <SelectValue>{field.state.value === "" ? "Loading..." : field.state.value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {listTimezones(field.state.value).map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.state.meta.errors.map((e, i) => (
              <span key={i} className="text-xs text-destructive">
                {String(e)}
              </span>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="country">
        {(countryField) => (
          <form.Field name="currency">
            {(currencyField) => (
              <RegionFields
                country={countryField.state.value}
                currency={currencyField.state.value}
                errors={{ country: countryField.state.meta.errors, currency: currencyField.state.meta.errors }}
                onChange={(region) => {
                  countryField.handleChange(region.country);
                  currencyField.handleChange(region.currency);
                }}
                className="grid grid-cols-2 gap-3"
                labelClassName={LABEL_CLASS}
              />
            )}
          </form.Field>
        )}
      </form.Field>

      {text("website", {
        type: "url",
        autoComplete: "url",
        placeholder: "https://sorellacafe.com",
        hint: "optional",
      })}

      {signUp.isError && (
        <p className="text-xs text-destructive">
          {signUp.error instanceof Error
            ? signUp.error.message
            : "Could not start your cafe"}
        </p>
      )}

      <Button type="submit" disabled={signUp.isPending} className="w-full">
        {signUp.isPending ? "Starting your cafe..." : "Start your cafe"}
      </Button>
    </form>
  );
}
