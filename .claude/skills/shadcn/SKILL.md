---
name: shadcn
description: shadcn/ui component patterns — cn(), cva, form integration, theming with Tailwind v4
---

# shadcn/ui

Use shadcn/ui as the component library. shadcn is not a dependency — it copies source files into `components/ui/`. Components are built on Radix primitives and styled with Tailwind CSS v4 + `tailwind-merge` + `cva`.

## Setup

```bash
npx shadcn@latest init
# picks: TypeScript, Tailwind v4, CSS variables, default aliases
```

After init, `components.json` and `src/lib/utils.ts` (the `cn()` helper) are created. Add components:

```bash
npx shadcn@latest add button card dialog table select
```

## The `cn()` utility

Always use `cn()` (not raw `clsx` or `classnames`):

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Rules:**
- `cn()` merges Tailwind classes intelligently — `px-4 px-2` resolves to `px-2`.
- Use it everywhere: compound classes, conditional classes, component variants.
- Never pass template literals with `undefined`/`null` — use the conditional form: `cn("base", condition && "conditional")`.

```tsx
<button className={cn(
  "px-4 py-2 rounded-md text-sm",
  variant === "destructive" && "bg-red-600 text-white",
  disabled && "opacity-50 cursor-not-allowed",
  className,  // allow parent overrides
)} />
```

## Component patterns

### Button with variants (using `cva`)

```ts
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
);
```

### Component composition

Always use the `forwardRef` + `displayName` pattern for shadcn components:

```tsx
import * as React from "react";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  ),
);
Card.displayName = "Card";
```

### Dialog / Sheet patterns

Always wrap open state in a controlled component — never use internal `useState` for dialogs that need external control:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Resolve Issue</DialogTitle>
    </DialogHeader>
    {/* form content */}
  </DialogContent>
</Dialog>
```

### Table with selection

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>ID</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {issues.map(issue => (
      <TableRow key={issue.id}>
        <TableCell>{issue.id}</TableCell>
        <TableCell>
          <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
            {issue.status}
          </Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Form integration

shadcn form components (`Form`, `FormField`, `FormItem`, `FormMessage`) + TanStack Form + Zod:

```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Schema
const formSchema = z.object({
  resolutionNotes: z.string().min(1).max(500),
  status: z.enum(["RESOLVED", "INVESTIGATING", "IGNORED"]),
});

<form onSubmit={handleSubmit}>
  <FormField
    name="resolutionNotes"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Notes</FormLabel>
        <FormControl>
          <Input placeholder="Resolution details..." {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  <Button type="submit" disabled={mutation.isPending}>
    {mutation.isPending ? "Saving..." : "Save"}
  </Button>
</form>
```

## Theming

shadcn uses CSS variables in `globals.css` for theming. Tailwind v4 handles dark mode via `dark:` variants.

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius: 0.5rem;
}
```

Override theme tokens — don't edit shadcn component files directly.

## Icon library

Use `lucide-react` for all icons:

```tsx
import { Check, AlertTriangle, Search, X, ChevronDown } from "lucide-react";

<AlertTriangle className="h-4 w-4 text-destructive" />
<Check className="h-4 w-4 text-green-500" />
```

## Core rules

- **Copy, don't import.** shadcn components live in your repo — you own the source. Customize directly.
- **`cn()` everywhere.** Never concatenate class strings with `+` or template literals without `cn()`.
- **Use `cva` for variants.** If a component has variant/size props, define them with `class-variance-authority`.
- **Tailwind v4 syntax.** Use `@theme` blocks and CSS-first config — not the old `tailwind.config.ts`.
- **Semantic tokens over raw colors.** Use `text-destructive` not `text-red-600`; `bg-primary` not `bg-blue-500`.
- **Responsive first.** Use `sm:`, `md:`, `lg:` breakpoints — shadcn components are mobile-friendly by default.
- **Don't fight the defaults.** shadcn ships sensible defaults — override via `className` prop, not by editing the copied component file unless necessary.
- **Forward `className` always.** Every component must accept and spread `className` to its root element so parents can override styles.

## Anti-patterns

- Don't install Radix packages directly — use the shadcn wrapper components.
- Don't write raw `@radix-ui/react-dialog` JSX — use `<Dialog>` from shadcn.
- Don't style with inline `style={{}}` objects — everything belongs in Tailwind classes.
- Don't define color values in components — use theme tokens.
- Don't skip `displayName` on forwarded-ref components.
