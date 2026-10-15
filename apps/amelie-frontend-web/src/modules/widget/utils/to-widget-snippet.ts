type WidgetSnippetAttrs = {
  location?: string;
  country?: string;
};

export function toWidgetSnippet(origin: string, slug: string, attrs: WidgetSnippetAttrs = {}): string {
  const location = attrs.location ? ` data-location="${attrs.location}"` : "";
  const country = attrs.country ? ` data-country="${attrs.country}"` : "";
  return `<script src="${origin}/widget.js" data-slug="${slug}"${location}${country} defer></script>`;
}
