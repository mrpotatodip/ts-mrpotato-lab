import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "#/lib/utils"

function Breadcrumb(props: React.ComponentProps<"nav">) {
  return <nav data-slot="breadcrumb" aria-label="Breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="breadcrumb-list" className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)} {...props} />
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="breadcrumb-page" aria-current="page" className={cn("font-medium text-foreground", className)} {...props} />
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("text-muted-foreground/60 [&>svg]:size-3.5", className)} {...props}>
      <ChevronRight />
    </li>
  )
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage, BreadcrumbSeparator }
