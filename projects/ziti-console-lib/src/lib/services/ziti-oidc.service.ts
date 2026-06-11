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

import {Injectable} from '@angular/core';
import {randomUrlSafeString, pkceChallengeS256, jwtExpMs} from './oidc-utils';

export const OIDC_CLIENT_ID = 'openziti';
// back-compat client registered on older controllers; removal planned upstream post-HA-GA
export const OIDC_CLIENT_ID_LEGACY = 'native';

export interface OidcTokenSet {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt: number;
    refreshExpiresAt?: number;
    clientId: string;
}

export interface OidcAuthContext {
    controllerUrl: string;
    oidcBase: string;
    authRequestId: string;
    state: string;
    nonce: string;
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
}

export type OidcLoginStep =
    | { status: 'code'; code: string }
    | { status: 'totpRequired'; authQueries: any[] }
    | { status: 'error'; error: any };

// The OIDC flow could not even be attempted (no /oidc API, unregistered redirect URI,
// insecure context, network failure). Callers fall back to legacy authentication.
export class OidcEnvironmentalError extends Error {
    constructor(message: string, public causedBy?: any) {
        super(message);
        this.name = 'OidcEnvironmentalError';
    }
}

// The controller has explicitly rejected the refresh token - the session cannot be renewed.
export class OidcSessionUnrecoverableError extends Error {
    constructor(message: string, public reason?: string) {
        super(message);
        this.name = 'OidcSessionUnrecoverableError';
    }
}

/**
 * Drives the ziti controller's native OIDC provider (auth code + PKCE) programmatically,
 * the same way the ziti SDKs do, so the console keeps its own login UI.
 *
 * Uses fetch rather than HttpClient: the auth request id and authorization code must be
 * parsed from Response.url after redirect-following (the controller's CORS config does not
 * expose the auth-request-id/totp-required headers cross-origin), and these requests must
 * bypass the app's HTTP interceptors.
 */
@Injectable({
    providedIn: 'root'
})
export class ZitiOidcService {

    private inflightRefresh: Promise<OidcTokenSet> | null = null;

    buildRedirectUri(): string {
        // Always the origin ROOT /auth/callback, ignoring any base href (e.g. /zac/):
        // the controller's default registered redirect URIs are http(s)://localhost:*/auth/callback
        // and the 127.0.0.1 equivalents - port wildcarded but the path is fixed. The redirect
        // target never needs to serve content; the auth code is read from Response.url after
        // fetch follows the redirect chain, so a 404 at this path is fine. This lets a console
        // browsed via a loopback address (ng serve, server-edge, or controller-hosted ZAC at
        // https://localhost:<port>/zac/) work against a stock controller config. Non-loopback
        // hosts need this URI registered in the controller's edge-oidc options.redirectURIs.
        return `${window.location.origin}/auth/callback`;
    }

    async startAuthRequest(controllerUrl: string, options?: { redirectUri?: string, oidcPath?: string }): Promise<OidcAuthContext> {
        const oidcBase = this.normalizeUrl(controllerUrl) + (options?.oidcPath || '/oidc');
        const redirectUri = options?.redirectUri || this.buildRedirectUri();
        const state = randomUrlSafeString();
        const nonce = randomUrlSafeString();
        const codeVerifier = randomUrlSafeString(48);
        const codeChallenge = await pkceChallengeS256(codeVerifier).catch((err) => {
            throw new OidcEnvironmentalError(err.message, err);
        });

        const ctx: OidcAuthContext = {
            controllerUrl: this.normalizeUrl(controllerUrl),
            oidcBase,
            authRequestId: '',
            state,
            nonce,
            codeVerifier,
            redirectUri,
            clientId: OIDC_CLIENT_ID
        };

        let lastError: any;
        for (const clientId of [OIDC_CLIENT_ID, OIDC_CLIENT_ID_LEGACY]) {
            try {
                const authRequestId = await this.authorize(oidcBase, clientId, ctx);
                if (authRequestId) {
                    ctx.authRequestId = authRequestId;
                    ctx.clientId = clientId;
                    return ctx;
                }
            } catch (err) {
                lastError = err;
            }
        }
        throw new OidcEnvironmentalError(
            `Unable to start an OIDC auth request with the controller. Verify the redirect URI "${redirectUri}" is registered in the controller's edge-oidc configuration.`,
            lastError
        );
    }

