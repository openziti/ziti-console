/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {Injectable, Inject} from '@angular/core';
import { HttpClient } from "@angular/common/http";
import {LoginServiceClass, SettingsServiceClass, GrowlerService, GrowlerModel, SETTINGS_SERVICE, HAControllerService} from "ziti-console-lib";
import {finalize, firstValueFrom, lastValueFrom, Observable, ObservableInput, of, switchMap, tap} from "rxjs";
import {catchError} from "rxjs/operators";
import {Router} from "@angular/router";
import moment from "moment";
import {debounce, defer, isEmpty, isNil} from "lodash";

@Injectable({
    providedIn: 'root'
})
export class ControllerLoginService extends LoginServiceClass {
    private domain = '';

    constructor(
        override httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) override settingsService: SettingsServiceClass,
        override router: Router,
        override growlerService: GrowlerService,
        private haControllerService: HAControllerService
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    async init() {
        return Promise.resolve();
    }

    async login(prefix: string, url: string, username: string, password: string, doNav = true, type?, token?, isTest?): Promise<any> {
        return this.controllerLogin(prefix, url, username, password, doNav, type, token, isTest);
    }

    checkOriginForController(): Promise<any> {
        this.checkingControllerOrigin = true;
        const controllerUrl = window.location.origin;
        return this.settingsService.initApiVersions(controllerUrl).then((result) => {
            if (isNil(result) || isEmpty(result)) {
                return false;
            } else {
                return true;
            }
        }).catch((result) => {
            return false;
        }).finally(() => {
            this.checkingControllerOrigin = false;
        });
    }

    controllerLogin(prefix: string, url: string, username: string, password: string, doNav = true, type?, token?, isTest?): Promise<any> {
        this.domain = url;
        const serviceUrl = url + prefix;
        return lastValueFrom(this.observeLogin(serviceUrl, username, password, doNav, type, token, isTest)
        ).then(() => {
            if (doNav && !isTest) {
                this.router.navigate(['/']);
            }
        });
    }

    observeLogin(serviceUrl: string, username?: string, password?: string, doNav = true, type?, token?, isTest?) {
        if (this.loginInProgress) {
            return of(false);
        }
        let isCertBased = !(username && password) && type !== 'ext-jwt';
        let queryParams = isCertBased ? '?method=cert' : type === 'ext-jwt' ? '?method=ext-jwt' : '?method=password';
        let requestBody = username && password ? { username, password } : undefined;
        let endpoint = serviceUrl + '/authenticate';
        let headers: any = {
            "content-type": "application/json",
        };
        if (type === 'ext-jwt') {
            headers = {
                "content-type": "application/json",
                "Authorization": 'Bearer ' + token
            }
        }
        this.loginInProgress = true;
        this.certBasedAttempted = this.certBasedAttempted || isCertBased;
        return this.httpClient.post(endpoint + queryParams, requestBody, { headers })
            .pipe(
                switchMap((body: any) => {
                    return this.handleLoginResponse.bind(this)(body, username, password, isTest).pipe(switchMap(body => {
                        this.serviceUrl = serviceUrl;
                        this.isCertBasedAuth = isCertBased;
                        return of(body);
                    }))
                }),
                catchError((err: any) => {
                    if (isTest) {
                        throw err;
                        return undefined;
                    }
                    let errorMessage, growlerData;
                    if (err.code === "ECONNREFUSED") {
                        errorMessage = `Server Not Accessible. Please make sure controller is online.`;
                        growlerData = new GrowlerModel(
                            'error',
                            'Error',
                            `Login Failed`,
                            errorMessage,
                        );
                    } else {
                        const status = err?.statusText;
                        const code = '- ' + (err?.error?.code || status);
                        errorMessage = `Unable to login to selected edge controller ${code}. Please make sure the selected controller is online and accessible`;
                        growlerData = new GrowlerModel(
                            'error',
                            'Error',
                            `Login Failed`,
                            errorMessage,
                        );
                        if (doNav) {
                            this.router.navigate(['/login']);
                        }
                    }
                    if (doNav) {
                        if (this.settingsService?.settings?.session) {
                            this.settingsService.settings.session.id = undefined;
                        }
                        this.settingsService.set(this.settingsService.settings)
                    }
                    this.growlerService.show(growlerData);
                    throw({error: errorMessage, controllerInvalid: err?.status === 0, statusText: err?.statusText});
                }),
                finalize(() => {
                    this.loginInProgress = false
                })
            );
    }

