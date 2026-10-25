import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { messageFromUnknown, isUnauthorized } from "../api/api-error";
import { endpoints } from "../api/endpoints";
import { environment } from "../../environments/environment";
import { HttpStatusCode } from "../enums/http-status-code";
import {
  LoginRequest,
  LoginResponse,
  SessionUser,
  UserProfile,
  normalizeRole,
} from "../models/auth";
import { AuthStorageService } from "./auth-storage.service";

@Injectable({
  providedIn: "root",
})
export class UserService {
  private http = inject(HttpClient);
  private authStorage = inject(AuthStorageService);

  async Login(email: string, password: string) {
    const body: LoginRequest = { email, password };

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(endpoints.login, body)
      );

      if (!response?.access_token) {
        throw new Error("Login inválido: token não retornado pela API.");
      }

      const user = this.persistLoginResponse(response, email);

      if (user.companyId == null) {
        try {
          await this.switchCompany(environment.defaultCompanyId);
        } catch (error) {
          this.authStorage.clear();
          throw error;
        }
      }

      return true;
    } catch (error) {
      throw new Error(this.mapLoginError(error));
    }
  }

  /**
   * Confirms the stored session against GET /users/me.
   * A null company_id is activated with switch-company before other calls.
   * Network failures keep a local session that already has a farm.
   */
  async ensureSession(): Promise<SessionUser | null> {
    if (!this.authStorage.isLoggedIn()) return null;

    const local = this.authStorage.getUser();

    try {
      const me = await firstValueFrom(
        this.http.get<UserProfile>(endpoints.me)
      );
      const user = this.persistProfile(me, local);

      if (user.companyId == null) {
        return await this.switchCompany(environment.defaultCompanyId);
      }

      return user;
    } catch (error) {
      if (isUnauthorized(error)) {
        this.authStorage.clear();
        throw error;
      }

      if (local?.companyId != null) return local;

      if (local) {
        try {
          return await this.switchCompany(environment.defaultCompanyId);
        } catch (switchError) {
          this.authStorage.clear();
          throw switchError;
        }
      }

      throw error;
    }
  }

  /**
   * Issues a new JWT with company_id set to the selected farm.
   * The active farm is read from the token. Do not send X-Company-Id.
   * The previous access token stops working immediately.
   */
  async switchCompany(companyId: number): Promise<SessionUser> {
    const previous = this.authStorage.getUser();
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(endpoints.switchCompany, {
        company_id: companyId,
      })
    );

    if (!response?.access_token) {
      throw new Error("Troca de fazenda inválida: token não retornado.");
    }

    return this.persistLoginResponse(
      { ...response, company_id: response.company_id ?? companyId },
      previous?.email,
      previous
    );
  }

  async logout() {
    const token = this.authStorage.getToken();

    try {
      if (token) {
        await firstValueFrom(this.http.post(endpoints.logout, {}));
      }
    } catch {
      // Revoked or expired sessions still end locally.
    } finally {
      this.authStorage.clear();
    }
  }

  isLogin() {
    return this.authStorage.isLoggedIn();
  }

  currentUser() {
    return this.authStorage.getUser();
  }

  private persistLoginResponse(
    response: LoginResponse,
    fallbackEmail?: string,
    previous?: SessionUser | null
  ): SessionUser {
    const user = this.persistProfile(response, previous, fallbackEmail);
    this.authStorage.setSession(response.access_token!, user);
    return user;
  }

  private persistProfile(
    profile: UserProfile,
    previous?: SessionUser | null,
    fallbackEmail?: string
  ): SessionUser {
    const companyId =
      profile.company_id !== undefined
        ? profile.company_id
        : previous?.companyId;

    const companyIds = Array.from(
      new Set(
        [
          ...(profile.company_ids ?? previous?.companyIds ?? []),
          companyId ?? undefined,
        ].filter((id): id is number => id != null)
      )
    );

    const user: SessionUser = {
      id: profile.id ?? previous?.id ?? 0,
      email: profile.email ?? fallbackEmail ?? previous?.email ?? "",
      fullName: profile.full_name ?? previous?.fullName,
      companyId,
      companyIds,
      role: normalizeRole(profile.role) ?? previous?.role ?? null,
      isSuperuser: profile.is_superuser ?? previous?.isSuperuser ?? false,
    };

    const token = this.authStorage.getToken();
    if (token) {
      this.authStorage.setSession(token, user);
    }

    return user;
  }

  private mapLoginError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === HttpStatusCode.TooManyRequests) {
        return messageFromUnknown(
          error,
          "Muitas tentativas de login. Aguarde 15 minutos e tente de novo."
        );
      }

      if (
        error.status === HttpStatusCode.Unauthorized ||
        error.status === HttpStatusCode.BadRequest
      ) {
        return messageFromUnknown(error, "E-mail ou senha incorretos.");
      }
    }

    return messageFromUnknown(error, "Falha inesperada no login.");
  }
}
