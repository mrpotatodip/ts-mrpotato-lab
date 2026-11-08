import type { ReactNode } from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "#/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return <RadioGroupPrimitive data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-input bg-background/60 transition-colors data-[checked]:border-primary data-[checked]:bg-primary",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-1.5 rounded-full bg-primary-foreground" />
    </RadioPrimitive.Root>
  )
}

type RadioCardProps = {
  value: string
  title: string
  description: string
  badge?: ReactNode
}

function RadioCard({ value, title, description, badge }: RadioCardProps) {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      data-slot="radio-card"
      className="flex cursor-pointer gap-3 rounded-xl border border-input bg-background/40 p-3.5 transition-colors hover:border-foreground/30 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-card has-[[data-checked]]:shadow-control has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
    >
      <RadioGroupItem value={value} />
      <span className="grid content-start gap-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

export { RadioGroup, RadioGroupItem, RadioCard }
