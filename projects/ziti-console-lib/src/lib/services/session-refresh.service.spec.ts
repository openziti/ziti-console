import {TestBed} from '@angular/core/testing';
import {SessionRefreshService} from './session-refresh.service';
import {ZitiOidcService, OidcSessionUnrecoverableError} from './ziti-oidc.service';
import {SETTINGS_SERVICE} from './settings.service';
import {ZAC_LOGIN_SERVICE} from './login-service.class';
import {GrowlerService} from '../features/messaging/growler.service';

function makeJwt(payload: any): string {
    return `${btoa(JSON.stringify({alg: 'RS256'}))}.${btoa(JSON.stringify(payload))}.fakesig`;
}

describe('SessionRefreshService', () => {
    let service: SessionRefreshService;
    let oidcService: jasmine.SpyObj<ZitiOidcService>;
    let loginService: jasmine.SpyObj<any>;
    let growlerService: jasmine.SpyObj<GrowlerService>;
    let settingsService: any;

    function oidcSession(overrides: any = {}) {
        const nowSec = Math.floor(Date.now() / 1000);
        const accessToken = makeJwt({exp: nowSec + 1800, iat: nowSec});
        const refreshToken = makeJwt({exp: nowSec + 86400});
        return {
            settings: {
                session: {
                    id: accessToken,
                    authMode: 'oidc',
                    controllerDomain: 'https://ctrl.example.com:1280',
                    refreshToken,
                    refreshExpiresAt: (nowSec + 86400) * 1000,
                    oidcClientId: 'openziti',
                    ...overrides
                },
                jwtToken: accessToken
            }
        };
    }

    beforeEach(() => {
        oidcService = jasmine.createSpyObj('ZitiOidcService', ['refreshTokens']);
        loginService = jasmine.createSpyObj('LoginService', ['logout']);
        growlerService = jasmine.createSpyObj('GrowlerService', ['show']);
        settingsService = {
            ...oidcSession(),
            edgeOidcPath: '/oidc',
            get: jasmine.createSpy('get'),
            set: jasmine.createSpy('set').and.callFake((s: any) => settingsService.settings = s),
            getJwtToken: () => settingsService.settings.jwtToken,
            setJwtToken: (t: string) => settingsService.settings.jwtToken = t
        };

        TestBed.configureTestingModule({
            providers: [
                SessionRefreshService,
                {provide: SETTINGS_SERVICE, useValue: settingsService},
                {provide: ZitiOidcService, useValue: oidcService},
                {provide: GrowlerService, useValue: growlerService},
                {provide: ZAC_LOGIN_SERVICE, useValue: loginService}
            ]
        });
        service = TestBed.inject(SessionRefreshService);
    });

    afterEach(() => {
        service.stop();
    });

    it('refreshNow persists rotated tokens and returns true', async () => {
        const nowSec = Math.floor(Date.now() / 1000);
        const newAccess = makeJwt({exp: nowSec + 3600, iat: nowSec});
        const newRefresh = makeJwt({exp: nowSec + 86400});
        oidcService.refreshTokens.and.resolveTo({
            accessToken: newAccess,
            refreshToken: newRefresh,
            expiresAt: (nowSec + 3600) * 1000,
            refreshExpiresAt: (nowSec + 86400) * 1000,
            clientId: 'openziti'
        });

        await expectAsync(service.refreshNow()).toBeResolvedTo(true);
        expect(settingsService.settings.session.id).toEqual(newAccess);
        expect(settingsService.settings.session.refreshToken).toEqual(newRefresh);
        expect(settingsService.settings.jwtToken).toEqual(newAccess);
        expect(loginService.logout).not.toHaveBeenCalled();
    });

    it('refreshNow logs out and redirects when the session is unrecoverable', async () => {
        oidcService.refreshTokens.and.rejectWith(new OidcSessionUnrecoverableError('rejected', 'invalid_grant'));

        await expectAsync(service.refreshNow()).toBeResolvedTo(false);
        expect(growlerService.show).toHaveBeenCalled();
        expect(loginService.logout).toHaveBeenCalled();
    });

    it('refreshNow keeps the session on transient failures', async () => {
        oidcService.refreshTokens.and.rejectWith(new Error('network down'));

        await expectAsync(service.refreshNow()).toBeResolvedTo(false);
        expect(loginService.logout).not.toHaveBeenCalled();
        expect(settingsService.settings.session.refreshToken).toBeDefined();
    });

    it('refreshNow adopts tokens already rotated by another tab instead of logging out', async () => {
        const nowSec = Math.floor(Date.now() / 1000);
        const rotatedAccess = makeJwt({exp: nowSec + 3600, iat: nowSec, jti: 'rotated-access'});
        const rotatedRefresh = makeJwt({exp: nowSec + 86400, jti: 'rotated-refresh'});
        oidcService.refreshTokens.and.rejectWith(new OidcSessionUnrecoverableError('rejected', 'invalid_grant'));
        settingsService.get.and.callFake(() => {
            settingsService.settings.session.refreshToken = rotatedRefresh;
            settingsService.settings.jwtToken = rotatedAccess;
        });

        await expectAsync(service.refreshNow()).toBeResolvedTo(true);
        expect(loginService.logout).not.toHaveBeenCalled();
    });

    it('refreshNow is a no-op for legacy sessions', async () => {
        settingsService.settings.session.authMode = 'legacy';
        await expectAsync(service.refreshNow()).toBeResolvedTo(false);
        expect(oidcService.refreshTokens).not.toHaveBeenCalled();
    });

    it('start() immediately ends sessions whose refresh token has already expired', () => {
        const nowSec = Math.floor(Date.now() / 1000);
        settingsService.settings.session.refreshExpiresAt = (nowSec - 60) * 1000;

        service.start();
        expect(growlerService.show).toHaveBeenCalled();
        expect(loginService.logout).toHaveBeenCalled();
    });

    it('start() schedules a proactive refresh before the access token expires', () => {
        jasmine.clock().install();
        try {
            jasmine.clock().mockDate(new Date());
            const nowSec = Math.floor(Date.now() / 1000);
            // 1000s lifetime -> refresh scheduled at 75% (250s lead)
            settingsService.settings.jwtToken = makeJwt({exp: nowSec + 1000, iat: nowSec});
            settingsService.settings.session.id = settingsService.settings.jwtToken;
            oidcService.refreshTokens.and.resolveTo({
                accessToken: settingsService.settings.jwtToken,
                refreshToken: settingsService.settings.session.refreshToken,
                expiresAt: (nowSec + 1000) * 1000,
                refreshExpiresAt: (nowSec + 86400) * 1000,
                clientId: 'openziti'
            });

            service.start();
            expect(oidcService.refreshTokens).not.toHaveBeenCalled();
            jasmine.clock().tick(700 * 1000);
            expect(oidcService.refreshTokens).not.toHaveBeenCalled();
            jasmine.clock().tick(100 * 1000);
            expect(oidcService.refreshTokens).toHaveBeenCalled();
        } finally {
            jasmine.clock().uninstall();
        }
    });
});
