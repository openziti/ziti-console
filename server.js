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

/*
 * ZAC reverse proxy. Serves the Angular SPA and proxies the controller API
 * to the configured controller(s); the ziti token is held server-side (httpOnly
 * cookie) and injected onto proxied requests. Replaces the deprecated node-api server.
 *
 * Env config:
 *   ZAC_CONTROLLER_URLS   comma-separated controller URLs (multiple)
 *   ZAC_CONTROLLER_URL    a single controller URL
 *   ZITI_CTRL_EDGE_ADVERTISED_ADDRESS / _PORT / _NAME   single-controller convenience
 *   PORT / PORTTLS        HTTP / HTTPS listen ports (default 1408 / 8443)
 *   BIND_IP               interface to bind (default: all)
 *   ZAC_SERVER_KEY / ZAC_SERVER_CERT_CHAIN   TLS key/cert; their presence enables HTTPS
 *   ZAC_REJECT_UNAUTHORIZED   "true" to verify the controller's TLS cert (default off)
 *   ZAC_COOKIE_SECURE     force the session cookie Secure flag (default: tracks TLS)
 *   ZAC_SESSION_FILE / ZAC_SESSION_SECRET   session store path / encryption key
 *   ZAC_CSP_CONNECT_SRC   extra CSP connect/frame-src origins
 *   ZAC_OIDC_REDIRECT_URI   redirect URI for the server-side OIDC exchange
 *   ZAC_LEGACY_API        "false" disables the deprecated /api/* layer (on by default; see legacy-api.js)
 *   ALLOW_HTTP            "true" skips cors/helmet (security headers handled elsewhere)
 *   ZITI_IDENTITY_FILE / ZITI_SERVICE_NAME   serve over a Ziti service instead of TCP
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { mountLegacyApi } from './legacy-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Optionally serve over a Ziti service (ziti-sdk-nodejs loaded lazily, only then).
const loadModule = async (modulePath) => {
    try { return await import(modulePath); }
    catch (e) { throw new Error(`Unable to import module ${modulePath}`); }
};
const zitiServiceName = process.env.ZITI_SERVICE_NAME || 'zac';
const zitiIdentityFile = process.env.ZITI_IDENTITY_FILE;
let ziti;
try { ziti = await loadModule('@openziti/ziti-sdk-nodejs'); }
catch (e) { if (zitiIdentityFile) { console.error(e); process.exit(1); } }
const zitified = !!(zitiIdentityFile && zitiServiceName && ziti);
if (zitified) await ziti.init(zitiIdentityFile).catch(() => process.exit(1));

const app = zitified ? ziti.express(express, zitiServiceName) : express();
const port = process.env.PORT || 1408;

// ---- Resolve the upstream controller(s) -----------------------------------
function trimTrailingSlash(u) {
    return (u || '').replace(/\/+$/, '');
}

function normUrl(u) {
    u = (u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return trimTrailingSlash(u);
}

function slugFor(url, used) {
    let base;
    try { const x = new URL(url); base = (x.hostname + (x.port ? '-' + x.port : '')).replace(/[^a-z0-9.-]/gi, '-'); }
    catch (e) { base = 'controller'; }
    let s = base, n = 2;
    while (used.has(s)) s = base + '-' + (n++);
    used.add(s);
    return s;
}

function loadSettingsControllers() {
    const candidates = [];
    if (process.env.SETTINGS) candidates.push(path.join(__dirname, process.env.SETTINGS, 'settings.json'));
    candidates.push(path.join(__dirname, 'assets', 'data', 'settings.json'));
    for (const p of candidates) {
        try {
            const d = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (Array.isArray(d.edgeControllers) && d.edgeControllers.length) return d.edgeControllers;
        } catch (e) { /* try next */ }
    }
    return [];
}

// Sources, in order: settings.json, ZAC_CONTROLLER_URLS, ZITI_CTRL_* convenience, ZAC_CONTROLLER_URL.
function buildControllers() {
    const list = [];
    const seen = new Set();
    const add = (name, url, isDefault) => {
        url = normUrl(url);
        if (!url || seen.has(url)) return;
        seen.add(url);
        list.push({ name: name || url, url: url, default: !!isDefault });
    };
    loadSettingsControllers().forEach(c => add(c.name, c.url, c.default));
    (process.env.ZAC_CONTROLLER_URLS || '').split(',').map(s => s.trim()).filter(Boolean).forEach(u => add(u, u, false));
    const addr = process.env.ZITI_CTRL_EDGE_ADVERTISED_ADDRESS, cport = process.env.ZITI_CTRL_EDGE_ADVERTISED_PORT;
    if (addr && cport) add(process.env.ZITI_CTRL_NAME || 'controller', `https://${addr}:${cport}`, list.length === 0);
    if (process.env.ZAC_CONTROLLER_URL) add(process.env.ZAC_CONTROLLER_URL, process.env.ZAC_CONTROLLER_URL, list.length === 0);
    const used = new Set();
    list.forEach(c => { c.id = slugFor(c.url, used); });
    if (list.length && !list.some(c => c.default)) list[0].default = true;
    return list;
}

