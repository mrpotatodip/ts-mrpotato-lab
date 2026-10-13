// -----
// The ids with one moved a step up (-1) or down (1).
// Unchanged at either end, or for an unknown id.
// -----
export const moveId = (ids: string[], id: string, direction: -1 | 1): string[] => {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};
