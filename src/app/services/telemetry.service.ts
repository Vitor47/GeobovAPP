import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";

import { asList } from "../api/collections";
import { endpoints } from "../api/endpoints";
import { TelemetryResponse } from "../models/telemetry";

@Injectable({
  providedIn: "root",
})
export class TelemetryService {
  private http = inject(HttpClient);

  list(): Observable<TelemetryResponse[]> {
    return this.http
      .get<TelemetryResponse[] | { items?: TelemetryResponse[] }>(
        endpoints.telemetry
      )
      .pipe(map((body) => asList(body)));
  }

  get(id: string): Observable<TelemetryResponse> {
    return this.http.get<TelemetryResponse>(endpoints.telemetryById(id));
  }
}
