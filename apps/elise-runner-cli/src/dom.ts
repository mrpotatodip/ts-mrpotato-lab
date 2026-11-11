type Child = Node | string;

// Builds an element. A string child becomes a text node, never HTML, so a name that came
// from EliseLAB cannot inject markup into the window.
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, ...children: Child[]): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.append(...children);
  return element;
};

// The EliseLAB mark (the same as the dashboard's ShellLogo). The markup is fixed text with
// no data in it, so it is safe to set as HTML.
export const logo = (): HTMLElement => {
  const mark = h("span", { class: "brand-mark", "aria-hidden": "true" });
  mark.innerHTML = `<svg viewBox="0 0 32 32" width="24" height="24" focusable="false">
    <rect x="4" y="4" width="24" height="24" rx="5" transform="rotate(45 16 16)" fill="var(--primary)" />
    <g fill="var(--primary-foreground)" transform="rotate(-45 16 16) translate(16 16) scale(0.8) translate(-16 -16)">
      <rect x="9" y="8" width="4" height="16" /><rect x="9" y="8" width="14" height="4" />
      <rect x="9" y="14" width="14" height="4" /><rect x="9" y="20" width="14" height="4" />
    </g>
  </svg>`;
  return mark;
};
