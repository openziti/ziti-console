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

// Model, validation and YAML emitter for an OpenZiti router config (`v: 3`).
// Key names follow router/env/config.go and the `ziti create config router` template.
// Unlike the controller model, an ingested document is edited in place, so anything the form does not
// manage (transport.ws tuning, forwarder.latencyProbeInterval, plugins, ...) survives a save untouched.

import {parse as parseYaml} from 'yaml';
import {
    ValidationIssue,
    checkEndpoint,
    checkHostPort,
    checkPath,
    dumpDocument,
    isObj,
    parseDuration,
} from './config-builder.model';

export type TunnelMode = 'tproxy' | 'host' | 'proxy';
export type ConfigKind = 'controller' | 'router';

export interface RouterConfig {
    /** Parsed source document when a file was ingested. */
    base?: any;
    /** The source listed controllers under `ctrl.endpoints` rather than the single `ctrl.endpoint`. */
    ctrlList: boolean;
    /** The source kept its CSR at top level (fabric-only template) instead of under `edge`. */
    csrTop: boolean;
    identity: { cert: string; serverCert: string; key: string; ca: string };
    ctrl: { endpoints: string[]; endpointsFile: string };
    link: {
        dial: boolean;
        listen: boolean;
        bind: string;
        advertise: string;
        outQueueSize: number | null;
        /** `groups` on the transport dialer: only dial listeners that share a group. */
        dialGroups: string[];
        /** `groups` on the transport listener: the groups this listener belongs to. */
        listenGroups: string[];
    };
    edge: {
        enabled: boolean;
        address: string;
        advertise: string;
        connectTimeoutMs: number | null;
        getSessionTimeout: number | null;
    };
    /** Bindings of listeners the form does not model (e.g. edge_wss, proxy). Kept as-is on save. */
    otherListeners: string[];
    tunnel: { enabled: boolean; mode: TunnelMode; resolver: string; lanIf: string; dnsSvcIpRange: string };
    csr: {
        country: string;
        province: string;
        locality: string;
        organization: string;
        organizationalUnit: string;
        dns: string[];
        ip: string[];
    };
    forwarder: {
        xgressDialQueueLength: number | null;
        xgressDialWorkerCount: number | null;
        linkDialQueueLength: number | null;
        linkDialWorkerCount: number | null;
    };
    metrics: { reportInterval: string; messageQueueSize: number | null };
    health: {
        ctrlPingInterval: string;
        ctrlPingTimeout: string;
        ctrlPingInitialDelay: string;
        minLinks: number | null;
    };
}

export const TUNNEL_MODES: { id: TunnelMode; label: string; hint: string }[] = [
    {id: 'tproxy', label: 'tproxy', hint: 'Intercept traffic for services on this host (Linux). Needs root or CAP_NET_ADMIN.'},
    {id: 'host', label: 'host', hint: 'Host services: dial out to servers reachable from this router.'},
    {id: 'proxy', label: 'proxy', hint: 'Listen on explicit local ports for services.'},
];

export function defaultRouterConfig(): RouterConfig {
    return {
        ctrlList: false,
        csrTop: false,
        identity: {
            cert: './pki/router/certs/client.cert',
            serverCert: './pki/router/certs/server.cert',
            key: './pki/router/keys/server.key',
            ca: './pki/router/cas.cert',
        },
        ctrl: {endpoints: ['tls:ctrl.example.com:6262'], endpointsFile: './endpoints.yml'},
        link: {dial: true, listen: true, bind: 'tls:0.0.0.0:10080', advertise: 'tls:router.example.com:10080',
            outQueueSize: null, dialGroups: [], listenGroups: []},
        edge: {enabled: true, address: 'tls:0.0.0.0:3022', advertise: 'router.example.com:3022',
            connectTimeoutMs: null, getSessionTimeout: null},
        otherListeners: [],
        tunnel: {enabled: false, mode: 'host', resolver: '', lanIf: '', dnsSvcIpRange: ''},
        csr: {country: 'US', province: 'NC', locality: 'Charlotte', organization: 'NetFoundry',
            organizationalUnit: 'Ziti', dns: ['localhost', 'router.example.com'], ip: ['127.0.0.1', '::1']},
        forwarder: {xgressDialQueueLength: null, xgressDialWorkerCount: null, linkDialQueueLength: null,
            linkDialWorkerCount: null},
        metrics: {reportInterval: '', messageQueueSize: null},
        health: {ctrlPingInterval: '', ctrlPingTimeout: '', ctrlPingInitialDelay: '', minLinks: null},
    };
}

