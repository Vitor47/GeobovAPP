import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../environments/environment";
import { Company, CompanyListPage } from "../models/company";

export interface ListCompaniesParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: "root",
})
export class CompanyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/companies`;

  /**
   * Paginated farm list with optional name search.
   * Superuser: all farms. Farmer: only memberships.
   */
  listCompanies(params: ListCompaniesParams = {}): Observable<CompanyListPage> {
    let httpParams = new HttpParams()
      .set("page", String(params.page ?? 1))
      .set("page_size", String(params.pageSize ?? 20));

    const query = params.q?.trim();
    if (query) {
      httpParams = httpParams.set("q", query);
    }

    return this.http.get<CompanyListPage>(`${this.baseUrl}/`, {
      params: httpParams,
    });
  }

  /** Company resolved from JWT `company_id`. */
  getCurrentCompany(): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/me`);
  }
}
