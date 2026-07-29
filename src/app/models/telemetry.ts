export interface TelemetryResponse {
  id: string;
  cattle_id: number;
  lat: number;
  lon: number;
  timestamp?: string | null;
}
