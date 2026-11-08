import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/15 text-primary-ink",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-status-danger/25 bg-status-danger-soft text-status-danger",
        success: "border-status-success/25 bg-status-success-soft text-status-success",
        warning: "border-status-warning/25 bg-status-warning-soft text-status-warning",
        info: "border-status-info/25 bg-status-info-soft text-status-info",
        neutral: "border-status-neutral/20 bg-status-neutral-soft text-status-neutral",
        outline: "border-input text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