const controllers = buildControllers();
if (controllers.length === 0) {
    console.error('ERROR: no upstream controller configured. Set ZAC_CONTROLLER_URLS ' +
        '(comma-separated), ZAC_CONTROLLER_URL, or ZITI_CTRL_EDGE_ADVERTISED_ADDRESS + _PORT.');
    process.exit(1);
}
const defaultController = controllers.find(c => c.default) || controllers[0];
const controllersById = {};
controllers.forEach(c => { controllersById[c.id] = c; });

// Resolve the target controller from a /c/<id>/ prefix (default otherwise), and
// strip that prefix before forwarding.
function controllerForPath(p) {
    const m = /^\/c\/([^/]+)(\/|$)/.exec(p || '');
    return (m && controllersById[m[1]]) || defaultController;
}
function controllerIdForPath(p) {
    const m = /^\/c\/([^/]+)(\/|$)/.exec(p || '');
    return (m && controllersById[m[1]]) ? m[1] : defaultController.id;
}
function stripControllerPrefix(p) {
    return p.replace(/^\/c\/[^/]+/, '') || '/';
}

// Controllers are commonly self-signed; don't verify upstream TLS unless opted in.
const secure = process.env.ZAC_REJECT_UNAUTHORIZED === 'true';

// Resolved up here so the session cookie's Secure flag can track whether we serve HTTPS.
const tlsKeyPath = process.env.ZAC_SERVER_KEY || path.join(__dirname, 'server.key');
const tlsCertPath = process.env.ZAC_SERVER_CERT_CHAIN || path.join(__dirname, 'server.chain.pem');
const tlsConfigured = fs.existsSync(tlsKeyPath) && fs.existsSync(tlsCertPath);
const cookieSecure = process.env.ZAC_COOKIE_SECURE === 'true'
    || (process.env.ZAC_COOKIE_SECURE !== 'false' && tlsConfigured);

// Paths forwarded to the controller (optionally behind a /c/<id> prefix); everything
// else is the static SPA.
const API_PATH_RE = /^\/(edge|fabric|oidc|\.well-known)(\/|$)/;
function isApiPath(pathname) {
    const p = stripControllerPrefix(pathname);
    return p === '/version' || API_PATH_RE.test(p);
}

// ---- Middleware -----------------------------------------------------------
var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
};

// connect/frame-src allow the configured IdP origins (from external-jwt-signers +
// ZAC_CSP_CONNECT_SRC) so browser OIDC isn't CSP-blocked; no wildcard.
let idpOrigins = [];
const extraCspOrigins = (process.env.ZAC_CSP_CONNECT_SRC || '')
    .split(',').map(function(s) { return s.trim(); }).filter(Boolean);

function buildHelmetOptions() {
    const idp = Array.from(new Set(idpOrigins.concat(extraCspOrigins)));
    return {
        contentSecurityPolicy: {
            directives: {
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
                frameSrc: ["'self'"].concat(idp),
                frameAncestors: ["'self'"],
                mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
                connectSrc: ["'self'"].concat(idp),
            },
        },
        frameguard: { action: 'SAMEORIGIN' },
        crossOriginEmbedderPolicy: false,
    };
}

if (`${process.env.ALLOW_HTTP}`.toLowerCase() !== 'true') {
    app.use(cors(corsOptions));
    // Per-request so refreshed IdP origins take effect without a restart.
    app.use(function(req, res, next) { helmet(buildHelmetOptions())(req, res, next); });
} else {
    console.log('ALLOW_HTTP set - skipping cors/helmet');
}

function originOf(u) {
    try { return new URL(u).origin; } catch (e) { return null; }
}

