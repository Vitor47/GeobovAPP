export type UserRole = "admin" | "manager" | "viewer";

/** Login body. The password stays in memory for the request and is never stored. */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id?: number | null;
  email?: string | null;
  full_name?: string | null;
  company_id?: number | null;
  company_ids?: number[] | null;
  role?: string | null;
  is_superuser?: boolean | null;
}

export interface LoginResponse extends UserProfile {
  access_token?: string | null;
  token_type?: string | null;
}

export interface SessionUser {
  id: number;
  email: string;
  fullName?: string | null;
  companyId?: number | null;
  companyIds: number[];
  role?: UserRole | null;
  isSuperuser: boolean;
}

export function normalizeRole(role?: string | null): UserRole | null {
  const value = role?.trim().toLowerCase();
  if (value === "admin" || value === "manager" || value === "viewer") {
    return value;
  }
  return null;
}
