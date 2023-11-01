import {Injectable, Inject} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {LoginServiceClass, SettingsServiceClass, GrowlerService, GrowlerModel, SETTINGS_SERVICE} from "open-ziti-console-lib";
import {Router} from "@angular/router";
import {Observable, switchMap, catchError, lastValueFrom, of} from "rxjs";
import {NodeSettingsService} from "../services/node-settings.service";
import {isEmpty, defer} from "lodash";

@Injectable({
    providedIn: 'root'
})
export class NodeLoginService extends LoginServiceClass {
    private domain = '';
    private hasNodeSession = false;
    constructor(
        override httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) override settingsService: NodeSettingsService,
        override router: Router,
        override growlerService: GrowlerService
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    init() {
        return this.checkForValidNodeSession();
    }

    async login(prefix: string, url: string, username: string, password: string) {
        this.nodeLogin(url, username, password);
    }

    nodeLogin(controllerURL: string, username: string, password: string) {
        return lastValueFrom(this.observeLogin(controllerURL, username, password)
            ).then(() => {
                this.router.navigate(['/']);
            });
    }

    observeLogin(controllerURL: string, username: string, password: string): Observable<any> {
        const loginURL = '/api/login';
        return this.httpClient.post(
            loginURL,
            { url: controllerURL, username: username, password: password },
            {
                headers: {
                    "content-type": "application/json"
                }
            }
        ).pipe(
            switchMap((body: any) => {
                return this.handleLoginResponse.bind(this)(body);
            }),
            catchError((err: any) => {
                const error = "Server Not Accessible";
                if (err.code != "ECONNREFUSED") throw({error: err.code});
                throw({error: error});
            })
        );
    }

    hasSession(): boolean {
        return this.hasNodeSession;
    }

    logout() {
        localStorage.removeItem('ziti.settings');
        this.clearSession();
    }

    private async handleLoginResponse(body: any): Promise<any> {
        if (body.success) {
            await this.checkForValidNodeSession();
            this.settingsService.set(this.settingsService.settings);
            this.router.navigate(['/dashboard']);
        } else {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Login Failed`,
                `Unable to login to selected edge controller`,
            );
            this.growlerService.show(growlerData);
        }
        return of([body.success]);
    }

    checkForValidNodeSession(): Promise<boolean> {
        const options = {
            headers: {
                accept: 'application/json',
            },
            params: {},
            responseType: 'json' as const,
        };
        const apiUrl = '/api/data';
        const body = {
            type: 'identities',
            paging: {
                page: 1,
                total: 1,
                sort: "name",
                order: "ASC",
                filter: "",
                noSearch: false
            }
        };
        return this.httpClient.post(apiUrl, body, options).toPromise().then((resp: any) => {
            //just checking for a non-error response to see if there is a valid session with the node server
            this.hasNodeSession = isEmpty(resp?.error);
            return this.hasNodeSession;
        }).catch((resp) => {
            this.hasNodeSession = false;
            return false;
        });
    }

    clearSession(): Promise<any>  {
        const serverUrl = this.settingsService.settings.protocol + '://' + this.settingsService.settings.host + ':' +this.settingsService.settings.port;
        const apiUrl = serverUrl + '/api/logout?logout=true&t=' + new Date().getTime();
        const options = this.getHttpOptions();
        return this.httpClient.post(apiUrl, {}, options).toPromise().then((resp: any) => {
            if(isEmpty(resp?.error)) {
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