// ---- detection ---------------------------------------------------------------------------------

/**
 * Decide whether a parsed config belongs to a controller or a router.
 * Both use `v: 3`, `identity` and `ctrl`, so the call rests on keys only one of them has.
 */
export function detectKind(doc: any): ConfigKind | 'unknown' {
    if (!isObj(doc)) {
        return 'unknown';
    }
    const has = (k: string) => k in doc;
    let controller = 0;
    let router = 0;
    ['db', 'cluster', 'web', 'network', 'events', 'trustDomain', 'healthChecks'].forEach(k => has(k) && controller++);
    if (isObj(doc.edge) && (doc.edge.api || doc.edge.enrollment)) {
        controller += 2;
    }
    if (isObj(doc.ctrl) && doc.ctrl.listener) {
        controller += 2;
    }
    ['link', 'listeners', 'forwarder', 'csr', 'dialers'].forEach(k => has(k) && router++);
    if (isObj(doc.edge) && doc.edge.csr) {
        router += 2;
    }
    if (isObj(doc.ctrl) && (doc.ctrl.endpoint || doc.ctrl.endpoints || doc.ctrl.endpointsFile)) {
        router += 2;
    }
    if (controller === router) {
        return 'unknown';
    }
    return controller > router ? 'controller' : 'router';
}

// ---- validation --------------------------------------------------------------------------------

const ENV_REF = /\$\{[^}]+\}/;
const HOSTNAME = /^[A-Za-z0-9]([A-Za-z0-9_.-]*[A-Za-z0-9])?$/;
const IP = /^(\d{1,3}(\.\d{1,3}){3}|[0-9A-Fa-f:]+:[0-9A-Fa-f:.]*)$/;
const CIDR = /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/;

