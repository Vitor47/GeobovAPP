export interface TelemetryResponse {
  id: string;
  cattle_id: number;
  lat: number;
  lon: number;
  timestamp?: string | null;
  protocol_version?: string | number | null;
  sequence?: number | null;
  satellites?: number | null;
  hdop?: number | null;
  rssi?: number | null;
  snr?: number | null;
}
