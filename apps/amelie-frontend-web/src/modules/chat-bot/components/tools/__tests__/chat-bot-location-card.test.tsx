import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChatBotLocationCard } from "../chat-bot-location-card";

afterEach(cleanup);

const us = { id: "c1", name: "United States", code: "US" };
const downtown = { id: "l1", name: "Downtown" };

describe("ChatBotLocationCard", () => {
  it("shows the location and country so later reads stay on that place", () => {
    render(<ChatBotLocationCard location={downtown} country={us} address="1 Main St" phone="555-0001" />);

    expect(screen.getByText("Downtown")).toBeTruthy();
    expect(screen.getByText("United States (US)")).toBeTruthy();
    expect(screen.getByRole("link", { name: "1 Main St" })).toHaveProperty(
      "href",
      "https://www.google.com/maps/search/?api=1&query=1%20Main%20St",
    );
    expect(screen.getByRole("link", { name: "555-0001" })).toHaveProperty("href", "tel:555-0001");
  });

  it("still names the country when a location has not been chosen yet", () => {
    render(<ChatBotLocationCard location={null} country={us} address={null} phone={null} />);

    expect(screen.getByText("United States (US)")).toBeTruthy();
    expect(screen.queryByText("Downtown")).toBeNull();
  });
});