    private async authorize(oidcBase: string, clientId: string, ctx: OidcAuthContext): Promise<string | null> {
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            scope: 'openid offline_access',
            state: ctx.state,
            nonce: ctx.nonce,
            code_challenge: await pkceChallengeS256(ctx.codeVerifier),
            code_challenge_method: 'S256',
            redirect_uri: ctx.redirectUri
        });
        const resp = await fetch(`${oidcBase}/authorize?${params.toString()}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            redirect: 'follow',
            headers: {accept: 'application/json'}
        });
        // success redirects to the controller's login page: /oidc/login/username?authRequestID=<id>
        const finalUrl = new URL(resp.url);
        const fromUrl = finalUrl.searchParams.get('authRequestID') || finalUrl.searchParams.get('id');
        // header is only readable same-origin (controller CORS exposes no custom headers)
        return fromUrl || resp.headers.get('auth-request-id');
    }

    loginWithPassword(ctx: OidcAuthContext, username: string, password: string): Promise<OidcLoginStep> {
        return this.submitLogin(ctx, `${ctx.oidcBase}/login/username`, {id: ctx.authRequestId, username, password});
    }

    loginWithExtJwt(ctx: OidcAuthContext, extToken: string): Promise<OidcLoginStep> {
        return this.submitLogin(ctx, `${ctx.oidcBase}/login/ext-jwt`, {id: ctx.authRequestId}, {Authorization: `Bearer ${extToken}`});
    }

    loginWithCert(ctx: OidcAuthContext): Promise<OidcLoginStep> {
        return this.submitLogin(ctx, `${ctx.oidcBase}/login/cert`, {id: ctx.authRequestId});
    }

    submitTotp(ctx: OidcAuthContext, code: string): Promise<OidcLoginStep> {
        return this.submitLogin(ctx, `${ctx.oidcBase}/login/totp`, {id: ctx.authRequestId, code});
    }

    private async submitLogin(ctx: OidcAuthContext, url: string, fields: any, extraHeaders: any = {}): Promise<OidcLoginStep> {
        let resp: Response;
        try {
            resp = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                redirect: 'follow',
                headers: {accept: 'application/json', ...extraHeaders},
                body: new URLSearchParams(fields)
            });
        } catch (err: any) {
            return {status: 'error', error: {message: err?.message || 'network error contacting controller'}};
        }

        // On success the controller 302s through /oidc/authorize/callback to the redirect URI
        // with the auth code. Check the final URL before resp.ok - the terminal GET of the
        // redirect URI may legitimately 404 on strict static hosts.
        if (resp.url && resp.url.startsWith(ctx.redirectUri)) {
            const finalUrl = new URL(resp.url);
            const error = finalUrl.searchParams.get('error');
            if (error) {
                return {status: 'error', error: {message: finalUrl.searchParams.get('error_description') || error}};
            }
            const state = finalUrl.searchParams.get('state');
            if (state !== ctx.state) {
                return {status: 'error', error: {message: 'OIDC state mismatch in login redirect'}};
            }
            const code = finalUrl.searchParams.get('code');
            if (!code) {
                return {status: 'error', error: {message: 'no authorization code in login redirect'}};
            }
            return {status: 'code', code};
        }

        let body: any = null;
        try {
            body = await resp.json();
        } catch (e) {
            // non-JSON body, fall through to the generic error below
        }

        // secondary auth pending - detected from the body since the totp-required header
        // is not readable cross-origin
        if (resp.ok && body?.authQueries?.length) {
            return {status: 'totpRequired', authQueries: body.authQueries};
        }

        if (resp.status === 400 && url.endsWith('/login/totp')) {
            return {status: 'error', error: {invalidCode: true, message: 'invalid TOTP code'}};
        }

        const message = body?.error?.message || body?.error_description || body?.message
            || `login failed with status ${resp.status}`;
        return {status: 'error', error: {...(body?.error || body || {}), message, status: resp.status}};
    }

    async exchangeCode(ctx: OidcAuthContext, code: string): Promise<OidcTokenSet> {
        const resp = await fetch(`${ctx.oidcBase}/oauth/token`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {accept: 'application/json'},
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: ctx.clientId,
                code,
                code_verifier: ctx.codeVerifier,
                redirect_uri: ctx.redirectUri
            })
        });
        const body = await resp.json().catch(() => null);
        if (!resp.ok || !body?.access_token) {
            throw new Error(body?.error_description || body?.error || `token exchange failed with status ${resp.status}`);
        }
        return this.toTokenSet(body, ctx.clientId);
    }

    refreshTokens(controllerUrl: string, refreshToken: string, clientId = OIDC_CLIENT_ID, oidcPath = '/oidc'): Promise<OidcTokenSet> {
        if (this.inflightRefresh) {
            return this.inflightRefresh;
        }
        this.inflightRefresh = this.doRefresh(controllerUrl, refreshToken, clientId, oidcPath)
            .finally(() => {
                this.inflightRefresh = null;
            });
        return this.inflightRefresh;
    }

    private async doRefresh(controllerUrl: string, refreshToken: string, clientId: string, oidcPath: string): Promise<OidcTokenSet> {
        // If a controller version rejects this grant for the registered native clients, switch
        // to the token-exchange grant the go SDK uses: grant_type=urn:ietf:params:oauth:grant-type:token-exchange
        // with subject_token=<refreshToken>, subject_token_type=urn:ietf:params:oauth:token-type:refresh_token,
        // requested_token_type=urn:ietf:params:oauth:token-type:refresh_token
        const resp = await fetch(`${this.normalizeUrl(controllerUrl)}${oidcPath}/oauth/token`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {accept: 'application/json'},
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: refreshToken
            })
        });
        const body = await resp.json().catch(() => null);
        if (resp.ok && body?.access_token) {
            const tokens = this.toTokenSet(body, clientId);
            if (!tokens.refreshToken) {
                // controller did not rotate the refresh token; keep using the current one
                tokens.refreshToken = refreshToken;
                tokens.refreshExpiresAt = jwtExpMs(refreshToken);
            }
            return tokens;
        }
        if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
            throw new OidcSessionUnrecoverableError(
                body?.error_description || 'session refresh token was rejected by the controller',
                body?.error || `http ${resp.status}`
            );
        }
        throw new Error(body?.error_description || body?.error || `token refresh failed with status ${resp.status}`);
    }

    async revokeToken(controllerUrl: string, token: string, hint: 'refresh_token' | 'access_token', clientId = OIDC_CLIENT_ID, oidcPath = '/oidc'): Promise<void> {
        try {
            await fetch(`${this.normalizeUrl(controllerUrl)}${oidcPath}/oauth/revoke`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: {accept: 'application/json'},
                body: new URLSearchParams({token, token_type_hint: hint, client_id: clientId})
            });
        } catch (e) {
            // best-effort - locally dropping the tokens is sufficient for logout
        }
    }

    private toTokenSet(body: any, clientId: string): OidcTokenSet {
        const expFromJwt = jwtExpMs(body.access_token);
        return {
            accessToken: body.access_token,
            refreshToken: body.refresh_token || undefined,
            idToken: body.id_token || undefined,
            expiresAt: expFromJwt || (Date.now() + (body.expires_in || 1800) * 1000),
            refreshExpiresAt: body.refresh_token ? jwtExpMs(body.refresh_token) : undefined,
            clientId
        };
    }

    private normalizeUrl(url: string): string {
        return url?.replace(/\/+$/, '');
    }
}
