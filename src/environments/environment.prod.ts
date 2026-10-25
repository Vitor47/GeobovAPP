/**
 * GeoBov production API. HTTPS on the public IP (Let's Encrypt, SAN = IP).
 * Do not pin the certificate: it is short-lived and renewed on the server.
 * The release webpack build substitutes this file for environment.ts.
 */
export const environment = {
  production: true,
  apiBaseUrl: "https://54.94.137.227",
  telemetryPollIntervalMs: 5 * 60 * 1000,
  defaultTransmissionIntervalMinutes: 5,
  defaultCompanyId: 1,
  freshnessLabelRefreshMs: 60 * 1000,
};
