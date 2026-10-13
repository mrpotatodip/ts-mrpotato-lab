export function toWidgetSnippet(origin: string, slug: string): string {
  return `<script src="${origin}/widget.js" data-slug="${slug}" defer></script>`;
}
