// -----
// "$12", "12.5", "1,200.00" become "12.00", "12.50",
// "1200.00". Anything else is not a price: null.
// -----
export const normalizePrice = (raw: string): string | null => {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
};
