import { fieldErrorId } from "#/lib/form-field";

type FieldErrorProps = {
  id: string;
  message: string | undefined;
};

// -----
// The one error line under a field. `id` is the input's id; the
// input points at this line with `fieldAria`.
// -----
function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={fieldErrorId(id)} role="alert" className="text-xs text-status-danger">
      {message}
    </p>
  );
}

export { FieldError };
