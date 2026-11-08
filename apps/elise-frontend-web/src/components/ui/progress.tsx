import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "#/lib/utils"

type ProgressProps = ProgressPrimitive.Root.Props & { indicatorClassName?: string }

function Progress({ className, indicatorClassName, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn("w-full", className)} {...props}>
      <ProgressPrimitive.Track className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator className={cn("h-full rounded-full bg-primary transition-[width] duration-500", indicatorClassName)} />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
