import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

export interface HAController {
  url: string;
  name: string;
  isOnline: boolean;
  lastHealthCheck: Date | null;
  lastResponseTime: number | null;
  sessionToken: string | null;
}

export interface HAClusterStatus {
  enabled: boolean;
  controllers: HAController[];
  onlineCount: number;
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class HAControllerService {
  private _clusterStatus$ = new BehaviorSubject<HAClusterStatus>({
    enabled: false,
    controllers: [],
    onlineCount: 0,
    totalCount: 0
  });

  public clusterStatus$ = this._clusterStatus$.asObservable();

  private healthCheckSubscription: Subscription | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(private httpClient: HttpClient) {}

  /**
   * Initialize HA cluster with discovered controllers
   */
  initializeCluster(controllers: HAController[]): void {
    const status = this._clusterStatus$.value;
    this._clusterStatus$.next({
      ...status,
      enabled: controllers.length > 1,
      controllers: controllers,
      totalCount: controllers.length,
      onlineCount: controllers.filter(c => c.isOnline).length
    });

    // Start health checks if enabled
    if (controllers.length > 1) {
      this.startHealthChecks();
    }
  }

  /**
   * Add a controller to the HA cluster
   */
  addController(controller: HAController): void {
    const status = this._clusterStatus$.value;
    const exists = status.controllers.find(c => c.url === controller.url);

    if (!exists) {
      const controllers = [...status.controllers, controller];
      this._clusterStatus$.next({
        enabled: controllers.length > 1,
        controllers: controllers,
        totalCount: controllers.length,
        onlineCount: controllers.filter(c => c.isOnline).length
      });

      if (controllers.length > 1 && !this.healthCheckSubscription) {
        this.startHealthChecks();
      }
    }
  }

  /**
   * Remove a controller from the HA cluster
   */
  removeController(controllerUrl: string): void {
    const status = this._clusterStatus$.value;
    const controllers = status.controllers.filter(c => c.url !== controllerUrl);

    this._clusterStatus$.next({
      enabled: controllers.length > 1,
      controllers: controllers,
      totalCount: controllers.length,
      onlineCount: controllers.filter(c => c.isOnline).length
    });

    if (controllers.length <= 1 && this.healthCheckSubscription) {
      this.stopHealthChecks();
    }
  }

  /**
   * Update session token for a controller
   */
  updateSessionToken(controllerUrl: string, token: string): void {
    const status = this._clusterStatus$.value;
    const controllers = status.controllers.map(c => {
      if (c.url === controllerUrl) {
        return { ...c, sessionToken: token };
      }
      return c;
    });

    this._clusterStatus$.next({
      ...status,
      controllers: controllers
    });
  }

  /**
   * Get session token for a specific controller
   */
  getSessionToken(controllerUrl: string): string | null {
    const controller = this._clusterStatus$.value.controllers.find(c => c.url === controllerUrl);
    return controller?.sessionToken || null;
  }

  /**
   * Get all online controllers
   */
  getOnlineControllers(): HAController[] {
    return this._clusterStatus$.value.controllers.filter(c => c.isOnline);
  }

  /**
   * Get all controllers with valid sessions
   */
  getControllersWithSessions(): HAController[] {
    return this._clusterStatus$.value.controllers.filter(c => c.sessionToken && c.isOnline);
  }

  /**
   * Check if HA is enabled
   */
  isHAEnabled(): boolean {
    return this._clusterStatus$.value.enabled;
  }

  /**
   * Perform health check on a single controller
   */
  private checkControllerHealth(controller: HAController): Observable<{ url: string; isOnline: boolean; responseTime: number }> {
    const startTime = Date.now();
    const healthUrl = `${controller.url}/edge/management/v1/version`;

    return this.httpClient.get(healthUrl, {
      headers: controller.sessionToken ? { 'zt-session': controller.sessionToken } : {}
    }).pipe(
      map(() => {
        const responseTime = Date.now() - startTime;
        return { url: controller.url, isOnline: true, responseTime };
      }),
      catchError(() => {
        return of({ url: controller.url, isOnline: false, responseTime: -1 });
      })
    );
  }

  /**
   * Perform health checks on all controllers
   */
  private performHealthChecks(): void {
    const status = this._clusterStatus$.value;
    if (!status.enabled || status.controllers.length === 0) {
      return;
    }

    // Check health of all controllers in parallel
    const healthChecks = status.controllers.map(controller =>
      this.checkControllerHealth(controller)
    );

    // Wait for all health checks to complete
    Promise.all(healthChecks.map(obs => obs.toPromise())).then(results => {
      const controllers = status.controllers.map(controller => {
        const result = results.find(r => r && r.url === controller.url);
        if (result) {
          return {
            ...controller,
            isOnline: result.isOnline,
            lastHealthCheck: new Date(),
            lastResponseTime: result.responseTime
          };
        }
        return controller;
      });

      this._clusterStatus$.next({
        ...status,
        controllers: controllers,
        onlineCount: controllers.filter(c => c.isOnline).length
      });
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckSubscription) {
      return; // Already running
    }

    // Perform initial health check immediately
    this.performHealthChecks();

    // Then start periodic checks
    this.healthCheckSubscription = interval(this.HEALTH_CHECK_INTERVAL).subscribe(() => {
      this.performHealthChecks();
    });
  }

  /**
   * Stop periodic health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckSubscription) {
      this.healthCheckSubscription.unsubscribe();
      this.healthCheckSubscription = null;
    }
  }

  /**
   * Reset HA cluster (disable and clear all controllers)
   */
  reset(): void {
    this.stopHealthChecks();
    this._clusterStatus$.next({
      enabled: false,
      controllers: [],
      onlineCount: 0,
      totalCount: 0
    });
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.stopHealthChecks();
  }
}