export function validateRouter(c: RouterConfig): ValidationIssue[] {
    const out: ValidationIssue[] = [];
    const err = (section: string, message: string, field?: string) =>
        out.push({section, level: 'error', message, field});
    const warn = (section: string, message: string, field?: string) =>
        out.push({section, level: 'warn', message, field});
    const path = (section: string, label: string, v: string, field: string, required = true) => {
        if (!v) {
            if (required) {
                err(section, `${label} is required`, field);
            }
            return;
        }
        const p = checkPath(v);
        if (p) {
            err(section, `${label} ${p}`, field);
        }
    };
    const optInt = (section: string, label: string, v: number | null, min: number, max: number, field: string) => {
        if (v === null || v === undefined) {
            return;
        }
        if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
            err(section, `${label} must be a whole number from ${min} to ${max}`, field);
        }
    };
    const optDuration = (section: string, label: string, v: string, field: string) => {
        if (v && isNaN(parseDuration(v))) {
            err(section, `${label} is not a valid duration (try 30s, 5m)`, field);
        }
    };

    path('r-identity', 'identity.cert', c.identity.cert, 'identity.cert');
    path('r-identity', 'identity.server_cert', c.identity.serverCert, 'identity.serverCert', false);
    path('r-identity', 'identity.key', c.identity.key, 'identity.key');
    path('r-identity', 'identity.ca', c.identity.ca, 'identity.ca');

    // controller connection
    const eps = c.ctrl.endpoints.filter(e => e !== '');
    if (!eps.length && !c.ctrl.endpointsFile) {
        err('r-ctrl', 'give at least one controller endpoint or an endpoints file');
    }
    c.ctrl.endpoints.forEach((e, i) => {
        if (!e) {
            err('r-ctrl', `controller endpoint ${i + 1} is empty`);
            return;
        }
        const p = checkEndpoint(e);
        if (p) {
            err('r-ctrl', `controller endpoint ${i + 1} ${p}`);
        } else if (!ENV_REF.test(e) && !e.startsWith('tls:')) {
            warn('r-ctrl', `controller endpoint ${i + 1}: controllers normally listen on tls:`);
        }
    });
    if (new Set(eps).size !== eps.length) {
        err('r-ctrl', 'the same controller endpoint is listed twice');
    }
    path('r-ctrl', 'endpoints file', c.ctrl.endpointsFile, 'ctrl.endpointsFile', false);

    // links
    if (c.link.listen) {
        const b = checkEndpoint(c.link.bind);
        if (!c.link.bind) {
            err('r-link', 'link listener bind address is required', 'link.bind');
        } else if (b) {
            err('r-link', `link listener bind ${b}`, 'link.bind');
        }
        if (!c.link.advertise) {
            err('r-link', 'link listener advertise address is required: other routers dial it', 'link.advertise');
        } else {
            const a = checkEndpoint(c.link.advertise);
            if (a) {
                err('r-link', `link listener advertise ${a}`, 'link.advertise');
            }
        }
        optInt('r-link', 'outQueueSize', c.link.outQueueSize, 1, 1000000, 'link.outQueueSize');
    }
    if (!c.link.listen && !c.link.dial) {
        warn('r-link', 'with neither a link dialer nor a link listener this router cannot form links');
    }

    // edge and tunnel
    if (c.edge.enabled) {
        if (!c.edge.address) {
            err('r-edge', 'edge listener address is required', 'edge.address');
        } else if (!ENV_REF.test(c.edge.address)) {
            const scheme = c.edge.address.split(':')[0];
            if (scheme !== 'tls' && scheme !== 'wss') {
                err('r-edge', 'edge listener address must start with tls: or wss:', 'edge.address');
            } else {
                const p = checkEndpoint(c.edge.address);
                if (p) {
                    err('r-edge', `edge listener address ${p}`, 'edge.address');
                }
            }
        }
        if (!c.edge.advertise) {
            err('r-edge', 'edge advertise is required: SDKs connect to it', 'edge.advertise');
        } else {
            const p = checkHostPort(c.edge.advertise);
            if (p) {
                err('r-edge', `edge advertise ${p}`, 'edge.advertise');
            }
        }
        optInt('r-edge', 'connectTimeoutMs', c.edge.connectTimeoutMs, 1, 600000, 'edge.connectTimeoutMs');
        optInt('r-edge', 'getSessionTimeout', c.edge.getSessionTimeout, 1, 3600, 'edge.getSessionTimeout');
    }
    if (c.tunnel.enabled) {
        if (c.tunnel.mode === 'tproxy' && c.tunnel.resolver && !ENV_REF.test(c.tunnel.resolver) &&
            !/^(udp|tcp):\/\/.+:\d+$/.test(c.tunnel.resolver)) {
            err('r-edge', 'resolver must look like udp://100.64.0.1:53', 'tunnel.resolver');
        }
        if (c.tunnel.dnsSvcIpRange && !ENV_REF.test(c.tunnel.dnsSvcIpRange) && !CIDR.test(c.tunnel.dnsSvcIpRange)) {
            err('r-edge', 'dnsSvcIpRange must be a CIDR such as 100.64.0.1/10', 'tunnel.dnsSvcIpRange');
        }
        if (c.tunnel.lanIf && !/^[A-Za-z0-9_.:-]+$/.test(c.tunnel.lanIf)) {
            err('r-edge', 'lanIf must be an interface name', 'tunnel.lanIf');
        }
    }
    if (!c.edge.enabled && !c.tunnel.enabled && !c.otherListeners.some(b => /^(edge|tunnel)/.test(b))) {
        warn('r-edge', 'no edge or tunnel listener: SDKs and tunnelers cannot use this as an edge router');
    }

    // CSR
    if (c.edge.enabled || c.tunnel.enabled) {
        if (c.csr.country && !/^[A-Za-z]{2}$/.test(c.csr.country)) {
            err('r-csr', 'country must be a two-letter code', 'csr.country');
        }
        c.csr.dns.forEach((d, i) => {
            if (!d || (!ENV_REF.test(d) && !HOSTNAME.test(d))) {
                err('r-csr', `DNS SAN ${i + 1} is not a valid hostname`);
            }
        });
        c.csr.ip.forEach((ip, i) => {
            if (!ip || (!ENV_REF.test(ip) && !(IP.test(ip) && ip.split('.').every(p => !/^\d+$/.test(p) || +p <= 255)))) {
                err('r-csr', `IP SAN ${i + 1} is not a valid address`);
            }
        });
        if (!c.csr.dns.length && !c.csr.ip.length) {
            warn('r-csr', 'no SANs: clients cannot verify this router by name or address');
        }
    }

    // advanced
    const f = c.forwarder;
    optInt('r-advanced', 'xgressDialQueueLength', f.xgressDialQueueLength, 1, 1000000, 'forwarder.xgressDialQueueLength');
    optInt('r-advanced', 'xgressDialWorkerCount', f.xgressDialWorkerCount, 1, 100000, 'forwarder.xgressDialWorkerCount');
    optInt('r-advanced', 'linkDialQueueLength', f.linkDialQueueLength, 1, 1000000, 'forwarder.linkDialQueueLength');
    optInt('r-advanced', 'linkDialWorkerCount', f.linkDialWorkerCount, 1, 100000, 'forwarder.linkDialWorkerCount');
    optDuration('r-advanced', 'metrics reportInterval', c.metrics.reportInterval, 'metrics.reportInterval');
    optInt('r-advanced', 'metrics messageQueueSize', c.metrics.messageQueueSize, 1, 1000000, 'metrics.messageQueueSize');
    optDuration('r-advanced', 'ctrlPingCheck interval', c.health.ctrlPingInterval, 'health.ctrlPingInterval');
    optDuration('r-advanced', 'ctrlPingCheck timeout', c.health.ctrlPingTimeout, 'health.ctrlPingTimeout');
    optDuration('r-advanced', 'ctrlPingCheck initialDelay', c.health.ctrlPingInitialDelay, 'health.ctrlPingInitialDelay');
    optInt('r-advanced', 'linkCheck minLinks', c.health.minLinks, 0, 1000, 'health.minLinks');
    return out;
}

