import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

type CustomerThreadBubbleSkeletonProps = {
  side: "customer" | "assistant";
  lineWidths: string[];
};

function CustomerThreadBubbleSkeleton({ side, lineWidths }: CustomerThreadBubbleSkeletonProps) {
  const isCustomer = side === "customer";

  return (
    <li className={cn("flex flex-col gap-1", isCustomer ? "items-end self-end" : "items-start self-start")}>
      <div className={cn("flex flex-col gap-2 rounded-lg px-3 py-2.5", isCustomer ? "bg-primary/15" : "bg-muted")}>
        {lineWidths.map((width) => (
          <Skeleton key={width} className={cn("h-3.5 bg-foreground/15", width)} />
        ))}
      </div>
      <Skeleton className="h-3 w-28" />
    </li>
  );
}

// -----
// Chat bubbles on alternating sides, the shape of
// the messages that are about to load.
// -----
export function CustomerThreadMessagesSkeleton() {
  return (
    <ul className="flex flex-col gap-3">
      <CustomerThreadBubbleSkeleton side="customer" lineWidths={["w-44"]} />
      <CustomerThreadBubbleSkeleton side="assistant" lineWidths={["w-64", "w-48"]} />
      <CustomerThreadBubbleSkeleton side="customer" lineWidths={["w-36"]} />
      <CustomerThreadBubbleSkeleton side="assistant" lineWidths={["w-60", "w-56", "w-32"]} />
    </ul>
  );
}
