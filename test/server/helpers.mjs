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

// Black-box harness for server.js: a fake controller, a spawned ZAC process, and a raw
// HTTP client that never follows redirects or adds headers of its own.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmpRoot = path.join(repoRoot, 'test', 'server', '.tmp');

export function freePort() {
    return new Promise(function(resolve, reject) {
        const s = net.createServer();
        s.unref();
        s.on('error', reject);
        s.listen(0, '127.0.0.1', function() { const p = s.address().port; s.close(function() { resolve(p); }); });
    });
}

// A scratch dir inside the repo: the server resolves SETTINGS relative to its own dir.
export function tmpDir() {
    fs.mkdirSync(tmpRoot, { recursive: true });
    return fs.mkdtempSync(path.join(tmpRoot, 'run-'));
}
export function cleanTmp() {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
}

function b64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function fakeJwt(claims) {
    return b64url(JSON.stringify({ alg: 'none' })) + '.' + b64url(JSON.stringify(claims)) + '.sig';
}

function readBody(req) {
    return new Promise(function(resolve) {
        let data = '';
        req.on('data', function(d) { data += d; });
        req.on('end', function() { resolve(data); });
    });
}

// The fake controller records every request and answers the handful of endpoints ZAC uses.
// state.oidc turns on the controller-native OIDC endpoints; state.revoked holds tokens that 401.
export async function startFakeController(opts) {
    const state = Object.assign({ oidc: false, revoked: new Set(), requests: [], tokenCount: 0, refreshCalls: 0,
        refreshDelayMs: 0, usedRefreshTokens: new Set(), revokedGrants: [], deletedSessions: [] }, opts);
    const server = http.createServer(async function(req, res) {
        const body = await readBody(req);
        const u = new URL(req.url, 'http://x');
        state.requests.push({ method: req.method, path: u.pathname, url: req.url, headers: req.headers, body: body });
        const token = req.headers['zt-session'] || (req.headers.authorization || '').replace(/^Bearer /, '') || null;
        const json = function(status, obj, extra) {
            res.writeHead(status, Object.assign({ 'Content-Type': 'application/json' }, extra));
            res.end(JSON.stringify(obj));
        };
        const p = u.pathname;
        if (p === '/version') {
            json(200, { data: { version: 'v1.6.0', capabilities: state.oidc ? ['OIDC_AUTH'] : [],
                apiVersions: { 'edge-oidc': { v1: { path: state.oidcPath || '/oidc' } } } } });
        } else if (p === '/edge/client/v1/external-jwt-signers') {
            json(200, { data: [] });
        } else if (p === '/edge/management/v1/authenticate' && req.method === 'POST') {
            const b = body ? JSON.parse(body) : {};
            if (u.searchParams.get('method') === 'password' && b.password === 'bad') {
                json(401, { error: { code: 'INVALID_AUTH', message: 'The authentication request failed' } });
                return;
            }
            const tok = 'tok-' + (++state.tokenCount);
            const data = { token: tok };
            if (b.username === 'mfa') data.authQueries = [{ typeId: 'MFA', provider: 'ziti', format: 'numeric' }];
            json(200, { data: data });
        } else if (p === '/edge/management/v1/authenticate/mfa' && req.method === 'POST') {
            const b = body ? JSON.parse(body) : {};
            if (b.code === '123456') json(200, { data: {} });
            else json(401, { error: { code: 'INVALID_MFA_CODE' } });
        } else if (p === '/edge/management/v1/current-api-session') {
            if (req.method === 'DELETE') { state.deletedSessions.push(token); json(200, { data: {} }); return; }
            if (!token || state.revoked.has(token)) json(401, { error: { code: 'UNAUTHORIZED' } });
            else json(200, { data: { token: token } });
        } else if (p === '/edge/management/v1/html') {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<script>alert(1)</script>');
        } else if (p.startsWith('/edge/management/v1/')) {
            if (!token || state.revoked.has(token)) { json(401, { error: { code: 'UNAUTHORIZED' } }); return; }
            json(200, { data: [{ id: 'x', path: p }], token: token }, {
                'Set-Cookie': 'evil=1; Path=/',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
                'Content-Security-Policy': "default-src *",
                'X-Frame-Options': 'ALLOWALL',
                'Cache-Control': 'max-age=3600',
            });
        } else if (state.oidc && p === '/oidc/authorize') {
            state.lastRedirectUri = u.searchParams.get('redirect_uri');
            res.writeHead(302, { Location: '/oidc/login/username?authRequestID=req-1', 'Set-Cookie': 'flow=abc; Path=/' });
            res.end();
        } else if (state.oidc && p === '/oidc/login/ext-jwt' && req.method === 'POST') {
            if (token !== 'good-idp-token') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('login'); return; }
            res.writeHead(302, { Location: '/oidc/authorize/callback?id=req-1' });
            res.end();
        } else if (state.oidc && p === '/oidc/authorize/callback') {
            res.writeHead(302, { Location: state.lastRedirectUri + '?code=code-1&state=s' });
            res.end();
        } else if (state.oidc && p === '/oidc/oauth/token' && req.method === 'POST') {
            const f = new URLSearchParams(body);
            if (f.get('grant_type') === 'authorization_code') {
                json(200, { access_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) + (state.accessTtlSec || 1800) }),
                    refresh_token: 'rt-0' });
                return;
            }
            state.refreshCalls++;
            const rt = f.get('refresh_token');
            if (state.refreshDelayMs) await new Promise(function(r) { setTimeout(r, state.refreshDelayMs); });
            // Rotation: a reused refresh token is an error (and would revoke the grant upstream).
            if (state.usedRefreshTokens.has(rt)) { json(400, { error: 'invalid_grant' }); return; }
            state.usedRefreshTokens.add(rt);
            json(200, { access_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) + 1800, n: state.refreshCalls }),
                refresh_token: 'rt-' + state.refreshCalls });
        } else if (state.oidc && p === '/oidc/oauth/revoke') {
            state.revokedGrants.push(new URLSearchParams(body).get('token'));
            json(200, {});
        } else {
            json(404, { error: { code: 'NOT_FOUND' } });
        }
    });
    await new Promise(function(r) { server.listen(0, '127.0.0.1', r); });
    state.url = 'http://127.0.0.1:' + server.address().port;
    state.close = function() { return new Promise(function(r) { server.closeAllConnections(); server.close(r); }); };
    state.find = function(pred) { return state.requests.filter(pred); };
    return state;
}

