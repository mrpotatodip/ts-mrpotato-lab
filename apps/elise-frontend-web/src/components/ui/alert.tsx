import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

const alertVariants = cva(
  "relative flex items-start gap-3 rounded-xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive: "border-status-danger/25 bg-status-danger-soft text-status-danger",
        info: "border-status-info/25 bg-status-info-soft text-status-info",
        warning: "border-status-warning/25 bg-status-warning-soft text-status-warning",
        success: "border-status-success/25 bg-status-success-soft text-status-success",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role={variant === "destructive" ? "alert" : undefined} className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-description" className={cn("leading-relaxed", className)} {...props} />
}

export { Alert, AlertDescription }