// Refresh the CSP IdP allowlist across all controllers. Non-fatal; logs only on change.
async function refreshIdpOrigins() {
    const origins = new Set();
    await Promise.all(controllers.map(async function(c) {
        try {
            const r = await httpRequest(c.url + '/edge/client/v1/external-jwt-signers?limit=500');
            ((JSON.parse(r.body) || {}).data || []).forEach(function(s) {
                const o = originOf(s.externalAuthUrl);
                if (o) origins.add(o);
            });
        } catch (e) { /* skip this controller */ }
    }));
    const prev = idpOrigins.join(',');
    idpOrigins = Array.from(origins);
    if (idpOrigins.length && idpOrigins.join(',') !== prev) {
        console.log('  -> CSP allows IdP origins: ' + idpOrigins.join(', '));
    }
}

// No global body parser: proxied POST/PUT bodies must forward raw. The /zac-session/*
// routes parse JSON per-route.

// ---- Server-side session layer --------------------------------------------
// Token held here (never in the browser), keyed by an opaque httpOnly cookie.
const SID_COOKIE = 'zac.sid';
const CSRF_COOKIE = 'zac.csrf';
const MGMT_PREFIX = '/edge/management/v1';
// sid -> { token, csrf, kind:'legacy'|'oidc', createdAt, lastSeen, refreshToken?, oidcBase?, clientId?, accessExpMs? }
const sessions = new Map();

// Persisted (AES-256-GCM, 0600) so a restart/upgrade doesn't log everyone out.
// Single-process; a multi-replica deployment needs a shared store.
const SESSION_FILE = process.env.ZAC_SESSION_FILE || path.join(__dirname, 'sessions', 'zac-proxy-sessions.json');
const SESSION_KEY_FILE = SESSION_FILE + '.key';
const SESSION_MAX_IDLE_MS = 24 * 3600 * 1000;

// Prefer ZAC_SESSION_SECRET (keep it off the session volume); else a generated 0600 key file.
function sessionKey() {
    if (process.env.ZAC_SESSION_SECRET) return crypto.createHash('sha256').update(process.env.ZAC_SESSION_SECRET).digest();
    try { const k = fs.readFileSync(SESSION_KEY_FILE); if (k.length === 32) return k; } catch (e) { /* generate */ }
    const key = crypto.randomBytes(32);
    try { fs.mkdirSync(path.dirname(SESSION_KEY_FILE), { recursive: true }); fs.writeFileSync(SESSION_KEY_FILE, key, { mode: 0o600 }); }
    catch (e) { console.error('Could not persist session key: ' + e.message); }
    return key;
}
const SKEY = sessionKey();

function encryptBlob(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', SKEY, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: enc.toString('base64') });
}
function decryptBlob(blob) {
    const o = JSON.parse(blob);
    const d = crypto.createDecipheriv('aes-256-gcm', SKEY, Buffer.from(o.iv, 'base64'));
    d.setAuthTag(Buffer.from(o.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]).toString('utf8');
}

function loadSessions() {
    try {
        const raw = JSON.parse(decryptBlob(fs.readFileSync(SESSION_FILE, 'utf8'))) || {};
        const now = Date.now();
        Object.keys(raw).forEach(function(sid) {
            const s = raw[sid];
            if (s && (!s.lastSeen || now - s.lastSeen < SESSION_MAX_IDLE_MS)) sessions.set(sid, s);
        });
        if (sessions.size) console.log('  -> restored ' + sessions.size + ' server session(s) from ' + SESSION_FILE);
    } catch (e) { /* no file, wrong key, or tampered - start empty (users re-login) */ }
}

function flushSessions() {
    try {
        fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
        const obj = {};
        sessions.forEach(function(v, k) { obj[k] = v; });
        fs.writeFileSync(SESSION_FILE, encryptBlob(JSON.stringify(obj)), { mode: 0o600 });
    } catch (e) { console.error('Could not persist sessions: ' + e.message); }
}

let persistTimer = null;
function persistSessions() {
    if (persistTimer) return;
    persistTimer = setTimeout(function() { persistTimer = null; flushSessions(); }, 1000);
    persistTimer.unref();
}

// Flush on graceful shutdown so the last changes survive a restart.
['SIGTERM', 'SIGINT'].forEach(function(sig) {
    process.on(sig, function() { flushSessions(); process.exit(0); });
});

function parseCookies(req) {
    const out = {};
    const header = req.headers.cookie;
    if (!header) return out;
    header.split(';').forEach(function(pair) {
        const idx = pair.indexOf('=');
        if (idx > -1) out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    });
    return out;
}

function setCookie(name, value, httpOnly) {
    let c = name + '=' + encodeURIComponent(value) + '; Path=/; SameSite=Strict';
    if (httpOnly) c += '; HttpOnly';
    if (cookieSecure) c += '; Secure';
    return c;
}

