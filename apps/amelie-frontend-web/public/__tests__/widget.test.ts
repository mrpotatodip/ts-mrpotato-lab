import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const widgetSource = readFileSync("public/widget.js", "utf8");

const waitForButton = () =>
  vi.waitFor(() => {
    const button = document.getElementById("amelie-customer-widget-button");
    expect(button).toBeTruthy();
    return button!;
  });

const runWidget = (attrs: {
  slug?: string;
  location?: string;
  country?: string;
  src?: string;
  brokenSrc?: string;
}) => {
  const script = document.createElement("script");
  script.src = attrs.src ?? "https://app.test/widget.js";
  if (attrs.brokenSrc !== undefined) {
    Object.defineProperty(script, "src", { configurable: true, value: attrs.brokenSrc });
  }
  if (attrs.slug !== undefined) script.setAttribute("data-slug", attrs.slug);
  if (attrs.location) script.setAttribute("data-location", attrs.location);
  if (attrs.country) script.setAttribute("data-country", attrs.country);
  document.body.appendChild(script);
  Object.defineProperty(document, "currentScript", { configurable: true, get: () => script });
  new Function(widgetSource)();
};

beforeEach(() => {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  localStorage.clear();
  Reflect.deleteProperty(window, "__amelieCustomerWidget");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { customerChatLabel: "Chat with us", customerChatAccent: null }, error: null }),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("widget.js", () => {
  it("creates the iframe on first click with the Tenant slug", async () => {
    runWidget({ slug: "sorella" });
    const button = await waitForButton();
    expect(button.getAttribute("aria-label")).toBe("Chat with us");
    expect(button.querySelector("svg")).toBeTruthy();
    expect(button.textContent?.trim()).toBe("");
    expect(document.querySelector("iframe")).toBeNull();

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://app.test/chat/sorella");
    expect(frame?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-forms");
  });

  it("does not draw the bubble until the look is known", async () => {
    let resolveFetch: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
    const pending = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));
    runWidget({ slug: "sorella" });
    expect(document.getElementById("amelie-customer-widget-button")).toBeNull();

    resolveFetch({
      ok: true,
      json: async () => ({ data: { customerChatLabel: "Ask Sorella", customerChatAccent: null }, error: null }),
    });
    expect((await waitForButton()).getAttribute("aria-label")).toBe("Ask Sorella");
  });

  it("forwards optional location and country as search params", async () => {
    runWidget({ slug: "sorella", location: "airport", country: "CA" });
    (await waitForButton()).dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://app.test/chat/sorella?location=airport&country=CA",
    );
  });

  it("hides the same iframe on a later click", async () => {
    runWidget({ slug: "sorella" });
    const button = await waitForButton();
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const frame = document.querySelector("iframe");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(frame?.style.display).toBe("none");

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(frame?.style.display).toBe("");
  });

  it("logs once and draws nothing for a missing slug", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    runWidget({});
    expect(document.getElementById("amelie-customer-widget-button")).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("Amelie widget: missing or invalid data-slug");
  });

  it("logs once and draws nothing for an invalid slug", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    runWidget({ slug: "Not Valid" });
    expect(document.getElementById("amelie-customer-widget-button")).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("Amelie widget: missing or invalid data-slug");
  });

  it("logs a script-origin error when data-slug is valid but src is not a URL", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    runWidget({ slug: "sorella", brokenSrc: "not a url" });
    expect(document.getElementById("amelie-customer-widget-button")).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("Amelie widget: missing or invalid script origin");
  });

  it("ignores a second script tag", async () => {
    runWidget({ slug: "sorella" });
    runWidget({ slug: "other-cafe", src: "https://app.test/widget.js?second=1" });

    (await waitForButton()).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe("https://app.test/chat/sorella");
    expect(document.querySelectorAll("#amelie-customer-widget-button")).toHaveLength(1);
  });

  it("paints the bubble from the Tenant's Customer chat look", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" }, error: null }),
    });
    vi.stubGlobal("fetch", fetchMock);
    runWidget({ slug: "sorella" });

    await vi.waitFor(() => {
      expect(document.getElementById("amelie-customer-widget-button")?.getAttribute("aria-label")).toBe(
        "Ask Sorella",
      );
    });
    expect(fetchMock).toHaveBeenCalledWith("https://app.test/widget-appearance?slug=sorella", {
      mode: "cors",
      credentials: "omit",
    });
    expect(document.getElementById("amelie-customer-widget-button")?.getAttribute("aria-label")).toBe("Ask Sorella");
  });

  it("draws the last look on this host while the appearance request is still in flight", () => {
    localStorage.setItem(
      "amelie-customer-widget:sorella",
      JSON.stringify({ customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" }),
    );
    let resolveFetch: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    runWidget({ slug: "sorella" });

    const button = document.getElementById("amelie-customer-widget-button");
    expect(button?.getAttribute("aria-label")).toBe("Ask Sorella");
    expect(button?.querySelector("svg")).toBeTruthy();
    expect(button?.textContent?.trim()).toBe("");
    expect(button?.style.background).toBe("rgb(180, 83, 42)");
    resolveFetch({
      ok: true,
      json: async () => ({ data: { customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" }, error: null }),
    });
  });

  it("keeps the look on this host so a later page load does not wait on Amelie", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { customerChatLabel: "Ask Sorella", customerChatAccent: "#91c5fd" }, error: null }),
    });
    vi.stubGlobal("fetch", fetchMock);
    runWidget({ slug: "sorella" });
    await waitForButton();

    expect(JSON.parse(localStorage.getItem("amelie-customer-widget:sorella") ?? "null")).toEqual({
      customerChatLabel: "Ask Sorella",
      customerChatAccent: "#91c5fd",
    });
  });
});
