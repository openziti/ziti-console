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
 * Deprecated compatibility layer: maps the legacy /api/* endpoints onto the edge API
 * so existing consumers can migrate. On by default; set ZAC_LEGACY_API=false to disable.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let zacVersion = '';
try { zacVersion = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version; } catch (e) {}

// Recursively drop empty strings / arrays / objects from a save payload (matches the node-api server).
function redefine(obj) {
    for (const prop in obj) {
        const v = obj[prop];
        if (Array.isArray(v) && v.length === 0) delete obj[prop];
        else if (typeof v === 'string' && v.trim().length === 0) delete obj[prop];
        else if (v && typeof v === 'object') {
            obj[prop] = redefine(v);
            if (Object.keys(obj[prop]).length === 0) delete obj[prop];
        }
    }
    return obj;
}

function errorBody(err) {
    const e = err || {};
    const msg = (e.cause && (e.causeMessage || (e.cause.message) || (e.cause.reason)))
        || e.message || (typeof e === 'string' ? e : 'Error');
    return { error: msg, errorObj: err };
}

// deps are the shared session/proxy helpers from server.js (destructured below).
export function mountLegacyApi(app, deps) {
    const { controllers, controllersById, defaultController, getSession, createSession,
        authenticateUpstream, httpRequest, clearCookie, SID_COOKIE, sessions,
        persistSessions, looksLikeJwt, MGMT_PREFIX, trimTrailingSlash, normUrl } = deps;

    const json = express.json();

    console.log('  -> DEPRECATED legacy /api/* compatibility layer ENABLED (will be removed)');

    // Flag every legacy response so consumers notice the deprecation.
    app.use('/api', function(req, res, next) {
        res.setHeader('X-ZAC-Deprecated', 'The /api/* interface is deprecated; use /edge/management/v1 directly.');
        next();
    });

    function authHeaders(s) {
        return looksLikeJwt(s.token) ? { Authorization: 'Bearer ' + s.token } : { 'zt-session': s.token };
    }
    function ctrlOf(s) { return controllersById[s.controllerId] || defaultController; }

    // Edge management call for an authenticated session; returns {status, body, raw}.
    async function edge(s, method, pathAndQuery, body) {
        const url = ctrlOf(s).url + MGMT_PREFIX + '/' + String(pathAndQuery).replace(/^\//, '');
        const opts = { method: method || 'GET', headers: Object.assign({ Accept: 'application/json' }, authHeaders(s)) };
        if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        const r = await httpRequest(url, opts);
        let parsed = null;
        try { parsed = JSON.parse(r.body); } catch (e) { /* non-JSON */ }
        return { status: r.status, body: parsed, raw: r.body };
    }

    // Build the edge query string from the node-api paging params (lifted verbatim).
    function buildUrlFilter(paging) {
        let urlFilter = '', toSearchOn = 'name', noSearch = false;
        if (paging && paging.sort != null) {
            if (paging.searchOn) toSearchOn = paging.searchOn;
            if (paging.noSearch) noSearch = true;
            if (!paging.filter) paging.filter = '';
            if (!paging.rawFilter) paging.filter = paging.filter.split('#').join('');
            if (noSearch) {
                if (paging.page != -1) urlFilter = '?limit=' + paging.total + '&offset=' + ((paging.page - 1) * paging.total);
            } else if (paging.rawFilter) {
                urlFilter = '?filter=' + paging.filter.trim();
                if (paging.total) urlFilter += '&limit=' + paging.total;
                if (paging.page) urlFilter += '&offset=' + ((paging.page - 1) * paging.total);
                if (paging.sort) urlFilter += '&sort=' + encodeURIComponent(paging.sort) + ' ' + encodeURIComponent(paging.order);
            } else if (paging.page != -1) {
                urlFilter = '?filter=(' + encodeURIComponent(toSearchOn) + ' contains "' + encodeURIComponent(paging.filter) + '")&limit=' +
                    paging.total + '&offset=' + ((paging.page - 1) * paging.total) + '&sort=' + encodeURIComponent(paging.sort) + ' ' + encodeURIComponent(paging.order);
            }
            if (!noSearch && paging.params) {
                for (const key in paging.params) {
                    urlFilter += (urlFilter.length === 0 ? '?' : '&') + encodeURIComponent(key) + '=' + encodeURIComponent(paging.params[key]);
                }
            }
        }
        return urlFilter;
    }

    function matchController(url) {
        const want = trimTrailingSlash(normUrl(url));
        return controllers.find(function(c) { return trimTrailingSlash(c.url) === want; });
    }

    function requireSession(req, res) {
        const s = getSession(req);
        if (!s) { res.json({ error: 'loggedout' }); return null; }
        return s;
    }

    // ---- Auth ---------------------------------------------------------------
    app.post('/api/login', json, function(req, res) {
        const b = req.body || {};
        const ctrl = matchController(b.url);
        if (!ctrl) { res.json({ error: 'Invalid Edge Controller' }); return; }
        const type = b.token ? 'ext-jwt' : 'password';
        const authBody = type === 'ext-jwt' ? {} : { username: b.username, password: b.password };
        authenticateUpstream(ctrl.url, type, authBody, b.token, function(err, status, parsed) {
            if (err) { res.json({ error: err.code || 'Server Not Accessible' }); return; }
            const token = parsed && parsed.data && parsed.data.token;
            if (!token) { res.json({ error: (parsed && parsed.error && parsed.error.message) || 'Invalid Account' }); return; }
            createSession(res, { token: token, kind: 'legacy', controllerId: ctrl.id });
            res.json({ success: 'Logged In' });
        });
    });

    app.post('/api/logout', function(req, res) {
        const s = getSession(req);
        if (s) { sessions.delete(s.sid); persistSessions(); }
        res.setHeader('Set-Cookie', [clearCookie(SID_COOKIE, true)]);
        res.send({ success: true, message: 'Logout Successful' });
    });

    app.post('/api/version', json, async function(req, res) {
        const s = getSession(req);
        const ctrl = s ? ctrlOf(s) : (matchController((req.body || {}).url) || defaultController);
        try {
            const r = await httpRequest(ctrl.url + '/version');
            const d = JSON.parse(r.body);
            res.json({ data: d.data, serviceUrl: MGMT_PREFIX, zac: zacVersion, requireAuth: true, baseUrl: ctrl.url });
        } catch (e) { res.json({ zac: zacVersion }); }
    });

    // ---- Read ---------------------------------------------------------------
    app.post('/api/data', json, async function(req, res) {
        const b = req.body || {};
        if (b.useClient) {
            // Pre-login public fetch - only external-jwt-signers, numeric paging.
            if (b.type !== 'external-jwt-signers') { res.json({ data: [], error: 'unsupported type' }); return; }
            const ctrl = matchController(b.controllerUrl) || defaultController;
            const limit = parseInt((b.paging && b.paging.total) || 100, 10) || 100;
            const page = parseInt((b.paging && b.paging.page) || 1, 10) || 1;
            try {
                const r = await httpRequest(ctrl.url + '/edge/client/v1/external-jwt-signers?limit=' + limit + '&offset=' + ((page - 1) * limit) + '&sort=name%20asc');
                res.json(JSON.parse(r.body) || { data: [] });
            } catch (e) { res.json({ data: [], error: errorBody(e).error }); }
            return;
        }
        const s = requireSession(req, res); if (!s) return;
        try {
            if (b.url) { // sub-resource by link
                const r = await edge(s, 'GET', String(b.url).split('./').join(''));
                res.json({ id: '', parent: '', type: b.type, data: r.body && r.body.data });
                return;
            }
            const r = await edge(s, 'GET', b.type + buildUrlFilter(b.paging));
            if (r.body && r.body.error) res.json(errorBody(r.body.error));
            else res.json(r.body || { data: [] });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/subdata', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        try {
            const r = await edge(s, 'GET', String(req.body.url).split('./').join(''));
            res.json({ id: req.body.id, parent: req.body.name, type: req.body.type, data: r.body && r.body.data });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/dataSubs', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        if (!req.body.url) { res.json({ error: 'Invalid Sub Data Url' }); return; }
        try {
            const url = String(req.body.url.href).split('./').join('');
            const r = await edge(s, 'GET', url + '?limit=99999999&offset=0&sort=name ASC');
            if (r.body && r.body.error) res.json(errorBody(r.body.error));
            else res.json({ id: req.body.id, type: req.body.type, data: r.body && r.body.data });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/call', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        try {
            const r = await edge(s, 'GET', String(req.body.url));
            if (r.body && r.body.error) res.json(errorBody(r.body.error));
            else res.json(r.body && r.body.data ? r.body : { data: [] });
        } catch (e) { res.json(errorBody(e)); }
    });

    // ---- Write --------------------------------------------------------------
    app.post('/api/dataSave', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        const b = req.body || {};
        const type = b.type;
        const id = b.id && b.id.trim();
        const method = id ? 'PATCH' : 'POST';
        const saveParams = b.save || {};
        if (saveParams.data) saveParams.data = redefine(saveParams.data);
        try {
            // Removals on an existing object (association lists).
            if (id && b.removal) {
                for (const [assoc, ids] of Object.entries(b.removal)) {
                    await edge(s, 'DELETE', type + '/' + id + '/' + assoc, { ids: ids });
                }
            }
            const saved = await edge(s, method, type + (id ? '/' + id : ''), saveParams);
            if (saved.body && saved.body.error) { res.json(errorBody(saved.body.error)); return; }
            if (!saved.body || !saved.body.data) { res.json({ error: 'Unable to save data' }); return; }
            const newId = method === 'POST' ? saved.body.data.id : id;
            // Additional associations (PUT lists onto the object).
            if (b.additional) {
                for (const [assoc, ids] of Object.entries(b.additional)) {
                    await edge(s, 'PUT', type + '/' + newId + '/' + assoc, { ids: ids });
                }
            }
            if (b.chained) { res.json(saved.body.data); return; }
            const list = await edge(s, 'GET', type + buildUrlFilter(b.paging));
            res.json(list.body || { data: [] });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/subSave', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        const b = req.body || {};
        const fullType = b.parentType + '/' + b.id + '/' + b.type;
        try {
            await edge(s, b.doing, fullType, b.save);
            const list = await edge(s, 'GET', fullType);
            res.json(list.body || { data: [] });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/delete', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        const b = req.body || {};
        try {
            for (const id of (b.ids || [])) {
                const r = await edge(s, 'DELETE', b.type + '/' + id);
                if (r.body && r.body.error) { res.json(errorBody(r.body.error)); return; }
            }
            const list = await edge(s, 'GET', b.type + buildUrlFilter(b.paging));
            res.json(list.body || { data: [] });
        } catch (e) { res.json(errorBody(e)); }
    });

    // ---- Identity / enrollment / MFA ---------------------------------------
    app.post('/api/reset', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        const b = req.body || {};
        if (b.newpassword !== b.confirm) { res.json({ error: 'Password does not match confirmation' }); return; }
        try {
            const cur = await edge(s, 'GET', 'current-identity/authenticators?filter=method="updb"');
            const auth = cur.body && cur.body.data && cur.body.data[0];
            if (!auth) { res.json({ error: 'Unknown User' }); return; }
            const upd = await edge(s, 'PUT', 'current-identity/authenticators/' + auth.id,
                { currentPassword: b.password, password: b.newpassword, username: auth.username });
            if (upd.body && upd.body.error) res.json({ error: upd.body.error.message });
            else res.json({ success: 'Password Updated' });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/resetEnroll', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        try {
            const r = await edge(s, 'POST', 'authenticators/' + String(req.body.id).trim() + '/re-enroll',
                { expiresAt: new Date(req.body.date).toISOString() });
            if (r.body && r.body.error) res.json(errorBody(r.body.error));
            else res.json({ success: 'Enrollment Reset' });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.post('/api/reissueEnroll', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        try {
            const r = await edge(s, 'POST', 'enrollments/' + req.body.id + '/refresh',
                { expiresAt: new Date(req.body.date).toISOString() });
            if (r.body && r.body.error) res.json(errorBody(r.body.error));
            else res.json({ success: 'Enrollment Reissued' });
        } catch (e) { res.json(errorBody(e)); }
    });

    app.delete('/api/mfa', json, async function(req, res) {
        const s = requireSession(req, res); if (!s) return;
        try {
            const r = await edge(s, 'DELETE', 'identities/' + String(req.body.id).trim() + '/mfa');
            if (r.body && r.body.error) res.json(errorBody(r.body.error));
            else res.json({ success: 'MFA Removed' });
        } catch (e) { res.json(errorBody(e)); }
    });

    // ---- Settings -----------------------------------------------------------
    app.post('/api/settings', function(req, res) {
        res.json({
            edgeControllers: controllers.map(function(c) { return { name: c.name, url: c.url, default: !!c.default }; }),
            editable: false,
        });
    });
}
