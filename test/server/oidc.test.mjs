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

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTmp, cookieJar, request, startFakeController, startZac } from './helpers.mjs';

const MGMT = '/edge/management/v1';

describe('controller-native OIDC (ext-jwt)', function() {
    let ctrl, zac;
    before(async function() {
        // A 30s access token is inside the 60s refresh window, so the first API call refreshes.
        ctrl = await startFakeController({ oidc: true, accessTtlSec: 30, refreshDelayMs: 200 });
        zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url });
    });
    after(async function() { await zac.stop(); await ctrl.close(); cleanTmp(); });

    async function extJwtLogin(extra) {
        const jar = cookieJar();
        const res = await request(zac.base, 'POST', '/zac-session/login',
            { jar: jar, json: Object.assign({ type: 'ext-jwt', token: 'good-idp-token' }, extra) });
        return { jar: jar, res: res };
    }

    it('exchanges the IdP token server-side and returns no token', async function() {
        const { jar, res } = await extJwtLogin();
        assert.deepEqual(res.body, { success: true });
        assert.ok(jar.get('zac.sid'));
        const tok = ctrl.find(function(q) { return q.path === '/oidc/oauth/token'; })[0];
        assert.match(tok.body, /grant_type=authorization_code/);
        assert.match(tok.body, /code_verifier=/);
    });

    it('rejects a bad IdP token', async function() {
        const { res } = await extJwtLogin({ token: 'bad' });
        assert.equal(res.status, 401);
        assert.match(res.body.error, /OIDC login failed/);
    });

    it('refreshes once for concurrent requests (#15)', async function() {
        const { jar } = await extJwtLogin();
        const before = ctrl.refreshCalls;
        const rs = await Promise.all([1, 2, 3, 4, 5].map(function() {
            return request(zac.base, 'GET', MGMT + '/identities', { jar: jar });
        }));
        assert.equal(ctrl.refreshCalls - before, 1);
        rs.forEach(function(r) { assert.equal(r.status, 200); });
        const up = ctrl.find(function(q) { return q.path === MGMT + '/identities'; }).pop();
        assert.match(up.headers.authorization, /^Bearer /);
        const st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.equal(st.body.authenticated, true);
    });

    it('test mode keeps no session and revokes the grant (#9)', async function() {
        const { res } = await extJwtLogin({ test: true });
        assert.deepEqual(res.body, { success: true, test: true });
        assert.equal(res.headers['set-cookie'], undefined);
        await new Promise(function(r) { setTimeout(r, 100); });
        assert.ok(ctrl.revokedGrants.length > 0);
    });

    it('logout revokes the refresh token', async function() {
        const { jar } = await extJwtLogin();
        const n = ctrl.revokedGrants.length;
        await request(zac.base, 'POST', '/zac-session/logout', { jar: jar, headers: { 'x-zac-csrf': jar.csrf() } });
        await new Promise(function(r) { setTimeout(r, 100); });
        assert.equal(ctrl.revokedGrants.length, n + 1);
    });

    it('ignores an edge-oidc path that points off the controller (G6)', async function() {
        ctrl.oidcPath = '@evil.example/oidc';
        try {
            const { res } = await extJwtLogin();
            assert.deepEqual(res.body, { success: true }, 'falls back to the controller /oidc');
        } finally { delete ctrl.oidcPath; }
    });
});