function clearCookie(name, httpOnly) {
    let c = name + '=; Path=/; Max-Age=0; SameSite=Strict';
    if (httpOnly) c += '; HttpOnly';
    if (cookieSecure) c += '; Secure';
    return c;
}

function getSession(req) {
    const sid = parseCookies(req)[SID_COOKIE];
    if (!sid) return null;
    const s = sessions.get(sid);
    if (!s) return null;
    s.lastSeen = Date.now();
    return Object.assign({ sid: sid }, s);
}

function csrfOk(req, s) {
    const header = req.headers['x-zac-csrf'];
    if (!header || !s || !s.csrf || header.length !== s.csrf.length) return false;
    try { return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(s.csrf)); }
    catch (e) { return false; }
}

// A JWT session token is sent as a Bearer; a legacy opaque token as zt-session.
function looksLikeJwt(t) {
    return typeof t === 'string' && t.split('.').length === 3;
}

function authenticateUpstream(ctrlUrl, method, body, bearer, cb) {
    let u;
    try { u = new URL(ctrlUrl + MGMT_PREFIX + '/authenticate?method=' + encodeURIComponent(method)); }
    catch (e) { cb(e); return; }
    const mod = u.protocol === 'http:' ? http : https;
    const payload = Buffer.from(JSON.stringify(body || {}));
    const headers = { 'Content-Type': 'application/json', 'Content-Length': payload.length };
    if (bearer) headers['Authorization'] = 'Bearer ' + bearer;
    const r = mod.request(u, { method: 'POST', rejectUnauthorized: secure, headers: headers }, function(res) {
        let data = '';
        res.on('data', function(d) { data += d; });
        res.on('end', function() {
            let parsed = null;
            try { parsed = JSON.parse(data); } catch (e) { /* non-JSON error body */ }
            cb(null, res.statusCode, parsed);
        });
    });
    r.on('error', function(e) { cb(e); });
    r.setTimeout(10000, function() { r.destroy(new Error('authenticate timed out')); });
    r.end(payload);
}

function createSession(res, fields) {
    const sid = crypto.randomUUID();
    const csrf = crypto.randomUUID();
    sessions.set(sid, Object.assign({ csrf: csrf, createdAt: Date.now(), lastSeen: Date.now() }, fields));
    persistSessions();
    res.setHeader('Set-Cookie', [setCookie(SID_COOKIE, sid, true), setCookie(CSRF_COOKIE, csrf, false)]);
}

// ---- Controller-native OIDC (server-side token custody) -------------------
// The browser does the external-IdP hop and hands us the IdP token; we run the
// controller's PKCE auth-code flow here and keep the tokens server-side. Server-side
// we aren't subject to CORS (read 302 Location directly) and use a loopback redirect
// URI, sidestepping the non-loopback-host limitation of the in-browser flow.
// The default is derived from PORT; a dev EADDRINUSE port-bump won't update it, but
// the controller's loopback glob matches any port and we never fetch this URI, so
// it's harmless - set ZAC_OIDC_REDIRECT_URI explicitly in production.
const OIDC_REDIRECT_URI = process.env.ZAC_OIDC_REDIRECT_URI || ('http://localhost:' + port + '/auth/callback');

function b64url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randomUrlSafe(n) { return b64url(crypto.randomBytes(n || 32)); }
function pkceChallenge(verifier) { return b64url(crypto.createHash('sha256').update(verifier).digest()); }
function jwtExpMs(token) {
    try {
        const seg = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const p = JSON.parse(Buffer.from(seg, 'base64').toString());
        return typeof p.exp === 'number' ? p.exp * 1000 : undefined;
    } catch (e) { return undefined; }
}
function form(obj) { return new URLSearchParams(obj).toString(); }

// Minimal promise HTTP that does NOT follow redirects (we read the 302 Location directly).
function httpRequest(urlStr, opts) {
    opts = opts || {};
    return new Promise(function(resolve, reject) {
        let u;
        try { u = new URL(urlStr); } catch (e) { reject(e); return; }
        const mod = u.protocol === 'http:' ? http : https;
        const payload = opts.body != null ? Buffer.from(opts.body) : null;
        const headers = Object.assign({}, opts.headers);
        if (payload) headers['Content-Length'] = payload.length;
        const r = mod.request(u, { method: opts.method || 'GET', rejectUnauthorized: secure, headers: headers }, function(res) {
            let data = '';
            res.on('data', function(d) { data += d; });
            res.on('end', function() { resolve({ status: res.statusCode, headers: res.headers, body: data }); });
        });
        r.on('error', reject);
        r.setTimeout(10000, function() { r.destroy(new Error('request timed out')); });
        if (payload) r.write(payload);
        r.end();
    });
}

