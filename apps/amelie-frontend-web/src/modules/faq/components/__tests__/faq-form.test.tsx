import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country, FaqBody, Location } from "@repo/contracts/amelie";

import { FaqForm } from "../faq-form";

afterEach(cleanup);

const US_ID = "11111111-1111-4111-8111-111111111111";
const CA_ID = "22222222-2222-4222-8222-222222222222";

const us: Country = { id: US_ID, country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: CA_ID, country: "CA", currency: "CAD", archivedAt: null };

const location = (id: string, name: string, countryId: string): Location => ({
  id,
  name,
  slug: name.toLowerCase(),
  countryId,
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
});

const locations = [
  location("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Seattle", US_ID),
  location("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "Toronto", CA_ID),
];

const renderForm = (countries: Country[], onSubmit: (body: FaqBody) => void) =>
  render(
    <FaqForm
      categories={[]}
      locations={locations}
      countries={countries}
      initial={null}
      submitLabel="Add FAQ"
      isPending={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={null}
    />,
  );

const fillAndAdd = () => {
  fireEvent.change(screen.getByLabelText("Question"), { target: { value: "Do you accept Interac?" } });
  fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "Yes." } });
  fireEvent.click(screen.getByRole("button", { name: "Add FAQ" }));
};

describe("FaqForm Applies to", () => {
  it("lists all locations, each Country and each Location with 2+ Countries", () => {
    renderForm([us, ca], () => {});

    fireEvent.click(screen.getByLabelText("Applies to"));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All locations",
      "United States (all locations)",
      "Canada (all locations)",
      "Seattle only",
      "Toronto only",
    ]);
  });

  it("leaves the Country choices out at a one-Country café", () => {
    renderForm([us], () => {});

    fireEvent.click(screen.getByLabelText("Applies to"));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All locations",
      "Seattle only",
      "Toronto only",
    ]);
  });

  it("saves a Country FAQ and resets Applies to after the add", async () => {
    const onSubmit = vi.fn<(body: FaqBody) => void>();
    renderForm([us, ca], onSubmit);

    fireEvent.click(screen.getByLabelText("Applies to"));
    const canada = screen.getByRole("option", { name: "Canada (all locations)" });
    fireEvent.pointerDown(canada);
    fireEvent.pointerUp(canada);
    fireEvent.mouseUp(canada);
    fireEvent.click(canada);
    expect(screen.getByLabelText("Applies to").textContent).toBe("Canada (all locations)");
    fillAndAdd();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ countryId: CA_ID, locationId: null }));
      expect(screen.getByLabelText("Applies to").textContent).toBe("All locations");
      expect(screen.getByLabelText("Question")).toHaveProperty("value", "");
    });
  });
});
