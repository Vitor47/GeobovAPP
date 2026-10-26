/**
 * The API is in production. Local builds use the same public HTTPS address.
 * Release builds still swap this file for environment.prod.ts.
 */
export const environment = {
  production: false,
  apiBaseUrl: "https://54.94.137.227",
  /** How often the app re-fetches herd positions from the API (5 min). */
  telemetryPollIntervalMs: 5 * 60 * 1000,
  /** Fallback when device has no transmission_interval_minutes. */
  defaultTransmissionIntervalMinutes: 5,
  /** Activated via switch-company when a superuser logs in without company_id. */
  defaultCompanyId: 1,
  /** Refresh marker "há X minutos" labels between API polls. */
  freshnessLabelRefreshMs: 60 * 1000,
};
