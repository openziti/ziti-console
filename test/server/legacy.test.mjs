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
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cleanTmp, cookieJar, request, startFakeController, startZac } from './helpers.mjs';

const MGMT = '/edge/management/v1';

// connect.sid as express-session signed it with the node-api server's fixed secret.
function legacyCookie(sid, secret) {
    const sig = crypto.createHmac('sha256', secret || 'NetFoundryZiti').update(sid).digest('base64').replace(/=+$/, '');
    return 'connect.sid=' + encodeURIComponent('s:' + sid + '.' + sig);
}

describe('node-api session migration (G5)', function() {
    let ctrl, zac, legacyDir;
    const seed = function(sid, data, ageMs) {
        const f = path.join(legacyDir, sid + '.json');
        fs.writeFileSync(f, JSON.stringify(data));
        if (ageMs) { const t = (Date.now() - ageMs) / 1000; fs.utimesSync(f, t, t); }
        return f;
    };

    before(async function() {
        ctrl = await startFakeController();
        zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url });
        legacyDir = path.join(zac.dir, 'legacy');
    });
    after(async function() { await zac.stop(); await ctrl.close(); cleanTmp(); });

    it('adopts a recent session for a configured controller, once', async function() {
        const f = seed('fresh1', { baseUrl: ctrl.url, user: 'legacy-tok-1' });
        const jar = cookieJar();
        const st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar, headers: { Cookie: legacyCookie('fresh1') } });
        assert.equal(st.body.authenticated, true);
        assert.match(st.headers['set-cookie'].join('\n'), /connect\.sid=; Path=\/; Max-Age=0/);
        assert.equal(fs.existsSync(f), false, 'the legacy file is consumed');
        await request(zac.base, 'GET', MGMT + '/identities', { jar: jar });
        const up = ctrl.find(function(q) { return q.path === MGMT + '/identities'; }).pop();
        assert.equal(up.headers['zt-session'], 'legacy-tok-1');
        // Inside the grace window a straggler gets the same session, never a second one.
        const replay = await request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: legacyCookie('fresh1') } });
        assert.match(replay.headers['set-cookie'].join('\n'), new RegExp('zac\\.sid=' + jar.get('zac.sid') + ';'));
    });

    it('drops a file older than the idle limit', async function() {
        const f = seed('stale1', { baseUrl: ctrl.url, user: 'legacy-tok-2' }, 3 * 24 * 3600 * 1000);
        const st = await request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: legacyCookie('stale1') } });
        assert.equal(st.body.authenticated, false);
        assert.equal(fs.existsSync(f), false);
    });

    it('never replays a token to a controller that is not configured', async function() {
        const before = ctrl.requests.length;
        seed('other1', { baseUrl: 'https://other.example:1280', user: 'legacy-tok-3' });
        const st = await request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: legacyCookie('other1') } });
        assert.equal(st.body.authenticated, false);
        assert.equal(ctrl.requests.length, before);
    });

    it('ignores a cookie signed with another secret', async function() {
        const f = seed('forged1', { baseUrl: ctrl.url, user: 'legacy-tok-4' });
        const st = await request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: legacyCookie('forged1', 'wrong') } });
        assert.equal(st.body.authenticated, false);
        assert.equal(fs.existsSync(f), true);
    });

    it('rejects a sid outside the uid-safe charset (path traversal)', async function() {
        const st = await request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: legacyCookie('../legacy/fresh1') } });
        assert.equal(st.body.authenticated, false);
    });

    it('adopts once when the first page load sends concurrent requests', async function() {
        seed('race1', { baseUrl: ctrl.url, user: 'legacy-tok-5' });
        const rs = await Promise.all([1, 2, 3, 4].map(function() {
            return request(zac.base, 'GET', '/zac-session/status', { headers: { Cookie: legacyCookie('race1') } });
        }));
        const sids = new Set(rs.map(function(r) { return /zac\.sid=([^;]+)/.exec(r.headers['set-cookie'].join('\n'))[1]; }));
        assert.equal(sids.size, 1);
        rs.forEach(function(r) { assert.equal(r.body.authenticated, true); });
    });
});

describe('legacy /api layer', function() {
    let ctrl, zac;
    before(async function() {
        ctrl = await startFakeController();
        zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url });
    });
    after(async function() { await zac.stop(); await ctrl.close(); cleanTmp(); });

    async function apiLogin() {
        const jar = cookieJar();
        const r = await request(zac.base, 'POST', '/api/login', { jar: jar, json: { url: ctrl.url, username: 'admin', password: 'pw' } });
        assert.deepEqual(r.body, { success: 'Logged In' });
        return jar;
    }

    it('logs in, reads data, and flags the deprecation', async function() {
        const jar = await apiLogin();
        const r = await request(zac.base, 'POST', '/api/data', { jar: jar, json: { type: 'identities', paging: null } });
        assert.equal(r.body.data[0].path, MGMT + '/identities');
        assert.ok(r.headers['x-zac-deprecated']);
    });

    it('rejects an unknown controller url', async function() {
        const r = await request(zac.base, 'POST', '/api/login', { json: { url: 'https://evil.example', username: 'a', password: 'b' } });
        assert.equal(r.body.error, 'Invalid Edge Controller');
    });

    it('refuses login when the controller requires multi-factor (no half-authenticated session)', async function() {
        const jar = cookieJar();
        const r = await request(zac.base, 'POST', '/api/login', { jar: jar, json: { url: ctrl.url, username: 'mfa', password: 'pw' } });
        assert.match(r.body.error, /multi-factor/i);
        assert.equal(jar.get('zac.sid'), undefined, 'no session cookie is set');
    });

    it('accepts dataSubs url as a string or a link object', async function() {
        const jar = await apiLogin();
        const a = await request(zac.base, 'POST', '/api/dataSubs', { jar: jar, json: { id: '1', type: 't', url: './identities/1/services' } });
        assert.equal(a.body.data[0].path, MGMT + '/identities/1/services');
        const b = await request(zac.base, 'POST', '/api/dataSubs', { jar: jar, json: { id: '1', type: 't', url: { href: './identities/2/services' } } });
        assert.equal(b.body.data[0].path, MGMT + '/identities/2/services');
    });

    it('answers loggedout without a session and survives an empty body', async function() {
        const r = await request(zac.base, 'POST', '/api/data', { headers: { 'Content-Type': 'application/json' } });
        assert.deepEqual(r.body, { error: 'loggedout' });
    });

    it('answers unsupported endpoints with JSON 404, not the SPA', async function() {
        const r = await request(zac.base, 'POST', '/api/execute', { json: {} });
        assert.equal(r.status, 404);
        assert.match(r.body.error, /Not supported/);
    });

    it('logout ends the session and clears both cookies', async function() {
        const jar = await apiLogin();
        const r = await request(zac.base, 'POST', '/api/logout', { jar: jar });
        assert.match(r.headers['set-cookie'].join('\n'), /zac\.csrf=; Path=\/; Max-Age=0/);
        const after = await request(zac.base, 'POST', '/api/data', { jar: jar, json: { type: 'identities' } });
        assert.deepEqual(after.body, { error: 'loggedout' });
    });

    it('can be disabled with ZAC_LEGACY_API=false', async function() {
        const off = await startZac({ ZAC_CONTROLLER_URL: ctrl.url, ZAC_LEGACY_API: 'false' });
        try {
            const r = await request(off.base, 'POST', '/api/login', { json: { url: ctrl.url, username: 'a', password: 'b' } });
            assert.notDeepEqual(r.body, { success: 'Logged In' });
        } finally { await off.stop(); }
    });
});
