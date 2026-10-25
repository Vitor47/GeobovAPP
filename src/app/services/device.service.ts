import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";

import { asList } from "../api/collections";
import { endpoints } from "../api/endpoints";
import { DeviceResponse, DeviceWrite } from "../models/device";

@Injectable({
  providedIn: "root",
})
export class DeviceService {
  private http = inject(HttpClient);

  list(): Observable<DeviceResponse[]> {
    return this.http
      .get<DeviceResponse[] | { items?: DeviceResponse[] }>(endpoints.devices)
      .pipe(map((body) => asList(body)));
  }

  get(id: number): Observable<DeviceResponse> {
    return this.http.get<DeviceResponse>(endpoints.deviceById(id));
  }

  create(body: DeviceWrite): Observable<DeviceResponse> {
    return this.http.post<DeviceResponse>(endpoints.devices, body);
  }
}
