import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { RouterExtensions } from "@nativescript/angular";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

import { isAnonymousRequest } from "../api/endpoints";
import { HttpStatusCode } from "../enums/http-status-code";
import { AuthStorageService } from "../services/auth-storage.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authStorage = inject(AuthStorageService);
  private router = inject(RouterExtensions);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    let headers = req.headers.set("Accept", "application/json");

    const anonymous = isAnonymousRequest(req.url);
    const token = anonymous ? null : this.authStorage.getToken();

    if (token) {
      headers = headers.set("Authorization", `Bearer ${token}`);
    }

    // Active farm comes from JWT company_id. Never send X-Company-Id.
    const authReq = req.clone({ headers });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        const revokedSession =
          error.status === HttpStatusCode.Unauthorized &&
          !anonymous &&
          !req.url.endsWith("/users/logout");

        if (revokedSession) {
          this.authStorage.clear();
          this.router.navigate(["/signin"], { clearHistory: true });
        }

        return throwError(() => error);
      })
    );
  }
}
