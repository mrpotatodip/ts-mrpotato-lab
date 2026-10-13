type PageHeaderProps = {
  title: string;
  description: string;
};

// -----
// The title and one line about the screen, the same
// on every dashboard page.
// -----
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-base">{description}</p>
    </header>
  );
}