async function oidcDiscover(ctrlUrl) {
    try {
        const r = await httpRequest(ctrlUrl + '/version');
        const d = (JSON.parse(r.body) || {}).data || {};
        const caps = d.capabilities || [];
        const path = d.apiVersions && d.apiVersions['edge-oidc'] && d.apiVersions['edge-oidc'].v1 && d.apiVersions['edge-oidc'].v1.path;
        return { available: Array.isArray(caps) && caps.indexOf('OIDC_AUTH') > -1, oidcPath: path || '/oidc' };
    } catch (e) { return { available: false, oidcPath: '/oidc' }; }
}

// The /oidc flow is stateful across hops, so cookies ride along.
function mergeSetCookie(jar, setCookie) {
    (setCookie || []).forEach(function(sc) {
        const pair = sc.split(';')[0];
        const idx = pair.indexOf('=');
        if (idx > -1) jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    });
}
function jarHeader(jar) {
    return Object.keys(jar).map(function(k) { return k + '=' + jar[k]; }).join('; ');
}

// Exchange an external-IdP token for controller OIDC tokens. Returns
// {accessToken, refreshToken, oidcBase, clientId}, {error}, or null (no OIDC).
async function oidcExtJwtLogin(ctrlUrl, idpToken) {
    if (!idpToken) return { error: 'missing IdP token' };
    const disc = await oidcDiscover(ctrlUrl);
    if (!disc.available) return null;
    const oidcBase = ctrlUrl + disc.oidcPath;
    let ctrlOrigin = null;
    try { ctrlOrigin = new URL(ctrlUrl).origin; } catch (e) { return { error: 'bad controller url' }; }
    const verifier = randomUrlSafe(32);
    const challenge = pkceChallenge(verifier);
    const state = randomUrlSafe(16);
    const nonce = randomUrlSafe(16);
    for (const clientId of ['openziti', 'native']) {
        const jar = {};
        const authResp = await httpRequest(oidcBase + '/authorize?' + form({
            client_id: clientId, scope: 'openid offline_access', response_type: 'code',
            state: state, nonce: nonce, code_challenge: challenge, code_challenge_method: 'S256',
            redirect_uri: OIDC_REDIRECT_URI,
        }));
        mergeSetCookie(jar, authResp.headers['set-cookie']);
        const authLoc = authResp.headers['location'];
        if (!authLoc) continue;
        let authRequestId = null;
        try { authRequestId = new URL(authLoc, oidcBase).searchParams.get('authRequestID'); } catch (e) {}
        if (!authRequestId) continue;
        const loginResp = await httpRequest(oidcBase + '/login/ext-jwt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + idpToken, 'Cookie': jarHeader(jar) },
            body: form({ id: authRequestId }),
        });
        mergeSetCookie(jar, loginResp.headers['set-cookie']);
        if (!loginResp.headers['location']) {
            return { error: 'ext-jwt rejected or MFA required (MFA unsupported in proxy-session)' };
        }
        // Follow the 302 chain (carrying cookies) until the redirect URI carries ?code.
        let code = null;
        let loc = loginResp.headers['location'];
        for (let hop = 0; hop < 6 && loc && !code; hop++) {
            let abs;
            try { abs = new URL(loc, oidcBase); } catch (e) { break; }
            code = abs.searchParams.get('code');
            if (code) break;
            if (abs.href.indexOf(OIDC_REDIRECT_URI) === 0) break;
            if (abs.origin !== ctrlOrigin) break; // never carry the flow cookies off the controller
            const next = await httpRequest(abs.href, { method: 'GET', headers: { 'Cookie': jarHeader(jar) } });
            mergeSetCookie(jar, next.headers['set-cookie']);
            loc = next.headers['location'];
        }
        if (!code) return { error: 'no authorization code in login redirect' };
        const tokResp = await httpRequest(oidcBase + '/oauth/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form({ grant_type: 'authorization_code', client_id: clientId, code: code, code_verifier: verifier, redirect_uri: OIDC_REDIRECT_URI }),
        });
        let tok;
        try { tok = JSON.parse(tokResp.body); } catch (e) { return { error: 'token response was not JSON' }; }
        if (!tok.access_token) return { error: tok.error_description || tok.error || 'no access_token returned' };
        return { accessToken: tok.access_token, refreshToken: tok.refresh_token, oidcBase: oidcBase, clientId: clientId };
    }
    return { error: 'OIDC /authorize failed - is redirect URI "' + OIDC_REDIRECT_URI + '" registered on the controller?' };
}