// Spawn server.js with an isolated settings dir, session file and legacy store. prepare(dir)
// runs before the spawn, to seed settings.json or legacy session files.
export async function startZac(env, prepare) {
    const dir = tmpDir();
    fs.mkdirSync(path.join(dir, 'legacy'));
    if (prepare) prepare(dir);
    const port = await freePort();
    const portTls = await freePort();
    const fullEnv = Object.assign({}, process.env, {
        ZAC_CONTROLLER_URL: undefined,
        ZAC_CONTROLLER_URLS: undefined,
        ZITI_CTRL_EDGE_ADVERTISED_ADDRESS: undefined,
        ZAC_REJECT_UNAUTHORIZED: undefined,
        ZAC_COOKIE_SECURE: undefined,
        ZAC_TRUST_PROXY: undefined,
        ZAC_CORS_ORIGINS: undefined,
        ZAC_SESSION_SECRET: undefined,
        PORT: String(port),
        PORTTLS: String(portTls),
        BIND_IP: '127.0.0.1',
        SETTINGS: path.relative(repoRoot, dir),
        ZAC_SESSION_FILE: path.join(dir, 'sessions.json'),
        ZAC_SERVER_KEY: path.join(dir, 'no-such.key'),
        ZAC_LEGACY_SESSION_DIR: path.join(dir, 'legacy'),
    }, env);
    Object.keys(fullEnv).forEach(function(k) { if (fullEnv[k] === undefined) delete fullEnv[k]; });
    const proc = spawn(process.execPath, [path.join(repoRoot, 'server.js')], { cwd: repoRoot, env: fullEnv });
    let out = '';
    proc.stdout.on('data', function(d) { out += d; });
    proc.stderr.on('data', function(d) { out += d; });
    await new Promise(function(resolve, reject) {
        const t = setTimeout(function() { reject(new Error('ZAC did not start:\n' + out)); }, 15000);
        const check = function() { if (out.indexOf('listening on port') > -1) { clearTimeout(t); resolve(); } };
        proc.stdout.on('data', check);
        proc.on('exit', function(code) { clearTimeout(t); reject(new Error('ZAC exited ' + code + ':\n' + out)); });
    });
    return {
        dir: dir,
        port: port,
        base: 'http://127.0.0.1:' + port,
        output: function() { return out; },
        stop: function() {
            return new Promise(function(r) {
                if (proc.exitCode != null) { r(); return; }
                proc.removeAllListeners('exit');
                proc.on('exit', function() { r(); });
                proc.kill();
            });
        },
    };
}

// Raw request: no redirects, no implicit Origin/Sec-Fetch headers. JSON bodies are serialized.
export function request(base, method, p, opts) {
    opts = opts || {};
    return new Promise(function(resolve, reject) {
        const headers = Object.assign({}, opts.headers);
        let payload = null;
        if (opts.json !== undefined) {
            payload = Buffer.from(JSON.stringify(opts.json));
            headers['Content-Type'] = 'application/json';
        }
        if (payload) headers['Content-Length'] = payload.length;
        if (opts.jar && opts.jar.header()) headers.Cookie = opts.jar.header();
        const r = http.request(base + p, { method: method, headers: headers }, function(res) {
            let data = '';
            res.on('data', function(d) { data += d; });
            res.on('end', function() {
                if (opts.jar) opts.jar.take(res.headers['set-cookie']);
                let body = null;
                try { body = JSON.parse(data); } catch (e) { body = data; }
                resolve({ status: res.statusCode, headers: res.headers, body: body, raw: data });
            });
        });
        r.on('error', reject);
        if (payload) r.write(payload);
        r.end();
    });
}

// Minimal browser-like cookie jar (Max-Age=0 deletes).
export function cookieJar() {
    const jar = {};
    return {
        jar: jar,
        take: function(setCookies) {
            (setCookies || []).forEach(function(sc) {
                const pair = sc.split(';')[0];
                const i = pair.indexOf('=');
                const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim();
                if (/;\s*Max-Age=0/i.test(sc)) delete jar[name]; else jar[name] = value;
            });
        },
        header: function() { return Object.keys(jar).map(function(k) { return k + '=' + jar[k]; }).join('; '); },
        get: function(name) { return jar[name]; },
        csrf: function() { return decodeURIComponent(jar['__Host-zac.csrf'] || jar['zac.csrf'] || ''); },
    };
}

// Log in with the password flow and return a jar holding the session cookies.
export async function login(zac, username, password, extra) {
    const jar = cookieJar();
    const r = await request(zac.base, 'POST', '/zac-session/login',
        Object.assign({ jar: jar, json: { type: 'password', username: username || 'admin', password: password || 'pw' } }, extra));
    return { jar: jar, res: r };
}
