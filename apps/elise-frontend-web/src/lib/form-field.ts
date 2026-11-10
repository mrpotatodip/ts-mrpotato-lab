import type { AnyFieldApi } from "@tanstack/react-form";
import { z } from "zod";

// -----
// A field's errors are strings (a custom validator) or zod issues
// (a schema validator). Parse the first one into its message
// instead of casting it.
// -----
const FieldErrorSchema = z.union([z.string(), z.object({ message: z.string() }).transform((issue) => issue.message)]);

export const fieldMessage = (field: AnyFieldApi): string | undefined => {
  const parsed = FieldErrorSchema.safeParse(field.state.meta.errors[0]);
  return parsed.success ? parsed.data : undefined;
};

export const fieldErrorId = (id: string) => `${id}-error`;

// -----
// The ARIA link between an input and its error (or its help line).
// Spread it on the input next to `id`.
// -----
export const fieldAria = (field: AnyFieldApi, id: string, helpId?: string) => {
  const invalid = fieldMessage(field) !== undefined;
  const described = [invalid ? fieldErrorId(id) : undefined, helpId].filter((part) => part !== undefined).join(" ");
  return {
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": described === "" ? undefined : described,
  };
};

// -----
// After a submit that failed on input, put the cursor on the first field
// with an error, so a keyboard or screen reader user lands where the fix is.
// Wait a frame: the errors are painted (aria-invalid set) after the submit.
// -----
export const focusFirstInvalidField = () => {
  requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
};
