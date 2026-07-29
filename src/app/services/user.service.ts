import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { environment } from "../../environments/environment";
import { HttpStatusCode } from "../enums/http-status-code";
import { LoginResponse, SessionUser } from "../models/auth";
import { AuthStorageService } from "./auth-storage.service";

@Injectable({
  providedIn: "root",
})
export class UserService {
  private http = inject(HttpClient);
  private authStorage = inject(AuthStorageService);

  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/users`;

  async Login(email: string, password: string) {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.baseUrl}/login`, {
          email,
          password,
        })
      );

      if (!response?.access_token) {
        throw new Error("Login inválido: token não retornado pela API.");
      }

      this.persistLoginResponse(response, email);

      // Superuser without an active farm: activate the default company in the JWT.
      const user = this.authStorage.getUser();
      if (user?.isSuperuser && user.companyId == null) {
        await this.switchCompany(environment.defaultCompanyId);
      }

      return true;
    } catch (error) {
      throw new Error(this.mapLoginError(error));
    }
  }

  /**
   * Issues a new JWT with `company_id` set to the selected farm.
   * Active farm is read from the token — do not send X-Company-Id.
   */
  async switchCompany(companyId: number): Promise<SessionUser> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/switch-company`, {
        company_id: companyId,
      })
    );

    if (!response?.access_token) {
      throw new Error("Troca de fazenda inválida: token não retornado.");
    }

    return this.persistLoginResponse(response);
  }

  private persistLoginResponse(
    response: LoginResponse,
    fallbackEmail?: string
  ): SessionUser {
    const companyIds = Array.from(
      new Set(
        [
          ...(response.company_ids ?? []),
          response.company_id ?? undefined,
        ].filter((id): id is number => id != null)
      )
    );

    const user: SessionUser = {
      id: response.id ?? 0,
      email: response.email ?? fallbackEmail ?? "",
      fullName: response.full_name,
      companyId: response.company_id,
      companyIds,
      role: response.role,
      isSuperuser: !!response.is_superuser,
    };

    this.authStorage.setSession(response.access_token!, user);
    return user;
  }

  async logout() {
    const token = this.authStorage.getToken();

    try {
      if (token) {
        await firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {}));
      }
    } catch {
      // Session may already be invalid; still clear local state.
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

  private mapLoginError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === HttpStatusCode.NetworkError) {
        return "Não foi possível conectar à API. Verifique se ela está rodando e o endereço em environment.ts.";
      }

      if (
        error.status === HttpStatusCode.Unauthorized ||
        error.status === HttpStatusCode.BadRequest
      ) {
        const detail =
          typeof error.error?.detail === "string"
            ? error.error.detail
            : "Credenciais inválidas.";
        return detail;
      }

      return `Erro no login (${error.status}).`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Falha inesperada no login.";
  }
}
