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

import {ControllerLoginService} from './controller-login.service';

// Covers the openziti/ziti-console#915 fix: logout() must clear the whole session object,
// not just .id - otherwise authMode:'oidc' and the (expired) refreshToken survive, keeping
// hasOidcSession() true so an expired session keeps triggering the "session expired" logout
// on every load, including the /callback route where it preempts a brand-new login.
describe('ControllerLoginService.logout()', () => {
    let service: ControllerLoginService;
    let settings: any;
    let oidc: any;
    let sessionRefresh: any;
    let ha: any;
    let router: any;
    let growler: any;

    beforeEach(() => {
        settings = {
            settings: {
                session: {
                    id: 'access-token',
                    authMode: 'oidc',
                    refreshToken: 'refresh-token',
                    oidcClientId: 'openziti',
                    controllerDomain: 'https://ctrl.example.com:1280'
                }
            },
            set: jasmine.createSpy('set'),
            edgeOidcPath: '/oidc'
        };
        oidc = jasmine.createSpyObj('ZitiOidcService', ['revokeToken']);
        sessionRefresh = jasmine.createSpyObj('SessionRefreshService', ['stop']);
        ha = jasmine.createSpyObj('HAControllerService', ['reset']);
        router = jasmine.createSpyObj('Router', ['navigate']);
        growler = jasmine.createSpyObj('GrowlerService', ['show']);

        service = new ControllerLoginService({} as any, settings, router, growler, ha, oidc, sessionRefresh);
        spyOn<any>(service, 'cancelMfaAuth').and.stub();
    });

    it('clears the entire session object, not just .id', () => {
        spyOn(localStorage, 'removeItem');

        service.logout();

        expect(settings.settings.session).toEqual({});
        expect(settings.settings.session.authMode).toBeUndefined();
        expect(settings.settings.session.refreshToken).toBeUndefined();
        expect(localStorage.removeItem).toHaveBeenCalledWith('ziti.settings');
        expect(sessionRefresh.stop).toHaveBeenCalled();
        expect(ha.reset).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('revokes the refresh token when logging out of an OIDC session', () => {
        service.logout();
        expect(oidc.revokeToken).toHaveBeenCalled();
    });

    it('does not attempt revocation for a non-OIDC session but still clears it', () => {
        settings.settings.session = {authMode: 'legacy', id: 'x'};

        service.logout();

        expect(oidc.revokeToken).not.toHaveBeenCalled();
        expect(settings.settings.session).toEqual({});
    });
});
