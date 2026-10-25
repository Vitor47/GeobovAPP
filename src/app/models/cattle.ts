export type CattleGender = "male" | "female";

export interface CattleResponse {
  id: number;
  tag: string;
  name: string;
  company_id: number;
  is_active: boolean;
  description?: string | null;
  birth_date?: string | null;
  weight?: number | null;
  breed?: string | null;
  gender?: CattleGender | string | null;
  color?: string | null;
  notes?: string | null;
}

export interface CattleWrite {
  tag: string;
  name: string;
  description?: string | null;
  birth_date?: string | null;
  weight?: number | null;
  breed?: string | null;
  gender?: CattleGender | null;
  color?: string | null;
  notes?: string | null;
}

/** Cattle joined with latest LoRa/GPS telemetry for the map. */
export interface Cattle {
  id: number;
  name: string;
  tag: string;
  description?: string;
  lat: number;
  lng: number;
  lastSeenAt?: string | null;
  /** Expected LoRa transmission interval from the linked device. */
  transmissionIntervalMinutes: number;
  /** Farm/company display name from GET /companies/me. */
  companyName?: string;
  breed?: string | null;
  notes?: string | null;
  weight?: number | null;
  gender?: string | null;
  color?: string | null;
  rssi?: number | null;
  satellites?: number | null;
}
