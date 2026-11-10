import { useForm } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { anthropicKeyError } from "../utils";

type AnthropicKeyFormProps = {
  pending: boolean;
  onSave: (apiKey: string) => void;
  onCancel: () => void;
};

const INPUT_ID = "anthropic-key";
const HELP_ID = "anthropic-key-help";

export function AnthropicKeyForm({ pending, onSave, onCancel }: AnthropicKeyFormProps) {
  const form = useForm({
    defaultValues: { apiKey: "" },
    onSubmit: ({ value }) => onSave(value.apiKey.trim()),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-2"
    >
      <form.Field name="apiKey" validators={{ onSubmit: ({ value }) => anthropicKeyError(value) }}>
        {(field) => (
          <>
            <Label htmlFor={INPUT_ID}>Anthropic API key</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id={INPUT_ID}
                name={field.name}
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-ant-..."
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-8 w-80 max-w-full font-mono"
                {...fieldAria(field, INPUT_ID, HELP_ID)}
              />
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Checking" : "Save key"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <FieldError id={INPUT_ID} message={fieldMessage(field)} />
            <p id={HELP_ID} className="text-sm leading-relaxed text-muted-foreground">
              We test the key with Anthropic before saving it. It is stored encrypted and never shown again, only its last four characters.
            </p>
          </>
        )}
      </form.Field>
    </form>
  );
}
