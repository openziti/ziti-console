export interface AssociatedPage {
  items: any[];
  total: number;
}

export type AssociatedFetcher = (page: number, pageSize: number, search: string) => Promise<AssociatedPage>;

// Server-side paging for an associated list: fetches one page at a time and keeps every fetched page,
// so going back (or repeating a search) costs no request.
export class AssociatedPager {
  page = 1;
  total = 0;
  search = '';
  loading = false;
  items: any[] = [];
  names: string[] = [];

  private cache = new Map<string, AssociatedPage>();
  private requestId = 0;

  constructor(
    private fetcher: AssociatedFetcher,
    private onItems: (items: any[]) => void = () => {},
    readonly pageSize = 5,
  ) {}

  // The underlying query changed (form loaded, attributes edited): drop the cached pages and reload page 1.
  reset(search = this.search): Promise<void> {
    this.cache.clear();
    this.search = search;
    this.page = 1;
    return this.load();
  }

  goTo(page: number): Promise<void> {
    this.page = page;
    return this.load();
  }

  find(search: string): Promise<void> {
    this.search = search;
    this.page = 1;
    return this.load();
  }

  private async load(): Promise<void> {
    const key = `${this.search}|${this.page}`;
    const hit = this.cache.get(key);
    if (hit) {
      this.apply(hit);
      return;
    }
    const id = ++this.requestId;
    this.loading = true;
    try {
      const result = await this.fetcher(this.page, this.pageSize, this.search);
      if (id !== this.requestId) {
        return;
      }
      this.cache.set(key, result);
      this.apply(result);
    } catch (e) {
      if (id === this.requestId) {
        this.apply({items: [], total: 0});
      }
    } finally {
      if (id === this.requestId) {
        this.loading = false;
      }
    }
  }

  private apply(result: AssociatedPage) {
    this.items = result.items;
    this.total = result.total;
    this.names = result.items.map((i) => i?.name ?? String(i));
    this.onItems(result.items);
  }
}
