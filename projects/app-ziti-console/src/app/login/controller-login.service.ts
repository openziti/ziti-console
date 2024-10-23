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
import {HttpClient} from "@angular/common/http";
import {LoginServiceClass, SettingsServiceClass, GrowlerService, GrowlerModel, SETTINGS_SERVICE} from "ziti-console-lib";
import {lastValueFrom, Observable, of, switchMap} from "rxjs";
import {catchError} from "rxjs/operators";
import {Router} from "@angular/router";
import {defer, isEmpty, isNil} from "lodash";

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
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    async init() {
        return Promise.resolve();
    }

    async login(prefix: string, url: string, username: string, password: string) {
        this.controllerLogin(prefix, url, username, password);
    }

    checkOriginForController(): Promise<any> {
        const controllerUrl = window.location.origin;
        return this.settingsService.initApiVersions(controllerUrl).then((result) => {
            if (isNil(result) || isEmpty(result)) {
                return false;
            } else {
                return true;
            }
        }).catch((result) => {
            return false;
        });
    }

    controllerLogin(prefix: string, url: string, username: string, password: string) {
        this.domain = url;
        const serviceUrl = url + prefix;
        return lastValueFrom(this.observeLogin(serviceUrl, username, password)
        ).then(() => {
            this.router.navigate(['/']);
        });
    }

    observeLogin(serviceUrl: string, username?: string, password?: string): Observable<any> {
        return new Observable(observer => {
            let checkForInputsInterval: number | null = null;
            let timeoutId: number | null = null;

            const setupInputListeners = (usernameInput: HTMLInputElement, passwordInput: HTMLInputElement) => {
                console.log('Login inputs found');

                // Detect autofill using MutationObserver
                const detectAutofill = () => {
                    const observer = new MutationObserver(() => {
                        const isUsernameFilled = usernameInput.value.length > 0;
                        const isPasswordFilled = passwordInput.value.length > 0;
                        if (isUsernameFilled && isPasswordFilled) {
                            console.log('Autofill detected via MutationObserver');
                            observer.disconnect();
                            triggerLogin(usernameInput, passwordInput);
                        }
                    });

                    observer.observe(usernameInput, { attributes: true, childList: true, characterData: true });
                    observer.observe(passwordInput, { attributes: true, childList: true, characterData: true });

                    // Fallback: Periodically check for filled inputs
                    const checkInterval = setInterval(() => {
                        const isUsernameFilled = usernameInput.value.length > 0;
                        const isPasswordFilled = passwordInput.value.length > 0;
                        if (isUsernameFilled && isPasswordFilled) {
                            console.log('Autofill detected via interval check');
                            clearInterval(checkInterval);
                            observer.disconnect();
                            triggerLogin(usernameInput, passwordInput);
                        }
                    }, 500); // Check every 500ms
                };

                const triggerLogin = (usernameInput: HTMLInputElement, passwordInput: HTMLInputElement) => {
                    const detectedUsername = usernameInput.value || username || '';
                    const detectedPassword = passwordInput.value || password || '';

                    console.log(`Login attempted - Username: "${detectedUsername}", Password: ${detectedPassword ? '[REDACTED]' : 'empty'}`);

                    const queryParams = detectedUsername && detectedPassword ? '?method=password' : '?method=cert';
                    const requestBody = detectedUsername && detectedPassword ? { username: detectedUsername, password: detectedPassword } : undefined;
                    const endpoint = serviceUrl + '/authenticate';

                    console.log(`Authentication method: ${queryParams.includes('password') ? 'password' : 'cert'}`);

                    this.httpClient.post(endpoint + queryParams, requestBody, {
                        headers: {
                            "content-type": "application/json",
                        }
                    }).pipe(
                        switchMap((body: any) => {
                            return this.handleLoginResponse.bind(this)(body, detectedUsername, detectedPassword);
                        }),
                        catchError((err: any) => {
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
                                this.router.navigate(['/login']);
                            }
                            if (this.settingsService?.settings?.session) {
                                this.settingsService.settings.session.id = undefined;
                            }
                            this.settingsService.set(this.settingsService.settings)
                            this.growlerService.show(growlerData);
                            throw({error: errorMessage});
                        })
                    ).subscribe(
                        result => observer.next(result),
                        error => observer.error(error),
                        () => observer.complete()
                    );
                };

                detectAutofill();
            };

            const checkForInputs = () => {
                console.log('Checking for login inputs...');
                const usernameInput = document.querySelector('input[type="text"], input[type="email"], input[name="username"]') as HTMLInputElement;
                const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                
                if (usernameInput && passwordInput) {
                    console.log('Login inputs found:', usernameInput, passwordInput);
                    if (checkForInputsInterval !== null) {
                        clearInterval(checkForInputsInterval);
                    }
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                    }
                    setupInputListeners(usernameInput, passwordInput);
                } else {
                    console.log('Login inputs not found yet');
                }
            };

            checkForInputsInterval = window.setInterval(checkForInputs, 100); // Check every 100ms

            // Timeout after 10 seconds
            timeoutId = window.setTimeout(() => {
                if (checkForInputsInterval !== null) {
                    clearInterval(checkForInputsInterval);
                }
                console.error('Login inputs not found after 10 seconds. DOM structure:', document.body.innerHTML);
                observer.error(new Error('Login inputs not found after 10 seconds'));
            }, 10000);

            return () => {
                if (checkForInputsInterval !== null) {
                    clearInterval(checkForInputsInterval);
                }
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }
            };
        });
    }

    private handleLoginResponse(body: any, username: string, password: string): Observable<any> {
        if (body.error) throw body.error;
        const settings = {
            ...this.settingsService.settings, session: {
                id: body.data?.token,
                controllerDomain: this.domain,
                authorization: 100,
                expiresAt: body.data.expiresAt,
                expirationSeconds: body.data.expirationSeconds,
                username,
                password
            }
        }
        this.settingsService.set(settings);
        return of([body.data?.token]);
    }


    logout() {
        localStorage.removeItem('ziti.settings');
        this.settingsService.settings.session.id = undefined;
        this.settingsService.set(this.settingsService.settings);
        this.router.navigate(['/login']);
    }

    clearSession(): Promise<any>  {
        const serverUrl = this.settingsService.settings.protocol + '://' + this.settingsService.settings.host + ':' + this.settingsService.settings.port;
        const apiUrl = serverUrl + '/login?logout=true';
        const options = this.getHttpOptions();
        return this.httpClient.get(apiUrl, options).toPromise().then((resp: any) => {
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
