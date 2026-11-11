import { useId, type ReactNode } from "react"

import { cn } from "#/lib/utils"

type SegmentedProps<T extends string> = {
  label: string
  value: T
  options: readonly { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
  className?: string
}

// -----
// Equal-width segments over real radio inputs, so the arrow keys and the
// screen reader work as they do for any radio group. The thumb slides on
// transform only and holds still under reduced motion.
// -----
function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  const name = useId()
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )
  return (
    <fieldset
      data-slot="segmented"
      className={cn("relative m-0 grid min-w-0 rounded-lg border-0 bg-muted p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{label}</legend>
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-md bg-card shadow-control transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "relative flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            option.value === value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} className="sr-only" />
          {option.icon}
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

export { Segmented }
