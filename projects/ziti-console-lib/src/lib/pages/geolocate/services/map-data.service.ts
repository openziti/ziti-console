import {Inject, Injectable} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from '../../../services/ziti-data.service';

export interface RouterFetchResult {
  routers: any[];
  routerTypes: Map<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  constructor(@Inject(ZITI_DATA_SERVICE) private zitiDataService: ZitiDataService) {}

  /**
   * Fetch routers from both fabric and edge APIs, merge them together
   * Returns the merged routers and a map of router types (edge-router vs transit-router)
   */
  async fetchRouters(): Promise<RouterFetchResult> {
    const fabricUrl = '/routers?limit=1000';
    const edgePaging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };

    // Load both APIs in parallel
    const fabricPromise = this.zitiDataService.call(fabricUrl, '/fabric/v1').catch(() => ({ data: [] }));
    const edgePromise = this.zitiDataService.get('edge-routers', edgePaging, []).catch(() => ({ data: [] }));

    const [fabricResult, edgeResult] = await Promise.all([fabricPromise, edgePromise]);

    const fabricRouters = fabricResult?.data || [];
    const edgeRouters = edgeResult?.data || [];

    // Create a map of edge routers by ID for quick lookup
    const edgeRouterMap = new Map(edgeRouters.map((r: any) => [r.id, r]));

    const routerTypes = new Map<string, string>();

    // Merge: Use fabric routers as base, enrich with edge router data (especially roleAttributes)
    const mergedRouters = fabricRouters.map((fabricRouter: any) => {
      const edgeRouter: any = edgeRouterMap.get(fabricRouter.id);
      if (edgeRouter) {
        // This is an edge router - track it
        routerTypes.set(fabricRouter.id, 'edge-router');
        // Merge: fabric router data + edge router role attributes and other properties
        return {
          ...fabricRouter,
          roleAttributes: edgeRouter.roleAttributes || [],
          // Keep other edge router properties that might be useful
          ...edgeRouter,
          _routerType: 'edge-router'
        };
      }
      // This is a transit router (not in edge API)
      routerTypes.set(fabricRouter.id, 'transit-router');
      return {
        ...fabricRouter,
        _routerType: 'transit-router'
      };
    });

    return {
      routers: mergedRouters,
      routerTypes
    };
  }

  /**
   * Fetch identities with optional filters
   */
  async fetchIdentities(filters: any[] = []): Promise<any[]> {
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };

    const result = await this.zitiDataService.get('identities', paging, filters);
    const allIdentities = result?.data || [];

    // Filter out identities of type "Router" since those are already shown as red router markers
    return allIdentities.filter((identity: any) => identity.type?.entity !== 'Router');
  }

  /**
   * Fetch services with optional filters
   */
  async fetchServices(filters: any[] = []): Promise<any[]> {
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };

    const result = await this.zitiDataService.get('services', paging, filters);
    return result?.data || [];
  }

  /**
   * Fetch circuits from fabric API
   */
  async fetchCircuits(): Promise<any[]> {
    const url = '/circuits?limit=1000';

    try {
      const result = await this.zitiDataService.call(url, '/fabric/v1');
      return result?.data || [];
    } catch (error) {
      // Circuits feature unavailable - this might be expected if fabric API is not enabled
      return [];
    }
  }

  /**
   * Fetch terminators from fabric API
   */
  async fetchTerminators(): Promise<any[]> {
    const url = '/terminators?limit=1000';

    try {
      const result = await this.zitiDataService.call(url, '/fabric/v1');
      return result?.data || [];
    } catch (error) {
      // Terminators feature unavailable - this might be expected if fabric API is not enabled
      return [];
    }
  }

  /**
   * Fetch links from fabric API
   */
  async fetchLinks(): Promise<any[]> {
    const url = '/links?limit=1000';

    try {
      const result = await this.zitiDataService.call(url, '/fabric/v1');
      return result?.data || [];
    } catch (error) {
      // Links feature unavailable - this might be expected if fabric API is not enabled
      return [];
    }
  }
}