// Refresh an OIDC session in place (mutates it). Throws on failure.
async function oidcRefresh(s) {
    const r = await httpRequest(s.oidcBase + '/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ grant_type: 'refresh_token', client_id: s.clientId, refresh_token: s.refreshToken }),
    });
    const tok = JSON.parse(r.body);
    if (!tok.access_token) throw new Error(tok.error || 'refresh failed');
    s.token = tok.access_token;
    if (tok.refresh_token) s.refreshToken = tok.refresh_token;
    s.accessExpMs = jwtExpMs(tok.access_token) || (Date.now() + ((tok.expires_in || 1800) * 1000));
    persistSessions();
}

function oidcRevoke(s) {
    return httpRequest(s.oidcBase + '/oauth/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ token: s.refreshToken, token_type_hint: 'refresh_token', client_id: s.clientId }),
    });
}

// ---- One-time migration from the node-api server --------------------------
// The node-api server stored its session via express-session + session-file-store
// (./sessions/<sid>.json, cookie "connect.sid" signed with a fixed secret). On the
// first request after an upgrade, adopt it so users aren't logged out. Transitional.
const LEGACY_SECRET = 'NetFoundryZiti';
const LEGACY_COOKIE = 'connect.sid';
const LEGACY_STORE_DIR = path.join(__dirname, 'sessions');

function unsignLegacy(raw) {
    if (!raw || raw.slice(0, 2) !== 's:') return null;
    const body = raw.slice(2);
    const dot = body.lastIndexOf('.');
    if (dot < 0) return null;
    const sid = body.slice(0, dot), sig = body.slice(dot + 1);
    const expected = crypto.createHmac('sha256', LEGACY_SECRET).update(sid).digest('base64').replace(/=+$/, '');
    try {
        if (sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return sid;
    } catch (e) { /* mismatch */ }
    return null;
}

async function migrateLegacySession(req, res) {
    const cookies = parseCookies(req);
    if (cookies[SID_COOKIE]) return;
    const sid = unsignLegacy(cookies[LEGACY_COOKIE]);
    if (!sid || /[^A-Za-z0-9_-]/.test(sid)) return; // uid-safe charset only (no path traversal)
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(LEGACY_STORE_DIR, sid + '.json'), 'utf8')); }
    catch (e) { return; }
    const base = trimTrailingSlash(data.baseUrl || (data.serviceUrl || '').replace(/\/edge\/.*/, ''));
    const ctrl = controllers.find(function(c) { return c.url === base; }) || defaultController;

    // Re-auth from the stored IdP token when present (fresh auto-refreshing session,
    // survives an expired ziti token); else adopt the stored ziti token as legacy.
    let fields = null;
    if (data.extJwtToken) {
        try {
            const oidc = await oidcExtJwtLogin(ctrl.url, data.extJwtToken);
            if (oidc && oidc.accessToken) {
                fields = { token: oidc.accessToken, kind: 'oidc', controllerId: ctrl.id,
                    refreshToken: oidc.refreshToken, oidcBase: oidc.oidcBase, clientId: oidc.clientId,
                    accessExpMs: jwtExpMs(oidc.accessToken) || (Date.now() + 1800000) };
            }
        } catch (e) { /* fall through to the stored token */ }
    }
    if (!fields) {
        if (!data.user) return;
        fields = { token: data.user, kind: 'legacy', controllerId: ctrl.id };
    }

    const newSid = crypto.randomUUID();
    const csrf = crypto.randomUUID();
    sessions.set(newSid, Object.assign({ csrf: csrf, createdAt: Date.now(), lastSeen: Date.now() }, fields));
    persistSessions();
    try { fs.unlinkSync(path.join(LEGACY_STORE_DIR, sid + '.json')); } catch (e) { /* best-effort */ }
    res.setHeader('Set-Cookie', [setCookie(SID_COOKIE, newSid, true), setCookie(CSRF_COOKIE, csrf, false), clearCookie(LEGACY_COOKIE, true)]);
    req.headers.cookie = (req.headers.cookie ? req.headers.cookie + '; ' : '') + SID_COOKIE + '=' + newSid; // so the current request is already authed
}

// Controller list for the login picker; each url is the same-origin /c/<id> path.
app.get('/zac-session/controllers', function(req, res) {
    res.json({
        controllers: controllers.map(function(c) {
            return { id: c.id, name: c.name, url: '/c/' + c.id, default: !!c.default };
        }),
    });
});

