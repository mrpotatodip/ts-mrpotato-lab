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
  updateMenuCategory,
  updateMenuItem,
} from "../api";
import { MENU_ITEM_IMAGE_REORDER_DEBOUNCE_MS } from "../constants";
import { withCategoriesOrder, withItemImageCover, withItemImagesOrder, withItemsOrder } from "../utils";
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

  const addCategory = useMutation({ mutationFn: addMenuCategory, onSuccess: reload });
  const updateCategory = useMutation({ mutationFn: updateMenuCategory, onSuccess: reload });
  const removeCategory = useMutation({ mutationFn: deleteMenuCategory, onSuccess: reload });
  const reorderCategories = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: reorderMenuCategories,
      applyEdit: (menu: MenuEditor, { data }) => withCategoriesOrder(menu, data.ids),
      settle: reload,
    }),
  );
  const reorderItems = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: reorderMenuItems,
      applyEdit: (menu: MenuEditor, { data }) => withItemsOrder(menu, data.categoryId, data.ids),
      settle: reload,
    }),
  );
  const addItem = useMutation({ mutationFn: addMenuItem, onSuccess: reload });
  const updateItem = useMutation({ mutationFn: updateMenuItem, onSuccess: reload });
  const removeItem = useMutation({ mutationFn: deleteMenuItem, onSuccess: reload });
  const setLocations = useMutation({ mutationFn: setMenuItemLocations, onSuccess: reload });
  const setCountryPrice = useMutation({ mutationFn: setMenuItemCountryPrice, onSuccess: reload });
  const addImages = useMutation({ mutationFn: addMenuItemImages, onSuccess: reload });
  const removeImage = useMutation({ mutationFn: deleteMenuItemImage, onSuccess: reload });
  const setCover = useMutation(
    optimisticEdit({
      queryClient,
      queryKey: menuKeys.all,
      mutationFn: setMenuItemImageCover,
      applyEdit: (menu: MenuEditor, { data }) => withItemImageCover(menu, data.itemId, data.imageId),
      settle: reload,
    }),
  );
  const reorderSave = useRef<{ persist: PersistReorder; inflight: Promise<void> }>({
    persist: noopPersist,
    inflight: Promise.resolve(),
  });
  const reorderDebounce = useRef<DebouncedCall<ReorderMenuItemImagesInput> | undefined>(undefined);

  const reorderImagesMutation = useMutation({
    mutationFn: reorderMenuItemImages,
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
    setCountryPrice,
    addImages,
    removeImage,
    setCover,
    reorderImages,
  };
}
