import { z } from "zod";

export const AdminRolesPreviewSearchSchema = z.object({ view: z.string().catch("list") });