{
    const jsonParser = express.json();

    app.use(function(req, res, next) {
        migrateLegacySession(req, res).then(function() { next(); }, function() { next(); });
    });

    // ext-jwt -> controller OIDC exchange (falls back to legacy /authenticate if the
    // controller has no OIDC); password -> legacy /authenticate. No token is returned.
    app.post('/zac-session/login', jsonParser, async function(req, res) {
        const body = req.body || {};
        const type = body.type || 'password';
        const ctrl = controllersById[body.controllerId] || defaultController;
        try {
            if (type === 'ext-jwt') {
                const oidc = await oidcExtJwtLogin(ctrl.url, body.token);
                if (oidc && oidc.accessToken) {
                    createSession(res, {
                        token: oidc.accessToken, kind: 'oidc', controllerId: ctrl.id,
                        refreshToken: oidc.refreshToken, oidcBase: oidc.oidcBase, clientId: oidc.clientId,
                        accessExpMs: jwtExpMs(oidc.accessToken) || (Date.now() + 1800000),
                    });
                    res.json({ success: true });
                    return;
                }
                if (oidc && oidc.error) { res.status(401).json({ error: 'OIDC login failed: ' + oidc.error }); return; }
                // oidc === null -> no OIDC; fall through to legacy ext-jwt.
            }
            const method = type === 'ext-jwt' ? 'ext-jwt' : 'password';
            const authBody = type === 'ext-jwt' ? {} : { username: body.username, password: body.password };
            const bearer = type === 'ext-jwt' ? body.token : undefined;
            authenticateUpstream(ctrl.url, method, authBody, bearer, function(err, status, parsed) {
                if (err) { res.status(502).json({ error: 'Controller not reachable: ' + err.message }); return; }
                const token = parsed && parsed.data && parsed.data.token;
                if (!token) {
                    const msg = (parsed && parsed.error && (parsed.error.message || parsed.error.code)) || 'Invalid login';
                    res.status(status && status >= 400 ? status : 401).json({ error: msg });
                    return;
                }
                createSession(res, { token: token, kind: 'legacy', controllerId: ctrl.id });
                res.json({ success: true });
            });
        } catch (e) {
            res.status(502).json({ error: 'Login failed: ' + e.message });
        }
    });

    app.post('/zac-session/logout', function(req, res) {
        const s = getSession(req);
        if (s && !csrfOk(req, s)) { res.status(403).json({ error: 'CSRF validation failed' }); return; }
        if (s) {
            if (s.kind === 'oidc' && s.refreshToken) { oidcRevoke(s).catch(function() {}); }
            sessions.delete(s.sid);
            persistSessions();
        }
        res.setHeader('Set-Cookie', [clearCookie(SID_COOKIE, true), clearCookie(CSRF_COOKIE, false)]);
        res.json({ success: true });
    });

    app.get('/zac-session/status', function(req, res) {
        const s = getSession(req);
        res.json({ authenticated: !!s, mode: 'proxy-session', controller: s ? s.controllerId : null });
    });

    // Resolve the session for proxied API requests, refresh a near-expiry OIDC token,
    // and enforce CSRF on mutations. Token injection happens in proxyReq (below).
    app.use(async function(req, res, next) {
        if (!isApiPath(req.path)) return next();
        const sid = parseCookies(req)[SID_COOKIE];
        const s = sid ? sessions.get(sid) : null;
        if (s) {
            s.lastSeen = Date.now();
            if (s.kind === 'oidc' && s.refreshToken && s.accessExpMs && Date.now() > s.accessExpMs - 60000) {
                try { await oidcRefresh(s); } catch (e) { /* a 401 will route to login */ }
            }
        }
        req.zacSession = s ? Object.assign({ sid: sid }, s) : null;
        req.zacCtrlId = controllerIdForPath(req.path); // capture before pathRewrite strips the prefix
        const method = req.method.toUpperCase();
        const safe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
        if (!safe && s && !csrfOk(req, s)) { res.status(403).json({ error: 'CSRF validation failed' }); return; }
        next();
    });
}

// Deprecated legacy /api/* compatibility layer (on by default; set ZAC_LEGACY_API=false to disable).
if (`${process.env.ZAC_LEGACY_API}`.toLowerCase() !== 'false') {
    mountLegacyApi(app, {
        controllers, controllersById, defaultController, getSession, createSession,
        authenticateUpstream, httpRequest, clearCookie, SID_COOKIE, sessions,
        persistSessions, looksLikeJwt, MGMT_PREFIX, trimTrailingSlash, normUrl,
    });
}

