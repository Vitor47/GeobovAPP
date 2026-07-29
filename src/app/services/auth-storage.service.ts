import { Injectable } from "@angular/core";
import { ApplicationSettings } from "@nativescript/core";

import { SessionUser } from "../models/auth";

const TOKEN_KEY = "geobov_access_token";
const USER_KEY = "geobov_session_user";
const SELECTED_COMPANY_KEY = "geobov_selected_company_id";

@Injectable({
  providedIn: "root",
})
export class AuthStorageService {
  setSession(token: string, user: SessionUser) {
    ApplicationSettings.setString(TOKEN_KEY, token);
    ApplicationSettings.setString(USER_KEY, JSON.stringify(user));

    // Keep local UI selection in sync with the active farm in the JWT.
    if (user.companyId != null) {
      this.setSelectedCompanyId(user.companyId);
    }
  }

  getToken(): string | null {
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
    ApplicationSettings.remove(USER_KEY);
    ApplicationSettings.remove(SELECTED_COMPANY_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
