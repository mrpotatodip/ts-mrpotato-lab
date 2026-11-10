import { Card, CardContent, CardHeader } from "#/components/ui/card"
import { cn } from "#/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  )
}

// -----
// bg-muted is the card header's own colour and vanishes there, so a bar that
// sits inside a card uses a foreground tint instead.
// -----
function SkeletonBar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("bg-foreground/10", className)} {...props} />
}

const range = (count: number) => Array.from({ length: count }, (_, index) => index)

function SkeletonCard({
  rows = 3,
  rowClassName = "h-14",
  className,
}: {
  rows?: number
  rowClassName?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="gap-1.5">
        <SkeletonBar className="h-5 w-32" />
        <SkeletonBar className="h-4 w-56" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {range(rows).map((row) => (
          <SkeletonBar key={row} className={cn("w-full", rowClassName)} />
        ))}
      </CardContent>
    </Card>
  )
}

function SkeletonStatStrip() {
  return (
    <Card className="grid h-47 divide-x md:grid-cols-4">
      {range(4).map((cell) => (
        <div key={cell} className="grid content-start gap-4 p-7">
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-9 w-12" />
          <SkeletonBar className="h-4 w-40" />
        </div>
      ))}
    </Card>
  )
}

export { range, Skeleton, SkeletonBar, SkeletonCard, SkeletonStatStrip }
