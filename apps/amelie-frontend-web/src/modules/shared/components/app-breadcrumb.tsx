import type { ReactNode } from "react";
import { Link, type LinkComponentProps } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { cn } from "#/lib/utils";

type AppBreadcrumbProps = {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

// -----
// shadcn breadcrumb plus TanStack Link. Last
// crumb is the page; trailing is actions. The
// first crumb — link or bare page — inherits
// uppercase with wide tracking; later crumbs
// inherit italic, all via cascade from the
// list wrapper.
// -----
function AppBreadcrumb({ children, trailing, className }: AppBreadcrumbProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex min-h-[3.25rem] items-center justify-start gap-4 bg-background/90 backdrop-blur",
        className,
      )}
    >
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap [&>*:first-child]:uppercase [&>*:first-child]:tracking-wide [&>*:not(:first-child)]:italic">
          {children}
        </BreadcrumbList>
      </Breadcrumb>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

type AppBreadcrumbLinkProps = Omit<LinkComponentProps, "children"> & {
  children: ReactNode;
};

function AppBreadcrumbLink({
  children,
  className,
  ...props
}: AppBreadcrumbLinkProps) {
  return (
    <BreadcrumbItem>
      <BreadcrumbLink render={<Link className={className} {...props} />}>
        {children}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}

type AppBreadcrumbPageProps = {
  children: ReactNode;
  className?: string;
};

function AppBreadcrumbPage({ children, className }: AppBreadcrumbPageProps) {
  return (
    <BreadcrumbItem className="min-w-0">
      <BreadcrumbPage className={cn("truncate", className)}>
        {children}
      </BreadcrumbPage>
    </BreadcrumbItem>
  );
}

function AppBreadcrumbSeparator() {
  return <BreadcrumbSeparator />;
}

export {
  AppBreadcrumb,
  AppBreadcrumbLink,
  AppBreadcrumbPage,
  AppBreadcrumbSeparator,
};
