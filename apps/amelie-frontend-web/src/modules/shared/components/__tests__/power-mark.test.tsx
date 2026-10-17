import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PowerMark } from "../power-mark";
import { PowerMarksProvider } from "../power-marks-context";

afterEach(cleanup);

describe("PowerMark", () => {
  it("names the Power in words for assistive tech", () => {
    render(
      <PowerMarksProvider visible>
        <PowerMark power="company:team:invites:create" />
      </PowerMarksProvider>,
    );

    expect(screen.getByRole("button", { name: "Needs Team › Team invite · Create" })).toBeDefined();
  });

  it("draws nothing when the shell has not switched marks on", () => {
    render(
      <PowerMarksProvider visible={false}>
        <PowerMark power="company:team:invites:create" />
      </PowerMarksProvider>,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws nothing outside the shell", () => {
    render(<PowerMark power="company:team:invites:create" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is a plain span, not a button, inside a menu", () => {
    const { container } = render(
      <PowerMarksProvider visible>
        <PowerMark inMenu power="company:assistant:threads:delete" />
      </PowerMarksProvider>,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("span[title]")?.getAttribute("title")).toBe("Needs Assistant › Signed-in thread · Delete");
  });
});
