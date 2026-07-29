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
    const token = this.authStorage.getToken();

    let headers = req.headers;

    if (token) {
      headers = headers.set("Authorization", `Bearer ${token}`);
    }

    // Active farm comes from JWT `company_id` (switch via POST /users/switch-company).
    const authReq = req.clone({ headers });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === HttpStatusCode.Unauthorized) {
          this.authStorage.clear();
          this.router.navigate(["/signin"], { clearHistory: true });
        }
        return throwError(() => error);
      })
    );
  }
}