// ---- document building -------------------------------------------------------------------------

const clone = (v: any) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** Set `obj[key]`, or remove it when the value is empty. */
function setOrDel(obj: any, key: string, value: any) {
    if (value === '' || value === null || value === undefined) {
        delete obj[key];
    } else {
        obj[key] = value;
    }
}

/** Trimmed, non-empty entries, or '' (so `setOrDel` drops the key) when none are left. */
function cleanList(list: string[]): string[] | '' {
    const out = list.map(x => x.trim()).filter(x => x !== '');
    return out.length ? out : '';
}

/** Find the entry with `binding` in a list, or add one, and return it; null removes it. */
function upsertBinding(list: any[], binding: string, enabled: boolean): any | null {
    const i = list.findIndex(x => isObj(x) && x.binding === binding);
    if (!enabled) {
        if (i >= 0) {
            list.splice(i, 1);
        }
        return null;
    }
    if (i >= 0) {
        return list[i];
    }
    const entry = {binding};
    list.push(entry);
    return entry;
}

function prune(obj: any, key: string) {
    if (isObj(obj[key]) && !Object.keys(obj[key]).length) {
        delete obj[key];
    }
    if (Array.isArray(obj[key]) && !obj[key].length) {
        delete obj[key];
    }
}

export function buildRouterDocument(c: RouterConfig): any {
    const doc: any = c.base ? clone(c.base) : {};
    if (doc.v === undefined) {
        doc.v = 3;
    }

    // identity
    doc.identity = isObj(doc.identity) ? doc.identity : {};
    doc.identity.cert = c.identity.cert;
    setOrDel(doc.identity, 'server_cert', c.identity.serverCert);
    doc.identity.key = c.identity.key;
    doc.identity.ca = c.identity.ca;

    // ctrl: one controller reads naturally as `endpoint`, several need `endpoints`
    doc.ctrl = isObj(doc.ctrl) ? doc.ctrl : {};
    const eps = c.ctrl.endpoints.filter(e => e !== '');
    delete doc.ctrl.endpoint;
    delete doc.ctrl.endpoints;
    if (eps.length === 1 && !c.ctrlList) {
        doc.ctrl.endpoint = eps[0];
    } else if (eps.length) {
        doc.ctrl.endpoints = eps;
    }
    setOrDel(doc.ctrl, 'endpointsFile', c.ctrl.endpointsFile);

    // link
    const link: any = isObj(doc.link) ? doc.link : {};
    const dialers: any[] = Array.isArray(link.dialers) ? link.dialers : [];
    const lListeners: any[] = Array.isArray(link.listeners) ? link.listeners : [];
    const dl = upsertBinding(dialers, 'transport', c.link.dial);
    if (dl) {
        setOrDel(dl, 'groups', cleanList(c.link.dialGroups));
    }
    const ll = upsertBinding(lListeners, 'transport', c.link.listen);
    if (ll) {
        setOrDel(ll, 'groups', cleanList(c.link.listenGroups));
        ll.bind = c.link.bind;
        ll.advertise = c.link.advertise;
        ll.options = isObj(ll.options) ? ll.options : {};
        setOrDel(ll.options, 'outQueueSize', c.link.outQueueSize);
        prune(ll, 'options');
    }
    link.dialers = dialers;
    link.listeners = lListeners;
    prune(link, 'dialers');
    prune(link, 'listeners');
    doc.link = link;
    prune(doc, 'link');

    // edge + tunnel listeners
    const listeners: any[] = Array.isArray(doc.listeners) ? doc.listeners : [];
    const el = upsertBinding(listeners, 'edge', c.edge.enabled);
    if (el) {
        el.address = c.edge.address;
        el.options = isObj(el.options) ? el.options : {};
        el.options.advertise = c.edge.advertise;
        setOrDel(el.options, 'connectTimeoutMs', c.edge.connectTimeoutMs);
        setOrDel(el.options, 'getSessionTimeout', c.edge.getSessionTimeout);
    }
    const tl = upsertBinding(listeners, 'tunnel', c.tunnel.enabled);
    if (tl) {
        tl.options = isObj(tl.options) ? tl.options : {};
        tl.options.mode = c.tunnel.mode;
        const tproxy = c.tunnel.mode === 'tproxy';
        setOrDel(tl.options, 'resolver', tproxy ? c.tunnel.resolver : '');
        setOrDel(tl.options, 'lanIf', tproxy ? c.tunnel.lanIf : '');
        setOrDel(tl.options, 'dnsSvcIpRange', tproxy ? c.tunnel.dnsSvcIpRange : '');
    }
    doc.listeners = listeners;
    prune(doc, 'listeners');

    // CSR lives under `edge` (the fabric-only template keeps it at top level)
    const wantCsr = c.edge.enabled || c.tunnel.enabled;
    const holder: any = c.csrTop ? doc : (doc.edge = isObj(doc.edge) ? doc.edge : {});
    if (wantCsr) {
        const csr: any = isObj(holder.csr) ? holder.csr : {};
        setOrDel(csr, 'country', c.csr.country);
        setOrDel(csr, 'province', c.csr.province);
        setOrDel(csr, 'locality', c.csr.locality);
        setOrDel(csr, 'organization', c.csr.organization);
        setOrDel(csr, 'organizationalUnit', c.csr.organizationalUnit);
        csr.sans = isObj(csr.sans) ? csr.sans : {};
        setOrDel(csr.sans, 'dns', c.csr.dns.length ? c.csr.dns : '');
        setOrDel(csr.sans, 'ip', c.csr.ip.length ? c.csr.ip : '');
        prune(csr, 'sans');
        holder.csr = csr;
    }
    // with no form-managed listener, any CSR in the source belongs to a listener the form does not model: keep it
    if (!c.csrTop) {
        prune(doc, 'edge');
    }

    // advanced
    const fwd: any = isObj(doc.forwarder) ? doc.forwarder : {};
    setOrDel(fwd, 'xgressDialQueueLength', c.forwarder.xgressDialQueueLength);
    setOrDel(fwd, 'xgressDialWorkerCount', c.forwarder.xgressDialWorkerCount);
    setOrDel(fwd, 'linkDialQueueLength', c.forwarder.linkDialQueueLength);
    setOrDel(fwd, 'linkDialWorkerCount', c.forwarder.linkDialWorkerCount);
    doc.forwarder = fwd;
    prune(doc, 'forwarder');

    const met: any = isObj(doc.metrics) ? doc.metrics : {};
    setOrDel(met, 'reportInterval', c.metrics.reportInterval);
    setOrDel(met, 'messageQueueSize', c.metrics.messageQueueSize);
    doc.metrics = met;
    prune(doc, 'metrics');

    const hc: any = isObj(doc.healthChecks) ? doc.healthChecks : {};
    const ping: any = isObj(hc.ctrlPingCheck) ? hc.ctrlPingCheck : {};
    setOrDel(ping, 'interval', c.health.ctrlPingInterval);
    setOrDel(ping, 'timeout', c.health.ctrlPingTimeout);
    setOrDel(ping, 'initialDelay', c.health.ctrlPingInitialDelay);
    hc.ctrlPingCheck = ping;
    prune(hc, 'ctrlPingCheck');
    const lc: any = isObj(hc.linkCheck) ? hc.linkCheck : {};
    setOrDel(lc, 'minLinks', c.health.minLinks);
    hc.linkCheck = lc;
    prune(hc, 'linkCheck');
    doc.healthChecks = hc;
    prune(doc, 'healthChecks');

    // fresh documents keep a readable section order
    if (!c.base) {
        const order = ['v', 'identity', 'ctrl', 'link', 'listeners', 'edge', 'csr', 'forwarder', 'metrics', 'healthChecks'];
        const sorted: any = {};
        order.forEach(k => k in doc && (sorted[k] = doc[k]));
        Object.keys(doc).forEach(k => k in sorted || (sorted[k] = doc[k]));
        return sorted;
    }
    return doc;
}

