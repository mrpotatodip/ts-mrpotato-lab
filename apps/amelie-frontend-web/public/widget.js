(() => {
  const FLAG = "__amelieCustomerWidget";
  const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
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

  const style = document.createElement("style");
  style.textContent =
    "#amelie-customer-widget-button,#amelie-customer-widget-frame{position:fixed;z-index:2147483647;box-sizing:border-box}" +
    "#amelie-customer-widget-button{right:20px;bottom:20px;height:56px;padding:0 18px;border:0;border-radius:28px;background:#171717;color:#fff;cursor:pointer;font:600 14px/1 system-ui,sans-serif}" +
    "#amelie-customer-widget-frame{right:20px;bottom:88px;width:min(380px,calc(100vw - 24px));height:min(640px,calc(100vh - 120px));border:0;border-radius:16px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.18)}";
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "amelie-customer-widget-button";
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Chat with us");
  button.textContent = "Chat with us";

  let frame = null;
  const toggle = () => {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "amelie-customer-widget-frame";
      frame.title = "Chat with us";
      frame.src = chatSrc;
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
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
})();