// ---- Reverse proxy (before static, so API paths never hit the SPA) --------
app.use(createProxyMiddleware({
    target: defaultController.url,
    changeOrigin: true,
    secure,
    ws: true,
    pathFilter: isApiPath,
    router: function(req) { return controllerForPath((req.url || '').split('?')[0]).url; },
    pathRewrite: function(p) { return stripControllerPrefix(p); },
    on: {
        proxyReq(proxyReq, req) {
            // Inject the server-held token, but only for the controller this session authenticated against.
            if (req.zacSession && req.zacSession.controllerId === req.zacCtrlId) {
                const t = req.zacSession.token;
                if (looksLikeJwt(t)) proxyReq.setHeader('Authorization', 'Bearer ' + t);
                else proxyReq.setHeader('zt-session', t);
            }
        },
        error(err, req, res) {
            console.error('Proxy error for ' + req.method + ' ' + req.url + ': ' + err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Controller not reachable: ' + err.message }));
            }
        },
    },
}));

// ---- Static SPA -----------------------------------------------------------
const distDir = path.join(__dirname, 'dist', 'app-ziti-console');
const indexPath = path.join(distDir, 'index.html');

// Inject the runtime signal the SPA reads at bootstrap (server-side session transport).
let indexHtml = null;
try {
    indexHtml = fs.readFileSync(indexPath, 'utf8');
    const meta = '<meta name="zac-auth-mode" content="proxy-session">';
    indexHtml = indexHtml.indexOf('</head>') > -1
        ? indexHtml.replace('</head>', '    ' + meta + '\n</head>')
        : meta + indexHtml;
} catch (e) {
    console.error('Could not read index.html (' + indexPath + '): ' + e.message);
}

app.use(express.static(distDir, { index: false }));

// SPA fallback (Express 5 no longer accepts the bare '*' path).
app.get(/.*/, function(req, res) {
    if (indexHtml != null) res.type('html').send(indexHtml);
    else res.sendFile(indexPath);
});

// ---- Listen ----------------------------------------------------------------
const portTLS = process.env.PORTTLS || 8443;
const bindIP = process.env.BIND_IP || undefined;

loadSessions();
refreshIdpOrigins();
setInterval(refreshIdpOrigins, 5 * 60 * 1000).unref();

let maxAttempts = 100;
StartServer(port);
StartTlsServer();

function logBanner(where) {
    console.log('Ziti Admin Console (reverse-proxy) ' + where + ' (verify upstream TLS: ' + secure + ')');
    console.log('  -> controllers (' + controllers.length + '):');
    controllers.forEach(function(c) {
        console.log('       [' + c.id + '] ' + c.url + (c.default ? '  (default)' : '') + '  ->  /c/' + c.id);
    });
    console.log('  -> serving edge bundle from:   ' + distDir);
    console.log('  -> token held server-side (cookieSecure=' + cookieSecure + ')');
}

// Ziti service listener when zitified (no TCP port); else TCP with port-bump retry.
function StartServer(startupPort) {
    if (zitified) {
        app.listen(undefined, bindIP, function() {
            logBanner('listening for incoming Ziti connections on service "' + zitiServiceName + '"');
        });
        return;
    }
    app.listen(startupPort, bindIP, function() {
        logBanner('listening on port ' + startupPort);
    }).on('error', function(err) {
        if (err.code == 'EADDRINUSE') {
            maxAttempts--;
            console.log('Port ' + startupPort + ' in use, attempting ' + (startupPort + 1));
            startupPort++;
            if (maxAttempts > 0) StartServer(startupPort);
        } else {
            console.log('All ports in use ' + port + ' to ' + startupPort);
        }
    });
}

// HTTPS listener when a key + cert chain are present (zitified provides its own transport).
function StartTlsServer() {
    if (zitified) return;
    if (!fs.existsSync(tlsKeyPath) || !fs.existsSync(tlsCertPath)) {
        console.log('  -> TLS not configured (no key/cert at ' + tlsKeyPath + '); HTTP only.');
        return;
    }
    try {
        const options = {
            key: fs.readFileSync(tlsKeyPath),
            cert: fs.readFileSync(tlsCertPath),
        };
        https.createServer(options, app).listen(portTLS, bindIP, function() {
            console.log('  -> TLS (HTTPS) listening on port ' + portTLS);
        });
    } catch (err) {
        console.error('ERROR: could not initialize TLS: ' + err.message);
        throw err;
    }
}
