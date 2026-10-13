import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MenuEditor } from "@repo/contracts/amelie";
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
import { withCategoriesOrder, withItemsOrder } from "../utils";
import { menuKeys } from "./use-menu";

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
  const setCover = useMutation({ mutationFn: setMenuItemImageCover, onSuccess: reload });
  const reorderImages = useMutation({ mutationFn: reorderMenuItemImages, onSuccess: reload });

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
