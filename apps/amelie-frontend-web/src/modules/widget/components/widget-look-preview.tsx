import { toWidgetBubbleLook } from "../utils";

type WidgetLookPreviewProps = {
  customerChatLabel: string;
  customerChatAccent: string | null;
};

export function WidgetLookPreview({ customerChatLabel, customerChatAccent }: WidgetLookPreviewProps) {
  const look = toWidgetBubbleLook(customerChatLabel, customerChatAccent);

  return (
    <div
      role="img"
      aria-label={`Preview: ${look.label}`}
      className="relative h-[min(24rem,calc(100vh-22rem))] min-h-80 overflow-hidden rounded-lg border bg-muted"
    >
      <p className="absolute left-3 top-3 text-xs text-muted-foreground">Cafe site</p>
      <div
        className="absolute bottom-[88px] right-5 h-[min(20rem,calc(100%-7.5rem))] w-[min(23.75rem,calc(100%-2.5rem))] rounded-2xl bg-card shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
        aria-hidden="true"
      />
      <div
        className="absolute right-5 bottom-5 flex size-14 items-center justify-center rounded-full"
        style={{ background: look.background, color: look.color }}
        aria-hidden="true"
      >
        <WidgetBubbleIcon />
      </div>
    </div>
  );
}

function WidgetBubbleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block size-6"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
