import { environment } from "../../environments/environment";

const root = environment.apiBaseUrl.replace(/\/$/, "");

/**
 * GeoBov production routes.
 * Collection routes keep the trailing slash. Session routes do not.
 * Gateway ingest stays on the ESP32 firmware (`POST /api/v1/gateways/ingest`
 * with X-Gateway-Api-Key). The app only reads telemetry.
 */
export const endpoints = {
  health: `${root}/health`,
  login: `${root}/api/v1/users/login`,
  logout: `${root}/api/v1/users/logout`,
  me: `${root}/api/v1/users/me`,
  switchCompany: `${root}/api/v1/users/switch-company`,
  companies: `${root}/api/v1/companies/`,
  companyMe: `${root}/api/v1/companies/me`,
  cattle: `${root}/api/v1/cattle/`,
  cattleById: (id: number) => `${root}/api/v1/cattle/${id}`,
  devices: `${root}/api/v1/devices/`,
  deviceById: (id: number) => `${root}/api/v1/devices/${id}`,
  telemetry: `${root}/api/v1/telemetry/`,
  telemetryById: (id: string) => `${root}/api/v1/telemetry/${id}`,
};

export function isAnonymousRequest(url: string): boolean {
  return /\/users\/login$/.test(url) || /\/health$/.test(url);
}