    private handleLoginResponse(body: any, username: string, password: string, isTest = false): Observable<any> {
        if (isTest) {
            return of([body.data?.token]);
        }
        if (body.error) throw body.error;

        // Extract token from response
        const token = body.data?.token;

        // Store both legacy session and JWT token
        const settings = {
            ...this.settingsService.settings, session: {
                id: token,
                controllerDomain: this.domain,
                authorization: 100,
                expiresAt: body.data.expiresAt,
                expirationSeconds: body.data.expirationSeconds
            }
        }
        this.settingsService.set(settings);

        // Store JWT token for HA authentication
        // Note: In OpenZiti v2.0+, the token should be a JWT, not a session UUID
        if (token) {
            this.settingsService.setJwtToken(token);
        }

        // After successful login, discover and authenticate to HA controllers
        this.discoverAndAuthenticateHAControllers(this.domain, username, password, body.data?.token)
            .then((haControllers) => {
                // Success - no growler needed
            })
            .catch((err) => {
                // Show error only if HA controller discovery/authentication fails
                const growlerData = new GrowlerModel(
                    'error',
                    'HA Controller Error',
                    `Failed to connect to peer controllers in HA cluster`,
                );
                this.growlerService.show(growlerData);
            });

        return of([body.data?.token]);
    }

