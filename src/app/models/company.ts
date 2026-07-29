export interface Company {
  id: number;
  name: string;
}

export interface CompanyListPage {
  items: Company[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
