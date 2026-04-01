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

        // Log the full authentication response to understand structure
        console.log('[AUTH] Full authentication response:', JSON.stringify(body, null, 2));
        console.log('[AUTH] Response data fields:', Object.keys(body.data || {}));

        // Extract token from response
        const token = body.data?.token;
        console.log('[AUTH] Token value:', token);
        console.log('[AUTH] Token type:', token?.includes('.') && token?.split('.').length === 3 ? 'JWT' : 'Session UUID');

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
                console.log('[HA] Successfully connected to', haControllers.length, 'peer controllers');
            })
            .catch((err) => {
                // Show error only if HA controller discovery/authentication fails
                console.error('HA controller discovery failed:', err);
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
            console.log('[HA] Starting discovery for primary URL:', primaryUrl);
            console.log('[HA] JWT token present:', !!jwtToken);

            // Get API versions from primary controller
            const versionUrl = `${primaryUrl}/edge/management/v1/version`;
            const versionResponse: any = await firstValueFrom(
                this.httpClient.get(versionUrl, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                })
            );

            console.log('[HA] Version response:', versionResponse);
            console.log('[HA] Full version data:', JSON.stringify(versionResponse?.data, null, 2));

            // Check if fabric API exists (indicates HA capability)
            const hasPeerData = versionResponse?.data?.peerControllers;
            const fabricApi = versionResponse?.data?.apiVersions?.fabric;

            // Also check for alternative peer data locations
            const buildInfo = versionResponse?.data?.buildInfo;
            const capabilities = versionResponse?.data?.capabilities;

            console.log('[HA] Has peer data:', hasPeerData);
            console.log('[HA] Has fabric API:', fabricApi);
            console.log('[HA] Full version data keys:', Object.keys(versionResponse?.data || {}));
            console.log('[HA] Capabilities:', capabilities);

            // For now, if fabric API exists but no peer data, try to get cluster members
            if (!hasPeerData && fabricApi) {
                console.log('[HA] No peer controllers in version endpoint - trying cluster discovery endpoints');
                console.warn('[HA] Note: Fabric cluster endpoints may not have CORS configured for browser access');
                console.warn('[HA] If this fails with CORS error, configure CORS on controller or use version endpoint peerControllers');

                // Try endpoint 1: /fabric/v1/cluster/list-members (used by ziti CLI)
                // Note: This endpoint returns addresses in format "tls:hostname:port" which we convert to "https://hostname"
                try {
                    const clusterUrl = `${primaryUrl}/fabric/v1/cluster/list-members`;
                    console.log('[HA] Fetching cluster members from:', clusterUrl);
                    console.log('[HA] JWT token for request:', jwtToken?.substring(0, 20) + '...');

                    const clusterResponse: any = await firstValueFrom(
                        this.httpClient.get(clusterUrl).pipe(
                            catchError((err) => {
                                console.warn('[HA] Cluster list-members request failed:', {
                                    status: err.status,
                                    statusText: err.statusText,
                                    message: err.message,
                                    reason: err.status === 401 ? 'JWT token may lack fabric admin permissions' :
                                           err.status === 0 ? 'CORS preflight failed - endpoint may not support browser access' : 'Unknown error'
                                });
                                throw err;
                            })
                        )
                    );

                    console.log('[HA] Cluster members response:', clusterResponse);

                    if (clusterResponse?.data && Array.isArray(clusterResponse.data)) {
                        const clusterMembers = clusterResponse.data;
                        console.log('[HA] Found', clusterMembers.length, 'cluster members');

                        clusterMembers.forEach((member: any) => {
                            console.log(`[HA] Cluster member:`, member);
                        });

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
                                    let hostname = parts[0];

                                    // ========================================
                                    // TEMPORARY: DO NOT COMMIT THIS CODE
                                    // ========================================
                                    // For NetFoundry production environments, append "-p" before ".production.netfoundry.io"
                                    // to use public-facing controllers with valid certs
                                    if (hostname.includes('.production.netfoundry.io') && !hostname.includes('-p.production.netfoundry.io')) {
                                        hostname = hostname.replace('.production.netfoundry.io', '-p.production.netfoundry.io');
                                        console.log(`[HA] [TEMP] Appended -p to hostname for public cert: ${hostname}`);
                                    }
                                    // ========================================
                                    // END TEMPORARY CODE
                                    // ========================================

                                    apiUrl = `https://${hostname}`;
                                }

                                console.log(`[HA] Converting address "${rawAddress}" to "${apiUrl}"`);

                                return {
                                    url: apiUrl,
                                    id: member.id || member.name,
                                    isLeader: member.leader,
                                    isConnected: member.connected !== false
                                };
                            });

                        console.log('[HA] Extracted member URLs:', memberUrls);

                        if (memberUrls.length > 0 && memberUrls[0].url) {
                            // Success! We found accessible URLs
                            console.log('[HA] Successfully discovered', memberUrls.length, 'controllers from cluster endpoint');

                            // Convert to controller format and initialize HA cluster
                            memberUrls.forEach((member: any, index: number) => {
                                const name = index === 0 ? 'Primary Controller' : `Peer Controller ${index}`;
                                this.settingsService.addHAController(member.url, name);
                            });

                            const allControllers = memberUrls.map((member: any, index: number) => ({
                                url: member.url,
                                name: index === 0 ? 'Primary Controller' : `Peer Controller ${index}`,
                                isOnline: member.isConnected !== false,
                                lastHealthCheck: new Date(),
                                lastResponseTime: null,
                                sessionToken: null
                            }));

                            console.log('[HA] Initializing HA cluster with discovered controllers:', allControllers);
                            this.haControllerService.initializeCluster(allControllers);
                            console.log('[HA] HA cluster initialized successfully');

                            return allControllers.slice(1); // Return peers only (excluding primary)
                        }
                    }
                } catch (clusterError) {
                    console.log('[HA] Failed to fetch cluster members:', clusterError);
                }

                // Try endpoint 2: /fabric/v1/raft/members (fallback)
                try {
                    const raftUrl = `${primaryUrl}/fabric/v1/raft/members`;
                    console.log('[HA] Fallback: Fetching raft members from:', raftUrl);

                    const raftResponse: any = await firstValueFrom(
                        this.httpClient.get(raftUrl).pipe(
                            catchError((err) => {
                                console.warn('[HA] Raft members request failed:', {
                                    status: err.status,
                                    statusText: err.statusText,
                                    message: err.message,
                                    reason: err.status === 401 ? 'JWT token may lack fabric admin permissions' :
                                           err.status === 0 ? 'CORS preflight failed - endpoint may not support browser access' : 'Unknown error'
                                });
                                throw err;
                            })
                        )
                    );

                    console.log('[HA] Raft members response:', raftResponse);

                    if (raftResponse?.data && Array.isArray(raftResponse.data)) {
                        const raftMembers = raftResponse.data;
                        console.log('[HA] Found', raftMembers.length, 'raft members');

                        raftMembers.forEach((member: any) => {
                            console.log(`[HA] Raft member:`, member);
                        });
                    }
                } catch (raftError: any) {
                    console.warn('[HA] Failed to fetch raft members:', raftError?.status || raftError?.message || raftError);
                }

                console.log('[HA] Could not auto-discover controllers - manual configuration needed');
                return [];
            }

            // Get peer controller URLs from version endpoint
            let peerUrls: string[] = [];
            if (hasPeerData && Array.isArray(versionResponse.data.peerControllers)) {
                peerUrls = versionResponse.data.peerControllers
                    .map((peer: any) => peer.url || peer.address)
                    .filter((url: string) => url && url !== primaryUrl);
            }

            console.log('[HA] Discovered peer URLs:', peerUrls);

            if (peerUrls.length === 0) {
                console.log('[HA] No peer controllers found in version endpoint');
                return [];
            }

            // Add primary controller to HA cluster
            this.settingsService.addHAController(primaryUrl, 'Primary Controller');

            // Add all peer controllers (no separate authentication needed with JWT)
            const discoveredControllers = peerUrls.map((peerUrl, index) => {
                this.settingsService.addHAController(peerUrl, `Peer Controller ${index + 1}`);

                return {
                    url: peerUrl,
                    name: `Peer Controller ${index + 1}`,
                    isOnline: true,
                    lastHealthCheck: new Date(),
                    lastResponseTime: null,
                    sessionToken: null // Not needed with JWT
                };
            });

            // Build complete list of all controllers
            const allControllers = [
                {
                    url: primaryUrl,
                    name: 'Primary Controller',
                    isOnline: true,
                    lastHealthCheck: new Date(),
                    lastResponseTime: null,
                    sessionToken: null // Not needed with JWT
                },
                ...discoveredControllers
            ];

            console.log('[HA] Initializing HA cluster with controllers:', allControllers);

            // Initialize HA cluster in service
            this.haControllerService.initializeCluster(allControllers);

            console.log('[HA] HA cluster initialized successfully');

            return discoveredControllers;
        } catch (err) {
            console.error('HA controller discovery error:', err);
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
