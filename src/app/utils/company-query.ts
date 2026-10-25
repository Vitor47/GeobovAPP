const COMPANY_QUERY_PATTERN = /^[\p{L}\p{N} '\u2019-]{1,80}$/u;

export const COMPANY_QUERY_ERROR =
  "A busca aceita letras, números, espaço, apóstrofo e hífen, até 80 caracteres.";

/** Empty search is allowed. `%` and `_` are rejected before the request (API responds 422). */
export function companyQueryError(value?: string | null): string | null {
  const query = value?.trim() ?? "";
  if (!query) return null;
  if (query.length > 80 || !COMPANY_QUERY_PATTERN.test(query)) {
    return COMPANY_QUERY_ERROR;
  }
  return null;
}

export function normalizeCompanyQuery(value?: string | null): string | undefined {
  const query = value?.trim() ?? "";
  if (!query) return undefined;

  const error = companyQueryError(query);
  if (error) throw new Error(error);
  return query;
}
