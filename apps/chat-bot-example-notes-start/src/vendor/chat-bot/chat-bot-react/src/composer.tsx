import { useState, type FormEvent } from "react";

export type ComposerProps = {
  onSend: (text: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
};

// -----
// The input. Enter sends; while an answer streams, the
// button stops it.
// -----
export function Composer({ onSend, onStop, isLoading, placeholder }: ComposerProps) {
  const [draft, setDraft] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft("");
    onSend(text);
  };

  return (
    <form className="cb-composer" onSubmit={submit}>
      <input
        className="cb-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder ?? "Message"}
        aria-label="Message"
      />
      {isLoading ? (
        <button type="button" className="cb-button" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="submit" className="cb-button cb-button--primary" disabled={draft.trim() === ""}>
          Send
        </button>
      )}
    </form>
  );
}
