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
import fs from 'node:fs';
import path from 'node:path';
import { cleanTmp, cookieJar, login, request, startFakeController, startZac } from './helpers.mjs';

const wait = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

describe('configuration from env and settings.json', function() {
    let ctrl;
    before(async function() { ctrl = await startFakeController(); });
    after(async function() { await ctrl.close(); cleanTmp(); });

    function seedSettings(extra) {
        return function(dir) {
            fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(Object.assign({
                edgeControllers: [{ name: 'from-settings', url: ctrl.url, default: true }],
            }, extra)));
        };
    }

    it('reads controllers and rejectUnauthorized from the SETTINGS dir (#8, #18)', async function() {
        const zac = await startZac({}, seedSettings({ rejectUnauthorized: true }));
        try {
            assert.match(zac.output(), /verify upstream TLS: true/);
            const r = await request(zac.base, 'GET', '/zac-session/controllers');
            assert.equal(r.body.controllers[0].name, 'from-settings');
        } finally { await zac.stop(); }
    });

    it('lets ZAC_REJECT_UNAUTHORIZED=false override settings.json', async function() {
        const zac = await startZac({ ZAC_REJECT_UNAUTHORIZED: 'false' }, seedSettings({ rejectUnauthorized: true }));
        try { assert.match(zac.output(), /verify upstream TLS: false/); } finally { await zac.stop(); }
    });

    it('defaults to no upstream TLS verification', async function() {
        const zac = await startZac({}, seedSettings({}));
        try { assert.match(zac.output(), /verify upstream TLS: false/); } finally { await zac.stop(); }
    });

    describe('ZAC_COOKIE_SECURE=true (#13, G4)', function() {
        let zac;
        before(async function() { zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url, ZAC_COOKIE_SECURE: 'true' }); });
        after(async function() { await zac.stop(); });

        it('issues __Host- prefixed Secure cookies', async function() {
            const { jar, res } = await login(zac);
            const sc = res.headers['set-cookie'].join('\n');
            assert.match(sc, /__Host-zac\.sid=[^;]+; Path=\/; SameSite=Strict; HttpOnly; Secure/);
            assert.match(sc, /__Host-zac\.csrf=[^;]+; Path=\/; SameSite=Strict; Secure/);
            const st = await request(zac.base, 'GET', '/zac-session/status', { jar: jar });
            assert.equal(st.body.authenticated, true);
        });

        it('ignores an unprefixed (plantable) sid cookie', async function() {
            const { jar } = await login(zac);
            const planted = cookieJar();
            planted.take(['zac.sid=' + jar.get('__Host-zac.sid')]);
            const st = await request(zac.base, 'GET', '/zac-session/status', { jar: planted });
            assert.equal(st.body.authenticated, false);
        });
    });

    describe('ZAC_TRUST_PROXY (#11)', function() {
        let trusted, untrusted;
        before(async function() {
            trusted = await startZac({ ZAC_CONTROLLER_URL: ctrl.url, ZAC_TRUST_PROXY: '1' });
            untrusted = await startZac({ ZAC_CONTROLLER_URL: ctrl.url });
        });
        after(async function() { await trusted.stop(); await untrusted.stop(); });

        it('honors X-Forwarded-Proto only when trusted', async function() {
            const h = { 'X-Forwarded-Proto': 'https' };
            const t = await login(trusted, 'admin', 'pw', { headers: h });
            assert.match(t.res.headers['set-cookie'].join('\n'), /__Host-zac\.sid=.*Secure/);
            const u = await login(untrusted, 'admin', 'pw', { headers: h });
            assert.match(u.res.headers['set-cookie'].join('\n'), /^zac\.sid=/m);
            assert.doesNotMatch(u.res.headers['set-cookie'].join('\n'), /Secure/);
        });

        it('matches Origin against X-Forwarded-Host only when trusted', async function() {
            const opts = { json: { username: 'a', password: 'b' },
                headers: { Origin: 'https://zac.example', 'X-Forwarded-Host': 'zac.example' } };
            const t = await request(trusted.base, 'POST', '/zac-session/login', opts);
            assert.equal(t.status, 200);
            const u = await request(untrusted.base, 'POST', '/zac-session/login', opts);
            assert.equal(u.status, 403);
        });
    });

    it('opts specific origins in with ZAC_CORS_ORIGINS', async function() {
        const zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url, ZAC_CORS_ORIGINS: 'https://ok.example' });
        try {
            const ok = await request(zac.base, 'POST', '/zac-session/login',
                { json: { username: 'a', password: 'b' }, headers: { Origin: 'https://ok.example', 'Sec-Fetch-Site': 'cross-site' } });
            assert.equal(ok.status, 200);
            assert.equal(ok.headers['access-control-allow-origin'], 'https://ok.example');
            const bad = await request(zac.base, 'POST', '/zac-session/login',
                { json: { username: 'a', password: 'b' }, headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' } });
            assert.equal(bad.status, 403);
            assert.equal(bad.headers['access-control-allow-origin'], undefined);
        } finally { await zac.stop(); }
    });

    it('expires idle sessions after ZAC_SESSION_MAX_IDLE_MS', async function() {
        const zac = await startZac({ ZAC_CONTROLLER_URL: ctrl.url, ZAC_SESSION_MAX_IDLE_MS: '1500' });
        try {
            const { jar } = await login(zac);
            await wait(800);
            assert.equal((await request(zac.base, 'GET', '/zac-session/status', { jar: jar })).body.authenticated, true);
            await wait(1700);
            assert.equal((await request(zac.base, 'GET', '/zac-session/status', { jar: jar })).body.authenticated, false);
        } finally { await zac.stop(); }
    });

    it('restores sessions across a restart', async function() {
        const first = await startZac({ ZAC_CONTROLLER_URL: ctrl.url });
        const sessionFile = path.join(first.dir, 'sessions.json');
        let jar;
        try {
            jar = (await login(first)).jar;
            await wait(1500); // the session store flushes on a 1s debounce
        } finally { await first.stop(); }
        assert.ok(fs.existsSync(sessionFile));
        assert.doesNotMatch(fs.readFileSync(sessionFile, 'utf8'), /tok-/, 'the store is encrypted');
        const second = await startZac({ ZAC_CONTROLLER_URL: ctrl.url, ZAC_SESSION_FILE: sessionFile });
        try {
            const st = await request(second.base, 'GET', '/zac-session/status', { jar: jar });
            assert.equal(st.body.authenticated, true);
        } finally { await second.stop(); }
    });
});
