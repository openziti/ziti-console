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

import {of, throwError} from 'rxjs';
import {ProxySessionLoginService} from './proxy-session-login.service';
import {proxyUrl} from '../auth-mode';

describe('ProxySessionLoginService', () => {
    let service: ProxySessionLoginService;
    let http: any;
    let settings: any;
    let router: any;
    let growler: any;
    let oauth: any;

    beforeEach(() => {
        http = jasmine.createSpyObj('HttpClient', ['post']);
        settings = {
            settings: {},
            hasProxySession: false,
            mfaPending: false,
            refreshSessionStatus: jasmine.createSpy('refreshSessionStatus').and.returnValue(Promise.resolve(true)),
            set: jasmine.createSpy('set'),
        };
        router = jasmine.createSpyObj('Router', ['navigate']);
        growler = jasmine.createSpyObj('GrowlerService', ['show']);
        oauth = jasmine.createSpyObj('OAuthService', ['logOut']);
        service = new ProxySessionLoginService(http, settings, router, growler, oauth);
        spyOn<any>(service, 'reloadToLogin').and.stub();
    });

    it('posts the controller id from the /c/<id> url and navigates on success', async () => {
        http.post.and.returnValue(of({success: true}));

        await service.login('', proxyUrl('c/ctrl-1'), 'admin', 'pw');

        const [url, body] = http.post.calls.mostRecent().args;
        expect(url).toEqual(proxyUrl('zac-session/login'));
        expect(body.controllerId).toEqual('ctrl-1');
        expect(body.test).toBeUndefined();
        expect(settings.refreshSessionStatus).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('test mode sends test:true and leaves the session and route alone (#9)', async () => {
        http.post.and.returnValue(of({success: true, test: true}));

        await service.login('', proxyUrl('c/ctrl-1'), undefined, undefined, false, 'ext-jwt', 'idp', true);

        expect(http.post.calls.mostRecent().args[1].test).toBeTrue();
        expect(settings.refreshSessionStatus).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('drops the browser copy of the IdP tokens after an ext-jwt login (#6)', async () => {
        http.post.and.returnValue(of({success: true}));

        await service.login('', proxyUrl('c/ctrl-1'), undefined, undefined, true, 'ext-jwt', 'idp');

        expect(oauth.logOut).toHaveBeenCalledWith(true);
    });

    it('pauses on MFA when the proxy reports outstanding auth queries (#14)', async () => {
        http.post.and.returnValue(of({success: false, mfaRequired: true, authQueries: [{typeId: 'MFA'}]}));

        await expectAsync(service.login('', proxyUrl('c/ctrl-1'), 'admin', 'pw')).toBeRejectedWith({totpRequired: true});

        expect(service.pendingMfa).toBeTrue();
        expect(service.mfaAuthQueries).toEqual([{typeId: 'MFA'}]);
        expect(growler.show).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('refuses an identity that is not enrolled in TOTP and drops the pending session', async () => {
        http.post.and.returnValues(
            of({success: false, mfaRequired: true, authQueries: [{typeId: 'MFA', isTotpEnrolled: false}]}),
            of({success: true})
        );

        await expectAsync(service.login('', proxyUrl('c/ctrl-1'), 'admin', 'pw')).toBeRejected();

        expect(service.pendingMfa).toBeFalse();
        expect(http.post.calls.mostRecent().args[0]).toEqual(proxyUrl('zac-session/logout'));
        expect(growler.show).toHaveBeenCalledTimes(1);
    });

    it('completes MFA through /zac-session/mfa', async () => {
        service.pendingMfa = true;
        http.post.and.returnValue(of({success: true}));

        await service.completeMfaAuth('123456');

        const [url, body] = http.post.calls.mostRecent().args;
        expect(url).toEqual(proxyUrl('zac-session/mfa'));
        expect(body).toEqual({code: '123456'});
        expect(service.pendingMfa).toBeFalse();
        expect(settings.refreshSessionStatus).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('maps a rejected MFA code to invalidCode', async () => {
        service.pendingMfa = true;
        http.post.and.returnValue(throwError(() => ({status: 401, error: {invalidCode: true}})));

        await expectAsync(service.completeMfaAuth('000000')).toBeRejectedWith({invalidCode: true});
        expect(service.pendingMfa).toBeTrue();
    });

    it('cancelling MFA ends the half-authenticated session on the proxy', () => {
        service.pendingMfa = true;
        http.post.and.returnValue(of({success: true}));

        service.cancelMfaAuth();

        expect(http.post.calls.mostRecent().args[0]).toEqual(proxyUrl('zac-session/logout'));
        expect(service.pendingMfa).toBeFalse();
    });

    it('resumes the TOTP prompt when the proxy still holds an MFA-pending session', async () => {
        settings.refreshSessionStatus.and.callFake(() => { settings.mfaPending = true; return Promise.resolve(false); });

        await service.init();

        expect(service.pendingMfa).toBeTrue();
    });

    it('logout clears local state and IdP tokens, and warns when the proxy call fails', () => {
        http.post.and.returnValue(throwError(() => ({status: 502})));
        settings.hasProxySession = true;

        service.logout();

        expect(growler.show).toHaveBeenCalled();
        expect(settings.hasProxySession).toBeFalse();
        expect(oauth.logOut).toHaveBeenCalledWith(true);
        expect((service as any).reloadToLogin).toHaveBeenCalled();
    });
});
