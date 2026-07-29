/**
 * Development defaults.
 *
 * Physical device via USB (`adb reverse tcp:8000 tcp:8000`) → http://127.0.0.1:8000
 * Android emulator → http://10.0.2.2:8000
 * Physical device on LAN (firewall liberado) → http://192.168.x.x:8000
 * Production → HTTPS URL in environment.prod.ts
 */
export const environment = {
  production: false,
  apiBaseUrl: "http://127.0.0.1:8000",
  /** How often the app re-fetches herd positions from the API (5 min). */
  telemetryPollIntervalMs: 5 * 60 * 1000,
  /** Fallback when device has no transmission_interval_minutes. */
  defaultTransmissionIntervalMinutes: 5,
  /** Activated via switch-company when a superuser logs in without company_id. */
  defaultCompanyId: 1,
  /** Refresh marker "há X minutos" labels between API polls. */
  freshnessLabelRefreshMs: 60 * 1000,
};
