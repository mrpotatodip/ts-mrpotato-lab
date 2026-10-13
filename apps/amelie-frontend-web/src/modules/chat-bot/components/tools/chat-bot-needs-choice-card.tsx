import { Badge } from "#/components/ui/badge";

type ChatBotNeedsChoiceCardProps = {
  message: string;
  options: string[];
};

export function ChatBotNeedsChoiceCard({ message, options }: ChatBotNeedsChoiceCardProps) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>{message}</p>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <Badge key={option} variant="outline" className="font-normal">
              {option}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
