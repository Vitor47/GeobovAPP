import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, throwError } from "rxjs";

import { endpoints } from "../api/endpoints";
import { Company, CompanyListPage } from "../models/company";
import { normalizeCompanyQuery } from "../utils/company-query";

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

  /**
   * Paginated farm list. `q` allows letters, numbers, space, apostrophe
   * and hyphen, up to 80 characters.
   */
  listCompanies(params: ListCompaniesParams = {}): Observable<CompanyListPage> {
    let query: string | undefined;
    try {
      query = normalizeCompanyQuery(params.q);
    } catch (error) {
      return throwError(() => error);
    }

    let httpParams = new HttpParams()
      .set("page", String(params.page ?? 1))
      .set("page_size", String(params.pageSize ?? 20));

    if (query) {
      httpParams = httpParams.set("q", query);
    }

    return this.http.get<CompanyListPage>(endpoints.companies, {
      params: httpParams,
    });
  }

  /** Company resolved from JWT company_id. */
  getCurrentCompany(): Observable<Company> {
    return this.http.get<Company>(endpoints.companyMe);
  }
}
