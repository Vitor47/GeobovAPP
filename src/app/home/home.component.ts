import {
  Component,
  OnDestroy,
  NO_ERRORS_SCHEMA,
  inject,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { request } from "@nativescript-community/perms";
import {
  ActionBarComponent,
  NativeScriptFormsModule,
  NativeScriptRouterModule,
  RouterExtensions,
} from "@nativescript/angular";
import { CoreTypes, ImageSource } from "@nativescript/core";
import * as geolocation from "@nativescript/geolocation";
import {
  CameraUpdate,
  GoogleMap,
  MapReadyEvent,
  MapView,
  Marker,
} from "@nativescript/google-maps";
import { GoogleMapsModule } from "@nativescript/google-maps/angular";
import { Toasty } from "@triniwiz/nativescript-toasty";
import { Subscription, firstValueFrom } from "rxjs";

import { environment } from "../../environments/environment";
import { messageFromUnknown } from "../api/api-error";
import { Cattle } from "../models/cattle";
import { Company } from "../models/company";
import { AuthStorageService } from "../services/auth-storage.service";
import { CattleService } from "../services/cattle.service";
import { CompanyService } from "../services/company.service";
import { UserService } from "../services/user.service";
import { companyQueryError } from "../utils/company-query";
import {
  formatNextUpdateEta,
  formatTimeAgo,
} from "../utils/telemetry-freshness";

@Component({
  selector: "ns-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
  standalone: true,
  imports: [
    NativeScriptRouterModule,
    ReactiveFormsModule,
    NativeScriptFormsModule,
    ActionBarComponent,
    GoogleMapsModule,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class HomeComponent implements OnDestroy {
  private cattleService = inject(CattleService);
  private companyService = inject(CompanyService);
  private authStorage = inject(AuthStorageService);
  private userService = inject(UserService);
  private router = inject(RouterExtensions);
  private herdSub?: Subscription;
  private freshnessTimer?: ReturnType<typeof setInterval>;

  readonly formatTimeAgo = formatTimeAgo;
  readonly formatNextUpdateEta = formatNextUpdateEta;

  mapView!: MapView;
  map!: GoogleMap;

  isNotFound = false;
  searchQuery = "";
  isSuperuser = false;
  canSwitchFarm = false;
  canEditNotes = true;
  companies: Company[] = [];
  selectedCompanyName = "Carregando fazenda...";

  selectedCattle: Cattle | null = null;
  observationDraft = "";
  isSavingNotes = false;
  isMenuOpen = false;
  isFarmPickerOpen = false;
  farmSearchQuery = "";
  farmPage = 1;
  farmHasMore = false;
  farmTotal = 0;
  isLoadingFarms = false;
  private readonly farmPageSize = 20;
  private farmSearchDebounceTimer?: ReturnType<typeof setTimeout>;

  private selectedMarker: Marker | null = null;
  private infoWindowTimeout?: ReturnType<typeof setTimeout>;
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private readonly searchDebounceMs = 400;

  cattles = new Map<string, { cattle: Cattle; marker: Marker | null }>();

  cattleIcon = ImageSource.fromFileSync("~/assets/cattle.webp").resize(100);

  constructor() {
    const user = this.userService.currentUser();
    this.isSuperuser = !!user?.isSuperuser;
    const readOnly = user?.role === "viewer" && !user.isSuperuser;
    this.canEditNotes = !readOnly;

    void this.bootstrapFarmContext();
    this.startHerdWatch();

    this.freshnessTimer = setInterval(() => {
      if (this.selectedCattle) {
        const latest = this.cattles.get(String(this.selectedCattle.id))?.cattle;
        if (latest) {
          this.selectedCattle = { ...latest };
        }
      }
    }, environment.freshnessLabelRefreshMs);
  }

  ngOnDestroy() {
    this.herdSub?.unsubscribe();
    if (this.freshnessTimer) {
      clearInterval(this.freshnessTimer);
      this.freshnessTimer = undefined;
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = undefined;
    }
    if (this.farmSearchDebounceTimer) {
      clearTimeout(this.farmSearchDebounceTimer);
      this.farmSearchDebounceTimer = undefined;
    }
    this.clearSearchSelection();
  }

  onOpenMenu() {
    this.closeCattleDetail();
    this.isFarmPickerOpen = false;
    this.isMenuOpen = true;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  async onMenuLogout() {
    this.closeMenu();
    await this.onLogout();
  }

  onMenuSwitchFarm() {
    if (!this.canSwitchFarm) return;
    this.isMenuOpen = false;
    // Open on next tick so the closing menu tap does not dismiss the picker.
    setTimeout(() => {
      this.isFarmPickerOpen = true;
      void this.resetAndLoadFarms();
    }, 0);
  }

  closeFarmPicker() {
    this.isFarmPickerOpen = false;
    this.farmSearchQuery = "";
  }

  onFarmSearchInput(query: string) {
    this.farmSearchQuery = query ?? "";
    if (this.farmSearchDebounceTimer) {
      clearTimeout(this.farmSearchDebounceTimer);
    }
    this.farmSearchDebounceTimer = setTimeout(() => {
      this.farmSearchDebounceTimer = undefined;
      void this.resetAndLoadFarms();
    }, 400);
  }

  async loadMoreFarms() {
    if (!this.farmHasMore || this.isLoadingFarms) return;
    await this.loadFarmsPage(this.farmPage + 1, false);
  }

  private async resetAndLoadFarms() {
    const invalid = companyQueryError(this.farmSearchQuery);
    if (invalid) {
      new Toasty({ text: invalid }).show();
      return;
    }

    this.companies = [];
    this.farmPage = 1;
    this.farmHasMore = false;
    await this.loadFarmsPage(1, true);
  }

  private async loadFarmsPage(page: number, replace: boolean) {
    this.isLoadingFarms = true;
    try {
      const result = await firstValueFrom(
        this.companyService.listCompanies({
          q: this.farmSearchQuery,
          page,
          pageSize: this.farmPageSize,
        })
      );

      this.companies = replace
        ? result.items
        : [...this.companies, ...result.items];
      this.farmPage = result.page;
      this.farmHasMore = result.has_more;
      this.farmTotal = result.total;
    } catch (error) {
      if (replace) {
        this.companies = [];
        this.farmHasMore = false;
        this.farmTotal = 0;
      }
      new Toasty({
        text: messageFromUnknown(error, "Não foi possível carregar as fazendas"),
      }).show();
    } finally {
      this.isLoadingFarms = false;
    }
  }

  async onLogout() {
    await this.userService.logout();
    this.router.navigate(["/signin"], { clearHistory: true });
  }

  async selectFarm(company: Company) {
    if (!this.canSwitchFarm) return;

    const currentId =
      this.authStorage.getUser()?.companyId ??
      this.authStorage.getSelectedCompanyId();
    if (currentId === company.id) {
      this.isFarmPickerOpen = false;
      return;
    }

    this.isFarmPickerOpen = false;
    this.closeCattleDetail();
    // Stop polls before switching token so in-flight herd data can't repaint old markers.
    this.herdSub?.unsubscribe();
    this.herdSub = undefined;
    this.clearMapMarkers();
    this.selectedCompanyName = company.name;

    try {
      await this.userService.switchCompany(company.id);
      this.startHerdWatch();
    } catch (error) {
      this.selectedCompanyName = "Fazenda indisponível";
      new Toasty({
        text: messageFromUnknown(error, "Não foi possível trocar de fazenda"),
      }).show();
      this.startHerdWatch();
    }
  }

  async onMapReady(event: MapReadyEvent) {
    this.mapView = event.object as any;
    const mapView = this.mapView as any;

    // Fallback listeners if Angular template events differ by plugin version.
    // Cast: some event names are valid at runtime but missing from plugin typings.
    mapView?.on?.("markerTap", (args: any) => this.onMarkerTap(args));
    mapView?.on?.("markerSelect", (args: any) => this.onMarkerTap(args));
    mapView?.on?.("infoWindowTap", (args: any) => this.onMarkerTap(args));
    mapView?.on?.("markerInfoWindowTapped", (args: any) =>
      this.onMarkerTap(args)
    );

    // Suppress the native info window; we use the bottom sheet instead.
    mapView?.on?.("markerInfoWindow", () => null);
  }

  async onReady(event: MapReadyEvent) {
    this.map = event.map;

    await request("location", {
      type: "always",
    });

    this.map.myLocationEnabled = true;
    this.map.uiSettings.myLocationButtonEnabled = true;

    await geolocation.enableLocationRequest();

    try {
      const currentLocation = await geolocation.getCurrentLocation({
        desiredAccuracy: CoreTypes.Accuracy.high,
        maximumAge: 5000,
        timeout: 20000,
      });

      this.map.animateCamera(
        CameraUpdate.fromCoordinate(
          {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          },
          16
        )
      );
    } catch {
      // Keep default map position if GPS is unavailable.
    }

    this.renderAllCattles();

    if (this.searchQuery.trim()) {
      this.onSearch(this.searchQuery);
    }
  }

  onSuppressInfoWindow() {
    // Returning null tells the Maps plugin not to render the native balloon.
    return null;
  }

  onMarkerTap(event: any) {
    const marker = (event?.marker ?? event?.object) as Marker | undefined;
    const cattle = this.resolveCattleFromMarker(marker);
    if (!cattle) return;

    try {
      marker?.hideInfoWindow?.();
    } catch {
      // Native info window may already be closed.
    }

    this.openCattleDetail(cattle, marker);
  }

  private resolveCattleFromMarker(marker?: Marker | null): Cattle | null {
    if (!marker) return null;

    const userData = (marker as any).userData;
    const cattleId = userData?.cattleId ?? userData?.id;
    if (cattleId != null) {
      return this.cattles.get(String(cattleId))?.cattle ?? null;
    }

    for (const [, entry] of this.cattles.entries()) {
      if (entry.marker === marker) {
        return entry.cattle;
      }
    }

    const title = (marker as any).title as string | undefined;
    const lat = (marker as any).position?.lat;
    const lng = (marker as any).position?.lng;

    for (const [, entry] of this.cattles.entries()) {
      const sameTitle =
        title &&
        (entry.cattle.name === title || entry.cattle.tag === title);
      const samePosition =
        lat != null &&
        lng != null &&
        Math.abs(entry.cattle.lat - lat) < 0.000001 &&
        Math.abs(entry.cattle.lng - lng) < 0.000001;

      if (sameTitle || samePosition) {
        return entry.cattle;
      }
    }

    return null;
  }

  openCattleDetail(cattle: Cattle, marker?: Marker | null) {
    this.selectedCattle = cattle;
    this.observationDraft = cattle.notes ?? "";
    this.selectedMarker =
      marker ?? this.cattles.get(String(cattle.id))?.marker ?? null;

    try {
      this.selectedMarker?.hideInfoWindow?.();
    } catch {
      // Ignore.
    }
  }

  closeCattleDetail() {
    this.selectedCattle = null;
    this.observationDraft = "";
    this.clearSearchSelection();
  }

  async onSaveObservation() {
    if (!this.selectedCattle || this.isSavingNotes) return;

    this.isSavingNotes = true;
    try {
      const updated = await firstValueFrom(
        this.cattleService.updateNotes(
          this.selectedCattle.id,
          this.observationDraft.trim()
        )
      );

      const key = String(this.selectedCattle.id);
      const existing = this.cattles.get(key);
      if (existing) {
        const cattle: Cattle = {
          ...existing.cattle,
          notes: updated.notes,
          description: updated.description || existing.cattle.description,
        };
        this.cattles.set(key, { ...existing, cattle });
        this.selectedCattle = cattle;
        this.observationDraft = updated.notes ?? "";
      }

      new Toasty({ text: "Observação salva" }).show();
    } catch (error) {
      new Toasty({
        text: messageFromUnknown(error, "Não foi possível salvar a observação"),
      }).show();
    } finally {
      this.isSavingNotes = false;
    }
  }

  private async bootstrapFarmContext() {
    const user = this.userService.currentUser();
    console.log(
      "farm context user",
      JSON.stringify({
        companyId: user?.companyId ?? null,
        role: user?.role ?? null,
        isSuperuser: !!user?.isSuperuser,
      })
    );

    try {
      const current = await firstValueFrom(
        this.companyService.getCurrentCompany()
      );
      this.selectedCompanyName = current.name;
    } catch (error) {
      console.log("GET /companies/me failed", this.describeApiError(error));
      this.selectedCompanyName = messageFromUnknown(
        error,
        "Fazenda indisponível"
      );
    }

    try {
      const page = await firstValueFrom(
        this.companyService.listCompanies({ page: 1, pageSize: 20 })
      );
      this.canSwitchFarm = page.total > 1;
      this.farmTotal = page.total;
      if (!this.selectedCompanyName || this.selectedCompanyName === "Carregando fazenda...") {
        this.selectedCompanyName = page.items[0]?.name || this.selectedCompanyName;
      }
    } catch (error) {
      console.log("GET /companies/ failed", this.describeApiError(error));
      this.canSwitchFarm = false;
    }
  }

  private describeApiError(error: unknown): string {
    if (error instanceof Error && !("status" in error)) {
      return error.message;
    }
    const httpError = error as {
      status?: number;
      url?: string;
      message?: string;
      error?: { detail?: unknown };
    };
    const detail = httpError.error?.detail;
    return JSON.stringify({
      status: httpError.status ?? null,
      url: httpError.url ?? null,
      message: httpError.message ?? null,
      detail: typeof detail === "string" ? detail : detail ?? null,
    });
  }

  private startHerdWatch() {
    this.herdSub?.unsubscribe();
    this.herdSub = this.cattleService.watchHerd().subscribe((herd) => {
      this.applyHerdUpdate(herd);

      if (herd[0]?.companyName) {
        this.selectedCompanyName = herd[0].companyName;
      }

      if (this.selectedCattle) {
        const latest = herd.find((item) => item.id === this.selectedCattle?.id);
        if (latest) {
          this.selectedCattle = latest;
          if (!this.isSavingNotes) {
            this.observationDraft = latest.notes ?? this.observationDraft;
          }
        } else {
          // Animal left the herd (e.g. farm switch) — close the sheet.
          this.closeCattleDetail();
        }
      }

      if (this.searchQuery.trim()) {
        this.onSearch(this.searchQuery);
      }
    });
  }

  private clearMapMarkers() {
    for (const [, entry] of this.cattles.entries()) {
      try {
        (entry.marker as any)?.remove?.();
      } catch {
        // Marker may already be detached.
      }
    }
    this.cattles.clear();
    this.clearSearchSelection();

    // Wipe orphans the Map may still hold after a failed per-marker remove.
    try {
      (this.map as any)?.clear?.();
    } catch {
      // clear() may be unavailable on some plugin builds.
    }
  }

  private applyHerdUpdate(herd: Cattle[]) {
    const nextKeys = new Set(herd.map((cattle) => String(cattle.id)));

    for (const [key, entry] of this.cattles.entries()) {
      if (!nextKeys.has(key)) {
        try {
          (entry.marker as any)?.remove?.();
        } catch {
          // Marker may already be detached from the map.
        }
        this.cattles.delete(key);
      }
    }

    for (const cattle of herd) {
      const key = String(cattle.id);
      const existing = this.cattles.get(key);

      this.cattles.set(key, {
        cattle,
        marker: existing?.marker ?? null,
      });
    }

    this.renderAllCattles();
  }

  updateMarker(cattle: Cattle, existingMarker?: Marker | null) {
    if (!this.map) return null;

    // Keep title/snippet empty so Google Maps does not show the native balloon.
    const userData = { cattleId: cattle.id };

    if (existingMarker) {
      existingMarker.position = {
        lat: cattle.lat,
        lng: cattle.lng,
      };
      existingMarker.title = "";
      existingMarker.snippet = "";
      (existingMarker as any).userData = userData;
      try {
        existingMarker.hideInfoWindow?.();
      } catch {
        // Ignore.
      }
      return existingMarker;
    }

    return this.map.addMarker({
      position: {
        lat: cattle.lat,
        lng: cattle.lng,
      },
      title: "",
      snippet: "",
      icon: this.cattleIcon,
      userData,
    } as any);
  }

  renderAllCattles() {
    if (!this.map) return;

    for (const [key, value] of this.cattles.entries()) {
      const marker = this.updateMarker(value.cattle, value.marker);

      this.cattles.set(key, {
        ...value,
        marker,
      });
    }
  }

  private clearSearchSelection() {
    if (this.infoWindowTimeout) {
      clearTimeout(this.infoWindowTimeout);
      this.infoWindowTimeout = undefined;
    }

    this.selectedMarker?.hideInfoWindow();
    this.selectedMarker = null;
  }

  private normalizeText(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private matchScore(query: string, cattle: Cattle): number | null {
    const normalizedQuery = this.normalizeText(query);
    const fields: Array<{ value?: string; priority: number }> = [
      { value: cattle.name, priority: 0 },
      { value: cattle.tag, priority: 1 },
      { value: cattle.description, priority: 2 },
      { value: cattle.notes ?? undefined, priority: 3 },
      { value: cattle.companyName, priority: 4 },
    ];

    let bestScore: number | null = null;

    for (const { value, priority } of fields) {
      if (!value?.trim()) continue;

      const normalizedValue = this.normalizeText(value);
      let score: number | null = null;

      if (normalizedValue === normalizedQuery) {
        score = priority;
      } else if (normalizedValue.startsWith(normalizedQuery)) {
        score = priority + 0.1;
      } else if (normalizedValue.includes(normalizedQuery)) {
        score = priority + 0.2;
      }

      if (score != null && (bestScore == null || score < bestScore)) {
        bestScore = score;
      }
    }

    return bestScore;
  }

  private findMatches(query: string) {
    return Array.from(this.cattles.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        score: this.matchScore(query, entry.cattle),
      }))
      .filter(
        (match): match is {
          key: string;
          entry: { cattle: Cattle; marker: Marker | null };
          score: number;
        } => match.score != null
      )
      .sort((a, b) => a.score - b.score);
  }

  private ensureMarker(
    entry: { cattle: Cattle; marker: Marker | null },
    key: string
  ) {
    if (entry.marker) return entry.marker;

    this.renderAllCattles();
    return this.cattles.get(key)?.marker ?? null;
  }

  private focusOnMatches(
    matches: Array<{
      key: string;
      entry: { cattle: Cattle; marker: Marker | null };
    }>
  ) {
    if (!this.map || !matches.length) return;

    this.clearSearchSelection();

    const coordinates = matches.map(({ entry }) => ({
      lat: entry.cattle.lat,
      lng: entry.cattle.lng,
    }));

    if (coordinates.length === 1) {
      this.map.moveCamera(CameraUpdate.fromCoordinate(coordinates[0], 16));
    } else {
      this.map.moveCamera(CameraUpdate.fromCoordinates(coordinates, 16));
    }

    const primary = matches[0];
    const primaryMarker = this.ensureMarker(primary.entry, primary.key);
    this.openCattleDetail(primary.entry.cattle, primaryMarker);
  }

  onSearchInput(query: string) {
    this.searchQuery = query ?? "";

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = undefined;
      this.onSearch(this.searchQuery);
    }, this.searchDebounceMs);
  }

  onSearch(query: string) {
    const normalizedQuery = (query ?? "").trim();

    if (!normalizedQuery) {
      this.isNotFound = false;
      return;
    }

    if (!this.map) return;

    const rankedMatches = this.findMatches(normalizedQuery);

    if (!rankedMatches.length) {
      this.isNotFound = true;
      this.closeCattleDetail();
      return;
    }

    this.isNotFound = false;
    this.focusOnMatches(
      rankedMatches.map(({ key, entry }) => ({ key, entry }))
    );
  }
}
