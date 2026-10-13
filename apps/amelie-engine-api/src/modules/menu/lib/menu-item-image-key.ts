export const menuItemImagePublicPath = (imageId: string): string => `/menu-item-images/${imageId}`;

export const menuItemImageObjectKey = (tenantId: string, itemId: string, imageId: string, name: string): string =>
  `menu-items/${tenantId}/${itemId}/${imageId}-${name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80)}`;
