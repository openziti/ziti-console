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

import {of, Subject} from 'rxjs';
import {PROXY_SESSION_ID, ProxySessionSettingsService} from './proxy-session-settings.service';
import {proxyUrl} from '../auth-mode';

describe('ProxySessionSettingsService', () => {
    let service: ProxySessionSettingsService;
    let http: any;
    let saved: string | null;

    const controllers = {controllers: [
        {id: 'a', name: 'A', url: '/c/a', default: true},
        {id: 'b', name: 'B', url: '/c/b', default: false},
    ]};

    beforeEach(() => {
        saved = localStorage.getItem('ziti.settings');
        service = new ProxySessionSettingsService({} as any, jasmine.createSpyObj('GrowlerService', ['show']));
        http = jasmine.createSpyObj('HttpClient', ['get']);
        (service as any).httpClient = http;
        spyOn(service, 'initApiVersions').and.returnValue(Promise.resolve() as any);
    });

    afterEach(() => {
        if (saved == null) localStorage.removeItem('ziti.settings');
        else localStorage.setItem('ziti.settings', saved);
    });

    function respond(status: any) {
        http.get.and.callFake((url: string) => of(url.endsWith('controllers') ? controllers : status));
    }

    it('drops a stale direct-mode session from localStorage at init (gap 12)', async () => {
        localStorage.setItem('ziti.settings', JSON.stringify({
            session: {id: 'old-token', authMode: 'oidc', refreshToken: 'rt'},
            controllerSessions: {'https://x': 'tok'},
        }));
        respond({authenticated: false});

        await service.init();

        expect(service.hasSession()).toBeFalse();
        expect(service.settings.session).toBeUndefined();
        expect(service.settings.controllerSessions).toEqual({});
        expect(localStorage.getItem('ziti.settings')).not.toContain('old-token');
    });

    it('marks settings.session while the proxy holds a session, never a token (#10)', async () => {
        localStorage.removeItem('ziti.settings');
        respond({authenticated: true, controller: 'a'});

        await service.init();

        expect(service.hasSession()).toBeTrue();
        expect(service.settings.session.id).toEqual(PROXY_SESSION_ID);
    });

    it('selects the controller the session is pinned to (#16)', async () => {
        localStorage.removeItem('ziti.settings');
        respond({authenticated: true, controller: 'b'});

        await service.init();

        expect(service.settings.selectedEdgeController).toEqual(proxyUrl('c/b'));
    });

    it('lists controllers as base-relative /c/<id> urls and defaults the selection', async () => {
        localStorage.removeItem('ziti.settings');
        respond({authenticated: false});

        await service.init();

        expect(service.settings.edgeControllers.map((c: any) => c.url)).toEqual([proxyUrl('c/a'), proxyUrl('c/b')]);
        expect(service.settings.selectedEdgeController).toEqual(proxyUrl('c/a'));
    });

    it('clears the marker when the session ends', async () => {
        localStorage.removeItem('ziti.settings');
        respond({authenticated: true, controller: 'a'});
        await service.init();
        respond({authenticated: false});

        await service.refreshSessionStatus();

        expect(service.hasSession()).toBeFalse();
        expect(service.settings.session).toBeUndefined();
    });

    it('reports mfaPending', async () => {
        respond({authenticated: false, mfaPending: true});
        service.get();

        await service.refreshSessionStatus();

        expect(service.mfaPending).toBeTrue();
    });

    it('shares one status request between concurrent callers', async () => {
        const status = new Subject<any>();
        http.get.and.returnValue(status);
        service.get();

        const a = service.refreshSessionStatus();
        const b = service.refreshSessionStatus();
        status.next({authenticated: true});
        status.complete();

        expect(await a).toBeTrue();
        expect(await b).toBeTrue();
        expect(http.get).toHaveBeenCalledTimes(1);
    });
});
