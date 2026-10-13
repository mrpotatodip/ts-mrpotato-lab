import { z } from "zod";
import { MENU_ITEM_IMAGE_NO_FILE } from "#/modules/menu/constants";

const FileFieldSchema = z.union([z.instanceof(File), z.array(z.instanceof(File))]);

export const MenuItemImagesFormSchema = z
  .object({
    files: FileFieldSchema.optional(),
    file: FileFieldSchema.optional(),
  })
  .transform((body) => {
    const sent = body.files ?? body.file ?? [];
    return (Array.isArray(sent) ? sent : [sent]).filter((entry) => entry instanceof File);
  })
  .pipe(z.array(z.instanceof(File)).min(1, MENU_ITEM_IMAGE_NO_FILE));

export type MenuItemImagesForm = z.infer<typeof MenuItemImagesFormSchema>;
