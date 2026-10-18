import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MenuEditor } from "@repo/contracts/amelie";
import { createDebouncedCall, type DebouncedCall } from "#/lib/debounced-call";
import { optimisticEdit } from "#/lib/optimistic-cache";
import {
  addMenuCategory,
  addMenuItem,
  addMenuItemImages,
  deleteMenuCategory,
  deleteMenuItem,
  deleteMenuItemImage,
  reorderMenuCategories,
  reorderMenuItemImages,
  reorderMenuItems,
  setMenuItemCountryPrice,
  setMenuItemImageCover,
  setMenuItemLocations,
  setMenuItemSoldOutLocations,
  updateMenuCategory,
  updateMenuItem,
} from "../api";
import { MENU_ITEM_IMAGE_REORDER_DEBOUNCE_MS } from "../constants";
import {
  withCategoriesOrder,
  withItemAvailability,
  withItemImageCover,
  withItemImagesOrder,
  withItemLocations,
  withItemsOrder,
} from "../utils";
import { menuKeys } from "./use-menu";

type ReorderMenuItemImagesInput = Parameters<typeof reorderMenuItemImages>[0];
type PersistReorder = (input: ReorderMenuItemImagesInput) => Promise<void>;

const noopPersist: PersistReorder = async () => {
  return;
};

// -----
// Every change reloads the menu: deleting a
// category also deletes its items, and an order
// change moves rows between lists.
// -----
export function useMenuActions() {
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: menuKeys.all });

  const addCategory = useMutation({ mutationFn: addMenuCategory, onSuccess: reload, meta: { successMessage: "Category added" } });
  const updateCategory = useMutation({ mutationFn: updateMenuCategory, onSuccess: reload, meta: { successMessage: "Category saved" } });
  const removeCategory = useMutation({ mutationFn: deleteMenuCategory, onSuccess: reload, meta: { successMessage: "Category deleted" } });
  const reorderCategories = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: reorderMenuCategories,
      applyEdit: (menu: MenuEditor, { data }) => withCategoriesOrder(menu, data.ids),
      settle: reload,
      meta: { successMessage: false },
    }),
  );
  const reorderItems = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: reorderMenuItems,
      applyEdit: (menu: MenuEditor, { data }) => withItemsOrder(menu, data.categoryId, data.ids),
      settle: reload,
      meta: { successMessage: false },
    }),
  );
  const addItem = useMutation({ mutationFn: addMenuItem, onSuccess: reload, meta: { successMessage: "Item added" } });
  const updateItem = useMutation({ mutationFn: updateMenuItem, onSuccess: reload, meta: { successMessage: "Item saved" } });
  const removeItem = useMutation({ mutationFn: deleteMenuItem, onSuccess: reload, meta: { successMessage: "Item deleted" } });
  const setLocations = useMutation({ mutationFn: setMenuItemLocations, onSuccess: reload, meta: { successMessage: "Locations saved" } });
  const setSoldOut = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: updateMenuItem,
      applyEdit: (menu: MenuEditor, { data }) => withItemAvailability(menu, data.itemId, data.body.isAvailable),
      settle: reload,
      meta: { successMessage: "Item saved" },
    }),
  );
  const setSoldOutLocations = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: setMenuItemSoldOutLocations,
      applyEdit: (menu: MenuEditor, { data }) => withItemLocations(menu, data.itemId, data.body),
      settle: reload,
      meta: { successMessage: "Locations saved" },
    }),
  );
  const setCountryPrice = useMutation({ mutationFn: setMenuItemCountryPrice, onSuccess: reload, meta: { successMessage: "Price saved" } });
  const addImages = useMutation({ mutationFn: addMenuItemImages, onSuccess: reload, meta: { successMessage: "Photos added" } });
  const removeImage = useMutation({ mutationFn: deleteMenuItemImage, onSuccess: reload, meta: { successMessage: "Photo deleted" } });
  const setCover = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: setMenuItemImageCover,
      applyEdit: (menu: MenuEditor, { data }) => withItemImageCover(menu, data.itemId, data.imageId),
      settle: reload,
      meta: { successMessage: "Cover photo set" },
    }),
  );
  const reorderSave = useRef<{ persist: PersistReorder; inflight: Promise<void> }>({
    persist: noopPersist,
    inflight: Promise.resolve(),
  });
  const reorderDebounce = useRef<DebouncedCall<ReorderMenuItemImagesInput> | undefined>(undefined);

  const reorderImagesMutation = useMutation({
    mutationFn: reorderMenuItemImages,
    meta: { successMessage: false },
    onSettled: async () => {
      if (reorderDebounce.current?.hasPending()) return;
      await reload();
    },
  });

  const persistLatest = async (input: ReorderMenuItemImagesInput) => {
    await reorderImagesMutation.mutateAsync(input);
  };

  const getReorderDebounce = () => {
    const existing = reorderDebounce.current;
    if (existing) return existing;
    const created = createDebouncedCall<ReorderMenuItemImagesInput>(MENU_ITEM_IMAGE_REORDER_DEBOUNCE_MS, (input) => {
      reorderSave.current.inflight = reorderSave.current.persist(input);
    });
    reorderDebounce.current = created;
    return created;
  };

  useEffect(() => {
    const flushOnLeave = () => reorderDebounce.current?.flush();
    window.addEventListener("pagehide", flushOnLeave);
    return () => {
      window.removeEventListener("pagehide", flushOnLeave);
      reorderDebounce.current?.cancel();
    };
  }, []);

  const reorderImages = {
    isPending: reorderImagesMutation.isPending,
    isError: reorderImagesMutation.isError,
    error: reorderImagesMutation.error,
    mutate: (input: ReorderMenuItemImagesInput) => {
      reorderSave.current.persist = persistLatest;
      queryClient.setQueriesData<MenuEditor>({ queryKey: menuKeys.all }, (menu) =>
        menu ? withItemImagesOrder(menu, input.data.itemId, input.data.ids) : menu,
      );
      getReorderDebounce().schedule(input);
    },
    flush: () => {
      reorderSave.current.persist = persistLatest;
      getReorderDebounce().flush();
      return reorderSave.current.inflight;
    },
  };

  return {
    addCategory,
    updateCategory,
    removeCategory,
    reorderCategories,
    reorderItems,
    addItem,
    updateItem,
    removeItem,
    setLocations,
    setSoldOut,
    setSoldOutLocations,
    setCountryPrice,
    addImages,
    removeImage,
    setCover,
    reorderImages,
  };
}
