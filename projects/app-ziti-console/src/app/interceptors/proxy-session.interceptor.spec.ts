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

import {HttpErrorResponse, HttpRequest, HttpResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {ProxySessionInterceptor} from './proxy-session.interceptor';

describe('ProxySessionInterceptor', () => {
    let interceptor: ProxySessionInterceptor;
    let router: any;
    let settings: any;
    let handler: any;
    const CSRF_COOKIES = ['zac.csrf', '__Host-zac.csrf'];

    function setCookie(name: string, value: string) {
        document.cookie = name + '=' + value + '; path=/' + (name.startsWith('__Host-') ? '; secure' : '');
    }

    beforeEach(() => {
        router = jasmine.createSpyObj('Router', ['navigate']);
        settings = {refreshSessionStatus: jasmine.createSpy('refreshSessionStatus').and.returnValue(Promise.resolve(false))};
        handler = jasmine.createSpyObj('HttpHandler', ['handle']);
        handler.handle.and.returnValue(of(new HttpResponse({status: 200})));
        interceptor = new ProxySessionInterceptor(router, settings);
        setCookie('zac.csrf', 'csrf-1');
    });

    afterEach(() => {
        CSRF_COOKIES.forEach((n) => { document.cookie = n + '=; path=/; max-age=0' + (n.startsWith('__Host-') ? '; secure' : ''); });
    });

    function sent(): HttpRequest<any> {
        return handler.handle.calls.mostRecent().args[0];
    }

    it('adds the CSRF header and credentials to same-origin API mutations', () => {
        interceptor.intercept(new HttpRequest('POST', '/c/ctrl/edge/management/v1/services', {}), handler).subscribe();

        expect(sent().headers.get('x-zac-csrf')).toEqual('csrf-1');
        expect(sent().withCredentials).toBeTrue();
    });

    it('never sends the CSRF token to another origin (#5)', () => {
        interceptor.intercept(new HttpRequest('POST', 'https://evil.example/edge/management/v1/x', {}), handler).subscribe();

        expect(sent().headers.has('x-zac-csrf')).toBeFalse();
        expect(sent().withCredentials).toBeFalse();
    });

    it('adds no CSRF header to reads', () => {
        interceptor.intercept(new HttpRequest('GET', '/edge/management/v1/services'), handler).subscribe();

        expect(sent().headers.has('x-zac-csrf')).toBeFalse();
    });

    it('prefers the __Host- CSRF cookie the proxy sets over HTTPS', () => {
        setCookie('__Host-zac.csrf', 'csrf-secure');
        // A browser on plain HTTP refuses __Host- cookies; only assert when this one stored it.
        if (document.cookie.indexOf('__Host-zac.csrf') < 0) {
            pending('browser rejects __Host- cookies on this origin');
            return;
        }
        interceptor.intercept(new HttpRequest('POST', '/zac-session/logout', {}), handler).subscribe();

        expect(sent().headers.get('x-zac-csrf')).toEqual('csrf-secure');
    });

    it('routes to /login on a 401 only when the proxy says the session is gone (#2)', async () => {
        handler.handle.and.returnValue(throwError(() => new HttpErrorResponse({status: 401})));

        interceptor.intercept(new HttpRequest('GET', '/edge/management/v1/identities'), handler).subscribe({error: () => {}});
        await settings.refreshSessionStatus.calls.mostRecent().returnValue;

        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('keeps the user in when a 401 is a permission error', async () => {
        settings.refreshSessionStatus.and.returnValue(Promise.resolve(true));
        handler.handle.and.returnValue(throwError(() => new HttpErrorResponse({status: 401})));

        interceptor.intercept(new HttpRequest('GET', '/edge/management/v1/identities'), handler).subscribe({error: () => {}});
        await settings.refreshSessionStatus.calls.mostRecent().returnValue;

        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ignores 401s from other origins', () => {
        handler.handle.and.returnValue(throwError(() => new HttpErrorResponse({status: 401})));

        interceptor.intercept(new HttpRequest('GET', 'https://idp.example/edge/x'), handler).subscribe({error: () => {}});

        expect(settings.refreshSessionStatus).not.toHaveBeenCalled();
    });
});
