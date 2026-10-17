import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@repo/contracts/amelie";

import type { CountryCurrencyChange } from "../../types";
import { CountryArchiveDialog } from "../country-archive-dialog";
import { CountryCurrencyDialog } from "../country-currency-dialog";
import { PowerMarksProvider } from "#/modules/shared";
import { CountryRow } from "../country-row";
import { CountrySwitcher } from "../country-switcher";

afterEach(cleanup);

const us: Country = { id: "11111111-1111-4111-8111-111111111111", country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: "22222222-2222-4222-8222-222222222222", country: "CA", currency: "CAD", archivedAt: null };

describe("CountrySwitcher", () => {
  it("shows nothing while the cafe sells in one country", () => {
    const { container } = render(<CountrySwitcher countries={[us]} value={undefined} onChange={() => {}} />);

    expect(container.firstChild).toBeNull();
  });

  it("names the picked country when there are several", () => {
    render(<CountrySwitcher countries={[us, ca]} value={ca.id} onChange={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Country" }).textContent).toContain("Canada");
  });
});

describe("CountryCurrencyDialog", () => {
  it("warns that prices are relabeled and not converted", () => {
    render(<CountryCurrencyDialog change={{ country: ca, currency: "USD" }} isPending={false} error={null} onConfirm={() => {}} onCancel={() => {}} />);

    expect(screen.getByText(/Change Canada's currency to USD\?/)).toBeTruthy();
    expect(screen.getByText(/relabeled, not converted/)).toBeTruthy();
    expect(screen.getByText(/4\.75 CAD becomes 4\.75 USD/)).toBeTruthy();
  });

  it("confirms with the Country and the new currency, and shows an error", () => {
    const onConfirm = vi.fn<(change: CountryCurrencyChange) => void>();
    render(<CountryCurrencyDialog change={{ country: ca, currency: "USD" }} isPending={false} error="Nope" onConfirm={onConfirm} onCancel={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Change currency" }));

    expect(onConfirm).toHaveBeenCalledWith({ country: ca, currency: "USD" });
    expect(screen.getByText("Nope")).toBeTruthy();
  });

  it("renders nothing while no change is waiting", () => {
    render(<CountryCurrencyDialog change={null} isPending={false} error={null} onConfirm={() => {}} onCancel={() => {}} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("CountryArchiveDialog", () => {
  it("asks before archiving and says the prices are kept", () => {
    const onConfirm = vi.fn<(country: Country) => void>();
    render(<CountryArchiveDialog country={ca} isPending={false} onConfirm={onConfirm} onCancel={() => {}} />);

    expect(screen.getByText("Archive Canada?")).toBeTruthy();
    expect(screen.getByText(/prices are kept/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onConfirm).toHaveBeenCalledWith(ca);
  });
});

describe("CountryRow", () => {
  it("shows the country, its currency and how many open locations it has", () => {
    render(<CountryRow country={ca} openLocations={2} canChangeCurrency canArchive onChangeCurrency={() => {}} onArchive={() => {}} isArchiving={false} />);

    expect(screen.getByText("Canada")).toBeTruthy();
    expect(screen.getByText("2 open locations")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Currency" }).textContent).toContain("CAD");
  });

  it("offers Archive to an editor and hides it from anyone else", () => {
    const onArchive = vi.fn<(country: Country) => void>();
    const { rerender } = render(<CountryRow country={ca} openLocations={0} canChangeCurrency canArchive onChangeCurrency={() => {}} onArchive={onArchive} isArchiving={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledWith(ca);

    rerender(<CountryRow country={ca} openLocations={0} canChangeCurrency={false} canArchive={false} onChangeCurrency={() => {}} onArchive={onArchive} isArchiving={false} />);
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });

  it("gates the currency and Archive by their own Powers, and marks each", () => {
    render(
      <PowerMarksProvider visible>
        <CountryRow country={ca} openLocations={0} canChangeCurrency canArchive={false} onChangeCurrency={() => {}} onArchive={() => {}} isArchiving={false} />
      </PowerMarksProvider>,
    );

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(screen.getByRole("button", { name: "Needs Profile › Country · Update" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Needs Profile › Country · Archive" })).toBeNull();
  });
});
