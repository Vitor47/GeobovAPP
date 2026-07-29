export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token?: string | null;
  token_type?: string | null;
  id?: number | null;
  email?: string | null;
  full_name?: string | null;
  company_id?: number | null;
  company_ids?: number[] | null;
  role?: string | null;
  is_superuser?: boolean | null;
}

export interface SessionUser {
  id: number;
  email: string;
  fullName?: string | null;
  companyId?: number | null;
  companyIds: number[];
  role?: string | null;
  isSuperuser: boolean;
}
