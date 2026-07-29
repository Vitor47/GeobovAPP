import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, forkJoin, of, timer } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

import { environment } from "../../environments/environment";
import { Cattle, CattleResponse } from "../models/cattle";
import { Company } from "../models/company";
import { DeviceResponse } from "../models/device";
import { TelemetryResponse } from "../models/telemetry";
import { CompanyService } from "./company.service";

@Injectable({
  providedIn: "root",
})
export class CattleService {
  private http = inject(HttpClient);
  private companyService = inject(CompanyService);

  private readonly cattleUrl = `${environment.apiBaseUrl}/api/v1/cattle/`;
  private readonly telemetryUrl = `${environment.apiBaseUrl}/api/v1/telemetry/`;
  private readonly devicesUrl = `${environment.apiBaseUrl}/api/v1/devices/`;

  /**
   * Loads cattle + latest GPS sample + device interval + farm name.
   */
  listWithLocations(): Observable<Cattle[]> {
    return forkJoin({
      cattle: this.http.get<CattleResponse[]>(this.cattleUrl),
      telemetry: this.http.get<TelemetryResponse[]>(this.telemetryUrl).pipe(
        catchError(() => of([] as TelemetryResponse[]))
      ),
      devices: this.http.get<DeviceResponse[]>(this.devicesUrl).pipe(
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
   * Interval should match (or be slightly under) the LoRa transmission cycle.
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
        ? new Date(previous.timestamp).getTime()
        : 0;
      const currentTs = sample.timestamp
        ? new Date(sample.timestamp).getTime()
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
          description:
            item.description || item.breed || undefined,
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
        } as Cattle;
      })
      .filter((item): item is Cattle => item != null);
  }

  updateNotes(cattleId: number, notes: string): Observable<CattleResponse> {
    return this.http.patch<CattleResponse>(`${this.cattleUrl}${cattleId}`, {
      notes,
    });
  }
}
