import { Injectable } from "@angular/core";
import { ApplicationSettings } from "@nativescript/core";

import { isTokenExpired, resolveTokenExpiryMs } from "../api/jwt";
import { SessionUser } from "../models/auth";

const TOKEN_KEY = "geobov_access_token";
const TOKEN_EXPIRES_KEY = "geobov_access_token_expires_at";
const USER_KEY = "geobov_session_user";
const SELECTED_COMPANY_KEY = "geobov_selected_company_id";

@Injectable({
  providedIn: "root",
})
export class AuthStorageService {
  /**
   * Replaces the stored access token. The previous token is invalid
   * as soon as switch-company or a new login succeeds.
   * The password is never written here.
   */
  setSession(token: string, user: SessionUser, expiresAtMs?: number) {
    const expiry = expiresAtMs ?? resolveTokenExpiryMs(token);
    ApplicationSettings.setString(TOKEN_KEY, token);
    ApplicationSettings.setNumber(TOKEN_EXPIRES_KEY, expiry);
    ApplicationSettings.setString(USER_KEY, JSON.stringify(user));

    if (user.companyId != null) {
      this.setSelectedCompanyId(user.companyId);
    }
  }

  getToken(): string | null {
    if (this.isAccessTokenExpired()) {
      this.clear();
      return null;
    }
    return ApplicationSettings.getString(TOKEN_KEY) || null;
  }

  getUser(): SessionUser | null {
    const raw = ApplicationSettings.getString(USER_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as SessionUser;
      return {
        ...parsed,
        companyIds: parsed.companyIds ?? [],
      };
    } catch {
      return null;
    }
  }

  setSelectedCompanyId(companyId: number) {
    ApplicationSettings.setNumber(SELECTED_COMPANY_KEY, companyId);
  }

  getSelectedCompanyId(): number | null {
    if (!ApplicationSettings.hasKey(SELECTED_COMPANY_KEY)) {
      return null;
    }
    return ApplicationSettings.getNumber(SELECTED_COMPANY_KEY);
  }

  clear() {
    ApplicationSettings.remove(TOKEN_KEY);
    ApplicationSettings.remove(TOKEN_EXPIRES_KEY);
    ApplicationSettings.remove(USER_KEY);
    ApplicationSettings.remove(SELECTED_COMPANY_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private isAccessTokenExpired(): boolean {
    if (!ApplicationSettings.hasKey(TOKEN_KEY)) return false;

    const expiresAt = ApplicationSettings.hasKey(TOKEN_EXPIRES_KEY)
      ? ApplicationSettings.getNumber(TOKEN_EXPIRES_KEY)
      : resolveTokenExpiryMs(ApplicationSettings.getString(TOKEN_KEY));

    return isTokenExpired(expiresAt);
  }
}
