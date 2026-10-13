import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const widgetSource = readFileSync("public/widget.js", "utf8");

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
  Reflect.deleteProperty(window, "__amelieCustomerWidget");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("widget.js", () => {
  it("creates the iframe on first click with the Tenant slug", () => {
    runWidget({ slug: "sorella" });
    const button = document.getElementById("amelie-customer-widget-button");
    expect(button?.textContent).toBe("Chat with us");
    expect(document.querySelector("iframe")).toBeNull();

    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://app.test/chat/sorella");
    expect(frame?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
  });

  it("forwards optional location and country as search params", () => {
    runWidget({ slug: "sorella", location: "airport", country: "CA" });
    document.getElementById("amelie-customer-widget-button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://app.test/chat/sorella?location=airport&country=CA",
    );
  });

  it("hides the same iframe on a later click", () => {
    runWidget({ slug: "sorella" });
    const button = document.getElementById("amelie-customer-widget-button");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const frame = document.querySelector("iframe");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(frame?.style.display).toBe("none");

    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

  it("ignores a second script tag", () => {
    runWidget({ slug: "sorella" });
    runWidget({ slug: "other-cafe", src: "https://app.test/widget.js?second=1" });

    document.getElementById("amelie-customer-widget-button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe("https://app.test/chat/sorella");
    expect(document.querySelectorAll("#amelie-customer-widget-button")).toHaveLength(1);
  });
});
