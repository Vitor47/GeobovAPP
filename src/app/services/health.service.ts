import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";

import { endpoints } from "../api/endpoints";

export interface HealthResponse {
  status: string;
  checks?: {
    database?: boolean;
    redis?: boolean;
    mongo?: boolean;
  };
}

@Injectable({
  providedIn: "root",
})
export class HealthService {
  private http = inject(HttpClient);

  /** Public route. No Authorization header. */
  check(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(endpoints.health);
  }
}
