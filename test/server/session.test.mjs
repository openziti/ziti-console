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
import { cleanTmp, cookieJar, login, request, startFakeController, startZac } from './helpers.mjs';

const MGMT = '/edge/management/v1';

describe('session layer and proxy (password login)', function() {
    let ctrl, zac;
    before(async function() {
        ctrl = await startFakeController();
        zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url });
    });
    after(async function() {
        await zac.stop();
        await ctrl.close();
        cleanTmp();
    });

    it('logs in, sets httpOnly sid + readable csrf cookies, and returns no token', async function() {
        const { jar, res } = await login(zac);
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { success: true });
        const sc = res.headers['set-cookie'].join('\n');
        assert.match(sc, /zac\.sid=[^;]+; Path=\/; SameSite=Strict; HttpOnly/);
        assert.match(sc, /zac\.csrf=[^;]+; Path=\/; SameSite=Strict(?!; HttpOnly)/);
        assert.doesNotMatch(sc, /Secure/, 'plain HTTP request: no Secure flag');
        assert.ok(jar.get('zac.sid'));
        assert.doesNotMatch(res.raw, /tok-/);
    });

    it('rejects a bad password with the controller status', async function() {
        const { res } = await login(zac, 'admin', 'bad');
        assert.equal(res.status, 401);
        assert.match(res.body.error, /authentication request failed/);
    });

    it('injects the token upstream and strips the browser cookies (#3)', async function() {
        const { jar } = await login(zac);
        const r = await request(zac.base, 'GET', MGMT + '/identities', { jar: jar, headers: { Cookie: jar.header() + '; other=1' } });
        assert.equal(r.status, 200);
        const up = ctrl.find(function(q) { return q.path === MGMT + '/identities'; }).pop();
        assert.match(up.headers['zt-session'], /^tok-/);
        assert.equal(up.headers.cookie, undefined);
    });

    it('forwards X-Forwarded-For upstream (G8)', async function() {
        const { jar } = await login(zac);
        await request(zac.base, 'GET', MGMT + '/services', { jar: jar });
        const up = ctrl.find(function(q) { return q.path === MGMT + '/services'; }).pop();
        assert.ok(up.headers['x-forwarded-for']);
    });

    it('strips upstream Set-Cookie, CORS, CSP and XFO and marks responses no-store (G1, G3, G7)', async function() {
        const { jar } = await login(zac);
        const r = await request(zac.base, 'GET', MGMT + '/identities', { jar: jar, headers: { Origin: 'https://evil.example' } });
        assert.equal(r.headers['set-cookie'], undefined);
        assert.equal(r.headers['access-control-allow-origin'], undefined);
        assert.equal(r.headers['access-control-allow-credentials'], undefined);
        // ZAC's own helmet values, not the controller's.
        assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN');
        assert.doesNotMatch(r.headers['content-security-policy'], /default-src \*/);
        assert.equal(r.headers['cache-control'], 'no-store');
        assert.match(r.headers['vary'], /Cookie/);
    });

    it('sandboxes non-JSON upstream responses with CSP (G2)', async function() {
        const { jar } = await login(zac);
        const r = await request(zac.base, 'GET', MGMT + '/html', { jar: jar });
        assert.equal(r.status, 500);
        assert.equal(r.headers['content-security-policy'], "default-src 'none'; sandbox");
    });

    it('does not proxy the controller /oidc pages onto this origin (G2)', async function() {
        const before = ctrl.requests.length;
        const r = await request(zac.base, 'GET', '/oidc/login/username?authRequestID=x');
        assert.equal(ctrl.find(function(q) { return q.path.startsWith('/oidc'); }).length, 0);
        assert.notEqual(r.headers['content-type'] || '', 'application/json');
        assert.equal(ctrl.requests.length, before);
    });

    it('requires the CSRF header on proxied mutations', async function() {
        const { jar } = await login(zac);
        const no = await request(zac.base, 'POST', MGMT + '/services', { jar: jar, json: {} });
        assert.equal(no.status, 403);
        const yes = await request(zac.base, 'POST', MGMT + '/services', { jar: jar, json: {}, headers: { 'x-zac-csrf': jar.csrf() } });
        assert.equal(yes.status, 200);
    });

    it('rejects cross-site mutations by Sec-Fetch-Site or Origin, allows non-browser clients (#4, G4)', async function() {
        const cross = await request(zac.base, 'POST', '/zac-session/login',
            { json: { username: 'a', password: 'b' }, headers: { 'Sec-Fetch-Site': 'cross-site' } });
        assert.equal(cross.status, 403);
        const sameSite = await request(zac.base, 'POST', '/zac-session/login',
            { json: { username: 'a', password: 'b' }, headers: { 'Sec-Fetch-Site': 'same-site' } });
        assert.equal(sameSite.status, 403);
        const badOrigin = await request(zac.base, 'POST', '/api/logout', { headers: { Origin: 'https://evil.example' } });
        assert.equal(badOrigin.status, 403);
        const goodOrigin = await request(zac.base, 'POST', '/zac-session/login',
            { json: { username: 'a', password: 'b' }, headers: { Origin: zac.base } });
        assert.equal(goodOrigin.status, 200);
        const sameOrigin = await request(zac.base, 'POST', '/zac-session/login',
            { json: { username: 'a', password: 'b' }, headers: { 'Sec-Fetch-Site': 'same-origin', Origin: 'https://evil.example' } });
        assert.equal(sameOrigin.status, 200);
        const cli = await request(zac.base, 'POST', '/zac-session/login', { json: { username: 'a', password: 'b' } });
        assert.equal(cli.status, 200);
        const get = await request(zac.base, 'GET', '/zac-session/status', { headers: { 'Sec-Fetch-Site': 'cross-site' } });
        assert.equal(get.status, 200);
    });

    it('re-login replaces the old session (#7)', async function() {
        const { jar } = await login(zac);
        const oldSid = jar.get('zac.sid');
        const stale = cookieJar();
        stale.take(['zac.sid=' + oldSid]);
        await request(zac.base, 'POST', '/zac-session/login', { jar: jar, json: { username: 'admin', password: 'pw' } });
        assert.notEqual(jar.get('zac.sid'), oldSid);
        const old = await request(zac.base, 'GET', '/zac-session/status', { jar: stale });
        assert.equal(old.body.authenticated, false);
        const cur = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.equal(cur.body.authenticated, true);
    });

    it('logout needs CSRF, then ends the session and clears both cookies', async function() {
        const { jar } = await login(zac);
        const no = await request(zac.base, 'POST', '/zac-session/logout', { jar: jar });
        assert.equal(no.status, 403);
        const sid = jar.get('zac.sid');
        const ok = await request(zac.base, 'POST', '/zac-session/logout', { jar: jar, headers: { 'x-zac-csrf': jar.csrf() } });
        assert.equal(ok.status, 200);
        const sc = ok.headers['set-cookie'].join('\n');
        assert.match(sc, /zac\.sid=; Path=\/; Max-Age=0/);
        assert.match(sc, /zac\.csrf=; Path=\/; Max-Age=0/);
        const replay = cookieJar();
        replay.take(['zac.sid=' + sid]);
        const st = await request(zac.base, 'GET', '/zac-session/status', { jar: replay });
        assert.equal(st.body.authenticated, false);
    });

    it('reports logged-out after the upstream token expires (#2)', async function() {
        const { jar } = await login(zac);
        const up = await request(zac.base, 'GET', MGMT + '/identities', { jar: jar });
        ctrl.revoked.add(up.body.token);
        const r401 = await request(zac.base, 'GET', MGMT + '/identities', { jar: jar });
        assert.equal(r401.status, 401);
        const st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.equal(st.body.authenticated, false);
    });

    it('keeps the session when a 401 is a permission error, not an expired token (#2)', async function() {
        const { jar } = await login(zac);
        const r = await request(zac.base, 'GET', MGMT + '/current-api-session', { jar: jar });
        assert.equal(r.status, 200);
        // A 401 on one route while the token still probes fine must not log the user out.
        const tok = r.body.data.token;
        ctrl.revoked.add(tok);
        await request(zac.base, 'GET', MGMT + '/identities', { jar: jar });
        ctrl.revoked.delete(tok);
        const st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.equal(st.body.authenticated, true);
    });

    it('test-mode login verifies without replacing the session (#9)', async function() {
        const { jar } = await login(zac);
        const sid = jar.get('zac.sid');
        const t = await request(zac.base, 'POST', '/zac-session/login',
            { jar: jar, json: { type: 'password', username: 'admin', password: 'pw', test: true } });
        assert.deepEqual(t.body, { success: true, test: true });
        assert.equal(t.headers['set-cookie'], undefined);
        assert.equal(jar.get('zac.sid'), sid);
        const st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.equal(st.body.authenticated, true);
        await new Promise(function(r) { setTimeout(r, 100); }); // the upstream logout is fire-and-forget
        assert.ok(ctrl.deletedSessions.length > 0, 'test session is logged out upstream');
    });

    it('holds an MFA-pending session until /zac-session/mfa succeeds (#14)', async function() {
        const { jar, res } = await login(zac, 'mfa', 'pw');
        assert.equal(res.body.success, false);
        assert.equal(res.body.mfaRequired, true);
        assert.equal(res.body.authQueries[0].typeId, 'MFA');
        let st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.deepEqual([st.body.authenticated, st.body.mfaPending], [false, true]);
        const before = ctrl.requests.length;
        const blocked = await request(zac.base, 'GET', MGMT + '/identities', { jar: jar });
        assert.equal(blocked.status, 401);
        assert.equal(ctrl.requests.length, before, 'blocked at the proxy before reaching the controller');

        const noCsrf = await request(zac.base, 'POST', '/zac-session/mfa', { jar: jar, json: { code: '123456' } });
        assert.equal(noCsrf.status, 403);
        const bad = await request(zac.base, 'POST', '/zac-session/mfa',
            { jar: jar, json: { code: '000000' }, headers: { 'x-zac-csrf': jar.csrf() } });
        assert.equal(bad.status, 401);
        assert.equal(bad.body.invalidCode, true);
        const ok = await request(zac.base, 'POST', '/zac-session/mfa',
            { jar: jar, json: { code: '123456' }, headers: { 'x-zac-csrf': jar.csrf() } });
        assert.equal(ok.status, 200);
        st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
        assert.deepEqual([st.body.authenticated, st.body.mfaPending], [true, false]);
    });

    it('answers /zac-session/mfa with 400 when nothing is pending', async function() {
        const { jar } = await login(zac);
        const r = await request(zac.base, 'POST', '/zac-session/mfa',
            { jar: jar, json: { code: '123456' }, headers: { 'x-zac-csrf': jar.csrf() } });
        assert.equal(r.status, 400);
    });

    it('survives a malformed cookie escape (#12)', async function() {
        const r = await request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: 'zac.sid=%E0%A4%A; x=%' } });
        assert.equal(r.status, 200);
        assert.equal(r.body.authenticated, false);
    });

    it('does not resolve /c/__proto__ to an object prototype', async function() {
        const r = await request(zac.base, 'GET', '/c/__proto__/version');
        assert.equal(r.status, 200);
        assert.equal(r.body.data.version, 'v1.6.0');
        const r2 = await request(zac.base, 'GET', '/c/constructor/version');
        assert.equal(r2.status, 200);
    });

    it('lists controllers as same-origin /c/<id> paths', async function() {
        const r = await request(zac.base, 'GET', '/zac-session/controllers');
        assert.equal(r.body.controllers.length, 1);
        assert.match(r.body.controllers[0].url, /^\/c\//);
        assert.equal(r.body.controllers[0].default, true);
    });

    it('does not send the token to a controller the session did not log in to', async function() {
        const { jar } = await login(zac);
        const id = (await request(zac.base, 'GET', '/zac-session/controllers')).body.controllers[0].id;
        await request(zac.base, 'GET', '/c/' + id + MGMT + '/routers', { jar: jar });
        const up = ctrl.find(function(q) { return q.path === MGMT + '/routers'; }).pop();
        assert.match(up.headers['zt-session'], /^tok-/, 'same controller via /c/<id>: token sent');
    });

    it('blocks unauthenticated non-allowlisted requests at the proxy, allows pre-auth GETs (G9)', async function() {
        const before = ctrl.requests.length;
        const blocked = await request(zac.base, 'GET', MGMT + '/identities');
        assert.equal(blocked.status, 401);
        assert.equal(ctrl.requests.length, before, 'non-allowlisted request blocked before the controller');

        await request(zac.base, 'GET', '/edge/client/v1/external-jwt-signers');
        assert.ok(ctrl.find(function(q) { return q.path.indexOf('/edge/client/v1/external-jwt-signers') === 0; }).length,
            'allowlisted signer list reaches the controller');
        await request(zac.base, 'GET', MGMT + '/version');
        assert.ok(ctrl.find(function(q) { return q.path.indexOf(MGMT + '/version') === 0; }).length,
            'allowlisted version reaches the controller');
    });
});
