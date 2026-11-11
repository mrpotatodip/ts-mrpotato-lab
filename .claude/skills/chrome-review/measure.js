// Pass the contents of this file as the `function` of mcp__chrome-devtools__evaluate_script.
// Change ROOT to scope it (a dialog: '[role=dialog]'). It measures the page, so a design pass
// reports numbers: the type sizes, the contrast, the paragraphs, the targets, the heading gaps.
async () => {
  const ROOT = "main";
  const root = document.querySelector(ROOT) ?? document.body;
  const rect = (el) => el.getBoundingClientRect();

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const luminance = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const backdrop = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) break;
    }
    return layers.reverse().reduce((base, l) => base.map((v, i) => v * (1 - l[3]) + l[i] * l[3]), [255, 255, 255]);
  };
  const onGlass = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const alpha = rgba(getComputedStyle(e).backgroundColor)[3];
      if (alpha > 0 && alpha < 1) return true;
    }
    return false;
  };
  const contrast = (el) => {
    const fg = rgba(getComputedStyle(el).color);
    const bg = backdrop(el);
    const mixed = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [luminance(mixed), luminance(bg)];
    return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
  };
  const measure = document.createElement("canvas").getContext("2d");
  const charsPerLine = (el) => {
    const s = getComputedStyle(el);
    measure.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    return Math.round(rect(el).width / (measure.measureText("abcdefghijklmnopqrstuvwxyz ").width / 27));
  };

  const sizes = {};
  const lowContrast = new Map();
  const glassText = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    const el = node.parentElement;
    if (text.length < 2 || el.closest(".sr-only, [aria-hidden=true]")) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    sizes[px] = (sizes[px] ?? 0) + text.length;
    const ratio = contrast(el);
    if (ratio < 4.5) lowContrast.set(text.slice(0, 30), ratio);
    if (onGlass(el)) glassText.push(text.slice(0, 30));
  }
  const total = Object.values(sizes).reduce((a, b) => a + b, 0);

  const paragraphs = [...root.querySelectorAll("p, span.line-clamp-2, summary span")]
    .filter((p) => p.innerText.trim().length > 60 && !p.closest(".sr-only"))
    .map((p) => {
      const s = getComputedStyle(p);
      return { text: p.innerText.slice(0, 30), size: s.fontSize, lineHeight: +(parseFloat(s.lineHeight) / parseFloat(s.fontSize)).toFixed(2), charsPerLine: charsPerLine(p) };
    });

  const smallTargets = [...root.querySelectorAll("a[href], button, [role=combobox], summary")]
    .filter((e) => rect(e).width > 0 && rect(e).height < 24 && !e.closest("p"))
    .map((e) => `${(e.getAttribute("aria-label") ?? e.innerText).trim().slice(0, 24)} ${Math.round(rect(e).height)}px`);

  const headings = [...root.querySelectorAll("h1, h2, h3, h4")].map((h) => {
    const next = h.nextElementSibling;
    const s = getComputedStyle(h);
    return { text: h.textContent.trim().slice(0, 30), size: s.fontSize, weight: s.fontWeight, gapToNext: next ? Math.round(rect(next).top - rect(h).bottom) : null };
  });

  return {
    path: location.pathname,
    theme: document.documentElement.dataset.theme ?? "default",
    // Contrast above is measured against the surface colour only. Text on a translucent layer sits on
    // whatever is painted behind it (a sky image), which this script cannot see: look at these on a screenshot.
    needsEyes: { textOnGlass: glassText.length, samples: glassText.slice(0, 8) },
    typeShare: Object.fromEntries(Object.entries(sizes).map(([px, n]) => [px, `${Math.round((100 * n) / total)}%`])),
    contrastBelow4_5: Object.fromEntries(lowContrast),
    paragraphs,
    targetsUnder24px: smallTargets,
    headings,
    overflowsHorizontally: root.scrollWidth > root.clientWidth,
  };
}
