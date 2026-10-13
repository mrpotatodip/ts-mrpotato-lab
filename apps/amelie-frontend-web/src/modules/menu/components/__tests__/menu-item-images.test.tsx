import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MenuItemImage } from "@repo/contracts/amelie";

import { MenuItemImages } from "../menu-item-images";

afterEach(cleanup);

const photo = (n: number): MenuItemImage => ({
  id: `11111111-1111-4111-8111-11111111111${n}`,
  name: `latte-${n}.jpg`,
  contentType: "image/jpeg",
  size: 100,
  sortOrder: n,
});

const renderSheet = (images: MenuItemImage[], extra?: Partial<Parameters<typeof MenuItemImages>[0]>) =>
  render(
    <MenuItemImages
      itemName="Latte"
      images={images}
      open
      onOpenChange={() => {}}
      isPending={false}
      isUploading={false}
      error={null}
      onAdd={() => {}}
      onCover={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      {...extra}
    />,
  );

describe("MenuItemImages", () => {
  it("lists each photo without its filename and marks the first as the cover", () => {
    renderSheet([photo(0), photo(1)]);

    expect(screen.getByRole("heading", { name: "Latte" })).toBeTruthy();
    expect(screen.queryByText("latte-0.jpg")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Cover" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Cover" })[0]).toHaveProperty("disabled", true);
  });

  it("lets an editor rearrange, set a cover, add photos, and remove one after confirming", () => {
    const onAdd = vi.fn<(files: File[]) => void>();
    const onCover = vi.fn<(imageId: string) => void>();
    const onMove = vi.fn<(imageId: string, direction: -1 | 1) => void>();
    const onDelete = vi.fn<(imageId: string) => void>();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderSheet([photo(0), photo(1)], { onAdd, onCover, onMove, onDelete });

    fireEvent.click(screen.getAllByRole("button", { name: "Move down" })[0]);
    expect(onMove).toHaveBeenCalledWith(photo(0).id, 1);

    fireEvent.click(screen.getAllByRole("button", { name: "Cover" })[1]);
    expect(onCover).toHaveBeenCalledWith(photo(1).id);

    fireEvent.click(screen.getAllByRole("button", { name: "Remove photo" })[0]);
    expect(onDelete).toHaveBeenCalledWith(photo(0).id);

    const file = new File(["x"], "extra.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Add photos to Latte"), { target: { files: [file] } });
    expect(onAdd).toHaveBeenCalledWith([file]);
  });

  it("says there are no photos yet when the item has none", () => {
    renderSheet([]);
    expect(screen.getByText("No photos yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add photos" })).toBeTruthy();
  });
});