    /**
     * Discover HA peer controllers
     * With JWT authentication, we don't need to authenticate separately to each peer
     * The JWT token from the primary controller works across the entire HA cluster
     */
    private async discoverAndAuthenticateHAControllers(
        primaryUrl: string,
        username: string,
        password: string,
        jwtToken: string
    ): Promise<any[]> {
        try {
            // Get API versions from primary controller
            const versionUrl = `${primaryUrl}/edge/management/v1/version`;
            const versionResponse: any = await firstValueFrom(
                this.httpClient.get(versionUrl, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                })
            );

            // Check if fabric API exists (indicates HA capability)
            const hasPeerData = versionResponse?.data?.peerControllers;
            const fabricApi = versionResponse?.data?.apiVersions?.fabric;

            // Also check for alternative peer data locations
            const buildInfo = versionResponse?.data?.buildInfo;
            const capabilities = versionResponse?.data?.capabilities;

            // For now, if fabric API exists but no peer data, try to get cluster members
            if (!hasPeerData && fabricApi) {

                // Try endpoint 1: /fabric/v1/cluster/list-members (used by ziti CLI)
                // Note: This endpoint returns addresses in format "tls:hostname:port" which we convert to "https://hostname"
                try {
                    const clusterUrl = `${primaryUrl}/fabric/v1/cluster/list-members`;

                    const clusterResponse: any = await firstValueFrom(
                        this.httpClient.get(clusterUrl).pipe(
                            catchError((err) => {
                                throw err;
                            })
                        )
                    );

                    if (clusterResponse?.data && Array.isArray(clusterResponse.data)) {
                        const clusterMembers = clusterResponse.data;

                        // Check if cluster members have API URLs
                        const memberUrls = clusterMembers
                            .filter((member: any) => member.address || member.apiAddresses || member.addr || member.url)
                            .map((member: any) => {
                                // Get the address in whatever format it's provided
                                let rawAddress = member.address || member.apiAddresses?.[0] || member.url || member.addr;

                                // Convert "tls:hostname:port" format to "https://hostname"
                                let apiUrl = rawAddress;
                                if (rawAddress?.startsWith('tls:')) {
                                    // Format: "tls:hostname:port" -> "https://hostname"
                                    const parts = rawAddress.substring(4).split(':'); // Remove "tls:" and split by ":"
                                    const hostname = parts[0];
                                    apiUrl = `https://${hostname}`;
                                }

                                return {
                                    url: apiUrl,
                                    id: member.id || member.name,
                                    isLeader: member.leader,
                                    isConnected: member.connected !== false
                                };
                            });

                        if (memberUrls.length > 0 && memberUrls[0].url) {
                            // Verify each controller is reachable before enabling HA
                            const verificationPromises = memberUrls.map(async (member: any, index: number) => {
                                try {
                                    const testUrl = `${member.url}/edge/management/v1/version`;
                                    const response = await firstValueFrom(
                                        this.httpClient.get(testUrl, {
                                            headers: { 'Authorization': `Bearer ${jwtToken}` }
                                        }).pipe(
                                            catchError(() => {
                                                return of(null); // Mark as failed
                                            })
                                        )
                                    );

                                    // If catchError returned null, throw to mark as failed
                                    if (response === null) {
                                        throw new Error('Controller verification failed');
                                    }

                                    return {
                                        url: member.url,
                                        name: index === 0 ? 'Primary Controller' : `Peer Controller ${index}`,
                                        isOnline: true,
                                        lastHealthCheck: new Date(),
                                        lastResponseTime: null,
                                        sessionToken: null,
                                        verified: true
                                    };
                                } catch (err) {
                                    return {
                                        url: member.url,
                                        name: index === 0 ? 'Primary Controller' : `Peer Controller ${index}`,
                                        isOnline: false,
                                        lastHealthCheck: new Date(),
                                        lastResponseTime: null,
                                        sessionToken: null,
                                        verified: false
                                    };
                                }
                            });

                            const verifiedControllers = await Promise.all(verificationPromises);
                            const onlineControllers = verifiedControllers.filter((c: any) => c.verified);
                            const allOnline = verifiedControllers.every((c: any) => c.verified);

                            // Only enable HA if there are 2+ online controllers
                            if (onlineControllers.length >= 2) {
                                // Add only online controllers to settings
                                onlineControllers.forEach((controller: any) => {
                                    this.settingsService.addHAController(controller.url, controller.name);
                                });

                                // Initialize HA cluster
                                this.haControllerService.initializeCluster(onlineControllers);

                                // Show warning if some controllers failed
                                if (!allOnline) {
                                    const failedCount = verifiedControllers.length - onlineControllers.length;
                                    const growlerData = new GrowlerModel(
                                        'warning',
                                        'Partial HA Cluster',
                                        `Connected to ${onlineControllers.length} of ${verifiedControllers.length} controllers. ${failedCount} controller(s) unreachable (possibly cert issues).`,
                                    );
                                    this.growlerService.show(growlerData);
                                }

                                return onlineControllers.slice(1); // Return peers only (excluding primary)
                            } else {
                                // Only 1 or 0 controllers online - fall back to standard session auth
                                // Show informational message if controllers were discovered but unreachable
                                if (verifiedControllers.length > 1) {
                                    const growlerData = new GrowlerModel(
                                        'info',
                                        'HA Not Available',
                                        `Found ${verifiedControllers.length} controllers in HA cluster but was unable to authenticate with all of them. Reverting to standard zt-session authentication.`,
                                    );
                                    this.growlerService.show(growlerData);
                                }
                                return [];
                            }
                        }
                    }
                } catch (clusterError) {
                    // Failed to fetch cluster members
                }

                // Try endpoint 2: /fabric/v1/raft/members (fallback)
                try {
                    const raftUrl = `${primaryUrl}/fabric/v1/raft/members`;

                    const raftResponse: any = await firstValueFrom(
                        this.httpClient.get(raftUrl).pipe(
                            catchError((err) => {
                                throw err;
                            })
                        )
                    );

                    if (raftResponse?.data && Array.isArray(raftResponse.data)) {
                        const raftMembers = raftResponse.data;
                    }
                } catch (raftError: any) {
                    // Failed to fetch raft members
                }
                return [];
            }

            // Get peer controller URLs from version endpoint
            let peerUrls: string[] = [];
            if (hasPeerData && Array.isArray(versionResponse.data.peerControllers)) {
                peerUrls = versionResponse.data.peerControllers
                    .map((peer: any) => peer.url || peer.address)
                    .filter((url: string) => url && url !== primaryUrl);
            }

            if (peerUrls.length === 0) {
                return [];
            }

            // Verify all controllers (including primary) are reachable before enabling HA
            const allUrls = [primaryUrl, ...peerUrls];
            const verificationPromises = allUrls.map(async (url, index) => {
                try {
                    const testUrl = `${url}/edge/management/v1/version`;
                    const response = await firstValueFrom(
                        this.httpClient.get(testUrl, {
                            headers: { 'Authorization': `Bearer ${jwtToken}` }
                        }).pipe(
                            catchError(() => {
                                return of(null); // Mark as failed
                            })
                        )
                    );

                    // If catchError returned null, throw to mark as failed
                    if (response === null) {
                        throw new Error('Controller verification failed');
                    }

                    return {
                        url: url,
                        name: index === 0 ? 'Primary Controller' : `Peer Controller ${index}`,
                        isOnline: true,
                        lastHealthCheck: new Date(),
                        lastResponseTime: null,
                        sessionToken: null,
                        verified: true
                    };
                } catch (err) {
                    return {
                        url: url,
                        name: index === 0 ? 'Primary Controller' : `Peer Controller ${index}`,
                        isOnline: false,
                        lastHealthCheck: new Date(),
                        lastResponseTime: null,
                        sessionToken: null,
                        verified: false
                    };
                }
            });

            const verifiedControllers = await Promise.all(verificationPromises);
            const onlineControllers = verifiedControllers.filter((c: any) => c.verified);
            const allOnline = verifiedControllers.every((c: any) => c.verified);

            // Only enable HA if there are 2+ online controllers
            if (onlineControllers.length >= 2) {
                // Add only online controllers to settings
                onlineControllers.forEach((controller: any) => {
                    this.settingsService.addHAController(controller.url, controller.name);
                });

                // Initialize HA cluster in service
                this.haControllerService.initializeCluster(onlineControllers);

                // Show warning if some controllers failed
                if (!allOnline) {
                    const failedCount = verifiedControllers.length - onlineControllers.length;
                    const growlerData = new GrowlerModel(
                        'warning',
                        'Partial HA Cluster',
                        `Connected to ${onlineControllers.length} of ${verifiedControllers.length} controllers. ${failedCount} controller(s) unreachable (possibly cert issues).`,
                    );
                    this.growlerService.show(growlerData);
                }

                return onlineControllers.slice(1); // Return peers only (excluding primary)
            } else {
                // Only 1 or 0 controllers online - fall back to standard session auth
                // Show informational message if controllers were discovered but unreachable
                if (verifiedControllers.length > 1) {
                    const growlerData = new GrowlerModel(
                        'info',
                        'HA Not Available',
                        `Found ${verifiedControllers.length} controllers in HA cluster but was unable to authenticate with all of them. Reverting to standard zt-session authentication.`,
                    );
                    this.growlerService.show(growlerData);
                }
                return [];
            }
        } catch (err) {
            return [];
        }
    }


    logout() {
        localStorage.removeItem('ziti.settings');
        this.settingsService.settings.session.id = undefined;
        this.settingsService.set(this.settingsService.settings);
        this.haControllerService.reset(); // Clear HA cluster status
        this.router.navigate(['/login']);
    }

    clearSession(): Promise<any>  {
        const serverUrl = this.settingsService.settings.protocol + '://' + this.settingsService.settings.host + ':' + this.settingsService.settings.port;
        const apiUrl = serverUrl + '/login?logout=true';
        const options = this.getHttpOptions();
        return this.httpClient.get(apiUrl, options).toPromise().then((resp: any) => {
            if(isEmpty(resp?.error)) {
                this.haControllerService.reset(); // Clear HA cluster status
                defer(() => {
                    window.location.href = window.location.origin + '/login';
                });
            } else {
                this.growlerService.show(
                    new GrowlerModel(
                        'error',
                        'Error',
                        'Logout Error',
                        resp?.error,
                    )
                );
            }
        }).catch((resp) => {
            return false;
        });
    }
}
