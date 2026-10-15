import { clsx, type ClassValue } from "clsx";

// Joins class names.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
