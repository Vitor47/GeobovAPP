/** Accepts a bare JSON array or a page envelope `{ items: [...] }`. */
export function asList<T>(payload: T[] | { items?: T[] | null } | null | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}
