(() => {
  const FLAG = "__amelieCustomerWidget";
  const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
  const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const DEFAULT_LABEL = "Chat with us";
  if (window[FLAG]) return;

  const script =
    document.currentScript instanceof HTMLScriptElement
      ? document.currentScript
      : document.querySelector("script[src*='widget.js'][data-slug]");
  if (!(script instanceof HTMLScriptElement)) return;
  window[FLAG] = true;

  const slug = (script.getAttribute("data-slug") || "").trim();
  if (!SLUG_PATTERN.test(slug)) {
    console.error("Amelie widget: missing or invalid data-slug");
    return;
  }

  let origin;
  try {
    origin = new URL(script.src).origin;
  } catch {
    console.error("Amelie widget: missing or invalid script origin");
    return;
  }

  const params = new URLSearchParams();
  const location = (script.getAttribute("data-location") || "").trim();
  const country = (script.getAttribute("data-country") || "").trim();
  if (location) params.set("location", location);
  if (country) params.set("country", country);
  const query = params.toString();
  const chatSrc = `${origin}/chat/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
  const lookKey = `amelie-customer-widget:${slug}`;

  const inkFor = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    if (Number.isNaN(n)) return "#fff";
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 >= 160 ? "#171717" : "#fff";
  };

  const readLook = () => {
    try {
      const raw = localStorage.getItem(lookKey);
      if (!raw) return null;
      const look = JSON.parse(raw);
      if (!look || typeof look.customerChatLabel !== "string") return null;
      return {
        customerChatLabel: look.customerChatLabel,
        customerChatAccent: typeof look.customerChatAccent === "string" ? look.customerChatAccent : null,
      };
    } catch {
      return null;
    }
  };

  const writeLook = (label, accent) => {
    try {
      localStorage.setItem(
        lookKey,
        JSON.stringify({ customerChatLabel: label, customerChatAccent: accent }),
      );
    } catch {
      /* cafe origin may block storage */
    }
  };

  let button = null;
  let frame = null;

  const applyLook = (label, accent) => {
    if (!button) return;
    const text = (label && String(label).trim()) || DEFAULT_LABEL;
    button.setAttribute("aria-label", text);
    if (frame) frame.title = text;
    if (accent && ACCENT_PATTERN.test(accent)) {
      button.style.background = accent;
      button.style.color = inkFor(accent);
    } else {
      button.style.background = "";
      button.style.color = "";
    }
  };

  const mount = (label, accent) => {
    if (button) {
      applyLook(label, accent);
      return;
    }
    const style = document.createElement("style");
    style.textContent =
      "#amelie-customer-widget-button,#amelie-customer-widget-frame{position:fixed;z-index:2147483647;box-sizing:border-box}" +
      "#amelie-customer-widget-button{right:20px;bottom:20px;width:56px;height:56px;padding:0;border:0;border-radius:50%;background:#171717;color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}" +
      "#amelie-customer-widget-button svg{display:block;width:24px;height:24px}" +
      "#amelie-customer-widget-frame{right:20px;bottom:88px;width:min(380px,calc(100vw - 24px));height:min(640px,calc(100vh - 120px));border:0;border-radius:16px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.18)}";
    document.head.appendChild(style);

    button = document.createElement("button");
    button.id = "amelie-customer-widget-button";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    applyLook(label, accent);

    const toggle = () => {
      if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "amelie-customer-widget-frame";
        frame.title = button.getAttribute("aria-label") || DEFAULT_LABEL;
        frame.src = chatSrc;
        frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
        document.body.appendChild(frame);
        button.setAttribute("aria-expanded", "true");
        return;
      }
      const open = frame.style.display !== "none";
      frame.style.display = open ? "none" : "";
      button.setAttribute("aria-expanded", open ? "false" : "true");
    };
    button.addEventListener("click", toggle);
    document.body.appendChild(button);
  };

  const cached = readLook();
  if (cached) mount(cached.customerChatLabel, cached.customerChatAccent);

  fetch(`${origin}/widget-appearance?slug=${encodeURIComponent(slug)}`, {
    mode: "cors",
    credentials: "omit",
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      const data = body && body.data;
      const label = (data && data.customerChatLabel) || DEFAULT_LABEL;
      const accent = data && data.customerChatAccent;
      writeLook(label, accent || null);
      mount(label, accent);
    })
    .catch(() => {
      if (!button) mount(DEFAULT_LABEL, null);
    });
})();
