export interface DeviceResponse {
  id: number;
  serial_number: string;
  name?: string | null;
  cattle_id: number;
  company_id: number;
  is_active: boolean;
  transmission_interval_minutes: number;
  last_seen_at?: string | null;
}
