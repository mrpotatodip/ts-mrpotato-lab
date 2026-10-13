import type { ImportDraft } from "@repo/contracts/amelie";

type TextField = { name: string; label: string };

export const TEXT_FIELDS = {
  menu_category: [
    { name: "name", label: "Name" },
    { name: "note", label: "Note" },
  ],
  menu_item: [
    { name: "categoryName", label: "Category" },
    { name: "name", label: "Name" },
    { name: "description", label: "Description" },
    { name: "price", label: "Price (empty when it has Variants)" },
  ],
  business_hours: [
    { name: "opensAt", label: "Opens at (HH:MM)" },
    { name: "closesAt", label: "Closes at (HH:MM)" },
  ],
  business_profile: [
    { name: "description", label: "Description" },
    { name: "websiteUrl", label: "Website" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email" },
    { name: "address", label: "Address" },
  ],
} satisfies Record<ImportDraft["kind"], TextField[]>;
