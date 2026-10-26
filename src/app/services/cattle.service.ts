import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, forkJoin, of, timer } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

import { asList } from "../api/collections";
import { endpoints } from "../api/endpoints";
import { environment } from "../../environments/environment";
import { Cattle, CattleResponse, CattleWrite } from "../models/cattle";
import { Company } from "../models/company";
import { DeviceResponse } from "../models/device";
import { TelemetryResponse } from "../models/telemetry";
import { parseApiInstant } from "../utils/telemetry-freshness";
import { CompanyService } from "./company.service";
import { DeviceService } from "./device.service";
import { TelemetryService } from "./telemetry.service";

@Injectable({
  providedIn: "root",
})
export class CattleService {
  private http = inject(HttpClient);
  private companyService = inject(CompanyService);
  private deviceService = inject(DeviceService);
  private telemetryService = inject(TelemetryService);

  list(): Observable<CattleResponse[]> {
    return this.http
      .get<CattleResponse[] | { items?: CattleResponse[] }>(endpoints.cattle)
      .pipe(map((body) => asList(body)));
  }

  get(id: number): Observable<CattleResponse> {
    return this.http.get<CattleResponse>(endpoints.cattleById(id));
  }

  create(body: CattleWrite): Observable<CattleResponse> {
    return this.http.post<CattleResponse>(endpoints.cattle, body);
  }

  update(
    id: number,
    body: Partial<CattleWrite>
  ): Observable<CattleResponse> {
    return this.http.patch<CattleResponse>(endpoints.cattleById(id), body);
  }

  /**
   * Loads cattle + latest GPS sample + device interval + farm name.
   */
  listWithLocations(): Observable<Cattle[]> {
    return forkJoin({
      cattle: this.list(),
      telemetry: this.telemetryService.list().pipe(
        catchError(() => of([] as TelemetryResponse[]))
      ),
      devices: this.deviceService.list().pipe(
        catchError(() => of([] as DeviceResponse[]))
      ),
      company: this.companyService.getCurrentCompany().pipe(
        catchError(() => of(null as Company | null))
      ),
    }).pipe(
      map(({ cattle, telemetry, devices, company }) =>
        this.mergeLatestPositions(cattle, telemetry, devices, company?.name)
      )
    );
  }

  /**
   * Polls the API periodically until unsubscribed.
   */
  watchHerd(
    intervalMs = environment.telemetryPollIntervalMs
  ): Observable<Cattle[]> {
    return timer(0, intervalMs).pipe(
      switchMap(() =>
        this.listWithLocations().pipe(catchError(() => of([] as Cattle[])))
      )
    );
  }

  private mergeLatestPositions(
    cattle: CattleResponse[],
    telemetry: TelemetryResponse[],
    devices: DeviceResponse[],
    companyName?: string | null
  ): Cattle[] {
    const latestByCattle = new Map<number, TelemetryResponse>();
    const intervalByCattle = new Map<number, number>();

    for (const device of devices) {
      if (!device.is_active) continue;
      intervalByCattle.set(
        device.cattle_id,
        device.transmission_interval_minutes ||
          environment.defaultTransmissionIntervalMinutes
      );
    }

    for (const sample of telemetry) {
      const previous = latestByCattle.get(sample.cattle_id);
      if (!previous) {
        latestByCattle.set(sample.cattle_id, sample);
        continue;
      }

      const previousTs = previous.timestamp
        ? parseApiInstant(previous.timestamp)
        : 0;
      const currentTs = sample.timestamp
        ? parseApiInstant(sample.timestamp)
        : 0;

      if (currentTs >= previousTs) {
        latestByCattle.set(sample.cattle_id, sample);
      }
    }

    return cattle
      .filter((item) => item.is_active)
      .map((item) => {
        const position = latestByCattle.get(item.id);
        if (!position) return null;

        return {
          id: item.id,
          name: item.name,
          tag: item.tag,
          description: item.description || item.breed || undefined,
          lat: position.lat,
          lng: position.lon,
          lastSeenAt: position.timestamp ?? null,
          transmissionIntervalMinutes:
            intervalByCattle.get(item.id) ??
            environment.defaultTransmissionIntervalMinutes,
          companyName: companyName || undefined,
          breed: item.breed,
          notes: item.notes,
          weight: item.weight,
          gender: item.gender,
          color: item.color,
          rssi: position.rssi,
          satellites: position.satellites,
        } as Cattle;
      })
      .filter((item): item is Cattle => item != null);
  }

  updateNotes(cattleId: number, notes: string): Observable<CattleResponse> {
    return this.update(cattleId, { notes });
  }
}
