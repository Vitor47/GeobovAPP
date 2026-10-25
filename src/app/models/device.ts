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

export interface DeviceWrite {
  serial_number: string;
  cattle_id: number;
  name?: string | null;
  transmission_interval_minutes: number;
}