export function routerToYaml(c: RouterConfig): string {
    return dumpDocument(buildRouterDocument(c), [
        '# OpenZiti router configuration',
        '# Generated by ZAC Config Builder. Review before use; ${ENV_VARS} are expanded by the router.',
    ]);
}

// ---- ingest ------------------------------------------------------------------------------------

export function routerFromDocument(doc: any): { cfg: RouterConfig; warnings: string[] } {
    const warnings: string[] = [];
    if (doc.v !== 3) {
        warnings.push(`config version is ${doc.v ?? 'missing'}; routers expect v: 3`);
    }
    const c = defaultRouterConfig();
    c.base = doc;
    const s = (v: any, def = '') => (v === undefined || v === null ? def : String(v));
    const n = (v: any): number | null => (typeof v === 'number' ? v : null);
    const strs = (v: any): string[] => (Array.isArray(v) ? v.map(x => String(x)) : []);

    const id = doc.identity || {};
    c.identity = {cert: s(id.cert), serverCert: s(id.server_cert), key: s(id.key), ca: s(id.ca)};

    const ctrl = doc.ctrl || {};
    c.ctrlList = Array.isArray(ctrl.endpoints);
    c.ctrl = {
        endpoints: c.ctrlList ? strs(ctrl.endpoints) : (ctrl.endpoint ? [s(ctrl.endpoint)] : []),
        endpointsFile: s(ctrl.endpointsFile),
    };

    const link = doc.link || {};
    const find = (list: any, binding: string) =>
        (Array.isArray(list) ? list : []).find((x: any) => isObj(x) && x.binding === binding);
    const ll = find(link.listeners, 'transport');
    const dl = find(link.dialers, 'transport');
    c.link = {
        dial: !!dl,
        dialGroups: strs(dl?.groups),
        listenGroups: strs(ll?.groups),
        listen: !!ll,
        bind: s(ll?.bind),
        advertise: s(ll?.advertise),
        outQueueSize: n(ll?.options?.outQueueSize),
    };
    if (Array.isArray(link.dialers) && link.dialers.some((d: any) => d?.binding !== 'transport')) {
        warnings.push('kept non-transport link dialers as-is');
    }

    const el = find(doc.listeners, 'edge');
    const eo = el?.options || {};
    c.edge = {
        enabled: !!el,
        address: s(el?.address),
        advertise: s(eo.advertise),
        connectTimeoutMs: n(eo.connectTimeoutMs),
        getSessionTimeout: n(eo.getSessionTimeout),
    };
    const tl = find(doc.listeners, 'tunnel');
    const to = tl?.options || {};
    c.tunnel = {
        enabled: !!tl,
        mode: ['tproxy', 'host', 'proxy'].includes(to.mode) ? to.mode : 'tproxy',
        resolver: s(to.resolver),
        lanIf: s(to.lanIf),
        dnsSvcIpRange: s(to.dnsSvcIpRange),
    };
    const others = (Array.isArray(doc.listeners) ? doc.listeners : [])
        .filter((x: any) => x?.binding !== 'edge' && x?.binding !== 'tunnel').map((x: any) => x?.binding);
    c.otherListeners = others.map(String);
    if (others.length) {
        warnings.push(`kept other listeners as-is: ${others.join(', ')}`);
    }

    c.csrTop = !isObj(doc.edge?.csr) && isObj(doc.csr);
    const csr = (c.csrTop ? doc.csr : doc.edge?.csr) || {};
    c.csr = {
        country: s(csr.country), province: s(csr.province), locality: s(csr.locality),
        organization: s(csr.organization), organizationalUnit: s(csr.organizationalUnit),
        dns: strs(csr.sans?.dns), ip: strs(csr.sans?.ip),
    };

    const f = doc.forwarder || {};
    c.forwarder = {
        xgressDialQueueLength: n(f.xgressDialQueueLength),
        xgressDialWorkerCount: n(f.xgressDialWorkerCount),
        linkDialQueueLength: n(f.linkDialQueueLength),
        linkDialWorkerCount: n(f.linkDialWorkerCount),
    };
    c.metrics = {reportInterval: s(doc.metrics?.reportInterval), messageQueueSize: n(doc.metrics?.messageQueueSize)};
    c.health = {
        ctrlPingInterval: s(doc.healthChecks?.ctrlPingCheck?.interval),
        ctrlPingTimeout: s(doc.healthChecks?.ctrlPingCheck?.timeout),
        ctrlPingInitialDelay: s(doc.healthChecks?.ctrlPingCheck?.initialDelay),
        minLinks: n(doc.healthChecks?.linkCheck?.minLinks),
    };

    const managed = ['v', 'identity', 'ctrl', 'link', 'listeners', 'edge', 'csr', 'forwarder', 'metrics', 'healthChecks'];
    const extra = Object.keys(doc).filter(k => !managed.includes(k));
    if (extra.length) {
        warnings.push(`passing through untouched: ${extra.join(', ')}`);
    }
    return {cfg: c, warnings};
}

export function parseConfigText(text: string): any {
    const doc = parseYaml(text);
    if (!isObj(doc)) {
        throw new Error('The file is not a YAML mapping');
    }
    return doc;
}
