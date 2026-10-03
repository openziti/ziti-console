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

// Model, defaults, validation and YAML emitter for an OpenZiti controller config (`v: 3`).
// Defaults and ranges mirror the controller source (controller/config, controller/network).
// Values equal to the controller default are omitted from the output unless `verbose` is set.

import {parse as parseYaml} from 'yaml';

export type DeployMode ='standalone' | 'ha';

/** An overlay bind point: the listener binds a Ziti service through an identity instead of a local interface. */
export interface BindPointIdentity {
    source: 'file' | 'env';
    /** Path of the identity JSON file, or the name of the env var holding it base64-encoded. */
    value: string;
    service: string;
    clientAuth: string;
    bindUsingEdgeIdentity: boolean;
    /** The ingested `identity` map, so keys the form does not manage survive a save. */
    raw?: any;
}

export const CLIENT_AUTH_POLICIES: { id: string; label: string }[] = [
    {id: '', label: 'default (verify if given)'},
    {id: 'noclientcert', label: 'no client cert'},
    {id: 'requestclientcert', label: 'request client cert'},
    {id: 'requireanyclientcert', label: 'require any client cert'},
    {id: 'verifyclientcertifgiven', label: 'verify client cert if given'},
    {id: 'requireandverifyclientcert', label: 'require and verify client cert'},
];

export interface BindPoint {
    interface: string;
    address: string;
    newAddress?: string;
    /** Set for an overlay bind point. `interface` and `address` are unused then. */
    identity?: BindPointIdentity;
    /** Other keys on an ingested overlay bind point. */
    extra?: any;
}

// `extra*`/`raw*` members carry content the form cannot edit, so an ingested file round-trips without loss.
export interface WebListener {
    name: string;
    bindPoints: BindPoint[];
    apis: { [binding: string]: boolean };
    spaPath: string;
    spaLocation: string;
    extra?: any;
    extraApis?: any[];
    apiOptions?: { [binding: string]: any };
    spaExtra?: any;
}

export interface EventLogger {
    name: string;
    subscriptions: string[];
    format: 'json' | 'cs';
    path: string;
    rawSubs?: { [type: string]: any };
    handlerRaw?: any;
}

export interface ControllerConfig {
    /** Parsed source document when a file was ingested; unmanaged keys pass through from here. */
    base?: any;
    mode: DeployMode;
    trustDomain: string;
    identity: { cert: string; serverCert: string; key: string; ca: string };
    db: string;
    cluster: {
        dataDir: string;
        preferredLeader: boolean;
        snapshotInterval: string;
        snapshotThreshold: number;
        electionTimeout: string;
        heartbeatTimeout: string;
        logLevel: string;
    };
    ctrl: { listener: string; advertiseAddress: string; connectTimeoutMs: number; maxQueuedConnects: number };
    network: {
        cycleSeconds: number;
        routeTimeoutSeconds: number;
        createCircuitRetries: number;
        pendingLinkTimeoutSeconds: number;
        minRouterCost: number;
        routerConnectChurnLimit: string;
        smartReroute: boolean;
        rerouteFraction: number;
        rerouteCap: number;
    };
    edge: {
        enabled: boolean;
        apiAddress: string;
        sessionTimeout: string;
        signingCert: string;
        signingKey: string;
        identityEnrollmentDuration: string;
        routerEnrollmentDuration: string;
        accessTokenDuration: string;
        refreshTokenDuration: string;
        authRateLimiter: boolean;
        authRateLimiterMax: number;
        totpHostname: string;
    };
    web: WebListener[];
    events: EventLogger[];
    healthCheckInterval: string;
}

export const API_BINDINGS: { id: string; label: string; hint: string }[] = [
    {id: 'health-checks', label: 'Health Checks', hint: 'Liveness endpoint for load balancers and probes.'},
    {id: 'fabric', label: 'Fabric', hint: 'Fabric management API (routers, links, circuits).'},
    {id: 'edge-management', label: 'Edge Management', hint: 'The API ZAC and the CLI talk to.'},
    {id: 'edge-client', label: 'Edge Client', hint: 'The API SDKs and tunnelers authenticate against.'},
    {id: 'edge-oidc', label: 'Edge OIDC', hint: 'OIDC provider for token-based SDK authentication.'},
    {id: 'spa', label: 'ZAC (SPA)', hint: 'Serve this console from the controller.'},
];

export const EVENT_SUBSCRIPTIONS: string[] = [
    'apiSession', 'authentication', 'circuit', 'connect', 'sdk', 'entityChange', 'entityCount', 'link', 'metrics',
    'router', 'session', 'services', 'terminator', 'usage', 'cluster',
];

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error'];

export function defaultConfig(): ControllerConfig {
    return {
        mode: 'standalone',
        trustDomain: '',
        identity: {
            cert: './pki/ctrl-client/certs/ctrl-client.cert',
            serverCert: './pki/ctrl-server/certs/ctrl-server.chain.pem',
            key: './pki/ctrl-server/keys/ctrl-server.key',
            ca: './pki/cas.pem',
        },
        db: './data/ctrl.db',
        cluster: {
            dataDir: './data/cluster',
            preferredLeader: false,
            snapshotInterval: '2m',
            snapshotThreshold: 500,
            electionTimeout: '5s',
            heartbeatTimeout: '3s',
            logLevel: 'info',
        },
        ctrl: {listener: 'tls:0.0.0.0:6262', advertiseAddress: '', connectTimeoutMs: 1000, maxQueuedConnects: 1000},
        network: {
            cycleSeconds: 60,
            routeTimeoutSeconds: 10,
            createCircuitRetries: 2,
            pendingLinkTimeoutSeconds: 10,
            minRouterCost: 10,
            routerConnectChurnLimit: '1m',
            smartReroute: false,
            rerouteFraction: 0.02,
            rerouteCap: 4,
        },
        edge: {
            enabled: true,
            apiAddress: 'localhost:1280',
            sessionTimeout: '30m',
            signingCert: './pki/signing/certs/signing.cert',
            signingKey: './pki/signing/keys/signing.key',
            identityEnrollmentDuration: '180m',
            routerEnrollmentDuration: '180m',
            accessTokenDuration: '30m',
            refreshTokenDuration: '24h',
            authRateLimiter: true,
            authRateLimiterMax: 250,
            totpHostname: '',
        },
        web: [{
            name: 'client-management',
            bindPoints: [{interface: '0.0.0.0:1280', address: 'localhost:1280'}],
            apis: {
                'health-checks': true, 'fabric': false, 'edge-management': true, 'edge-client': true,
                'edge-oidc': true, 'spa': false,
            },
            spaPath: 'zac',
            spaLocation: '/opt/openziti/share/console',
        }],
        events: [],
        healthCheckInterval: '30s',
    };
}

export interface ValidationIssue {
    section: string;
    level: 'error' | 'warn';
    message: string;
    /** Model path under `cfg` (e.g. `ctrl.listener`) so the form can flag the input. */
    field?: string;
}

const DURATION = /^(\d+(\.\d+)?(ns|us|µs|ms|s|m|h))+$/;

/** Parse a Go-style duration ("1m30s", "250ms") to milliseconds. NaN when invalid. */
export function parseDuration(value: string): number {
    if (!value || !DURATION.test(value)) {
        return NaN;
    }
    const unit: any = {ns: 1e-6, us: 1e-3, 'µs': 1e-3, ms: 1, s: 1e3, m: 6e4, h: 3.6e6};
    let total = 0;
    value.replace(/(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g, (_m, n, u) => {
        total += parseFloat(n) * unit[u];
        return '';
    });
    return total;
}

const ENV_REF = /\$\{[^}]+\}/;
const HOSTNAME = /^[A-Za-z0-9]([A-Za-z0-9_.-]*[A-Za-z0-9])?$/;
const HOST = /^(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9]([A-Za-z0-9_.-]*[A-Za-z0-9])?)$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TRUST_DOMAIN = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;
const SCHEMES = ['tls', 'tcp', 'udp', 'ws', 'wss', 'transwarp'];

/** Returns a problem description, or '' when `v` is a valid host:port. `${ENV}` values are not checked. */
export function checkHostPort(v: string): string {
    if (ENV_REF.test(v)) {
        return '';
    }
    const i = v.lastIndexOf(':');
    if (i <= 0) {
        return 'must be host:port';
    }
    const host = v.slice(0, i);
    const port = v.slice(i + 1);
    if (!HOST.test(host)) {
        return 'host contains invalid characters';
    }
    if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) {
        return 'port must be 1 to 65535';
    }
    return '';
}

/** Returns a problem description, or '' when `v` is scheme:host:port (e.g. tls:0.0.0.0:6262). */
export function checkEndpoint(v: string): string {
    if (ENV_REF.test(v)) {
        return '';
    }
    const i = v.indexOf(':');
    if (i <= 0 || !SCHEMES.includes(v.slice(0, i))) {
        return `must start with one of ${SCHEMES.join(', ')} followed by :host:port`;
    }
    const rest = checkHostPort(v.slice(i + 1));
    return rest ? rest : '';
}

/** Filesystem paths: no quotes, control characters or surrounding whitespace. */
export function checkPath(v: string): string {
    if (/[\x00-\x1f"]/.test(v)) {
        return 'contains quotes or control characters';
    }
    if (v !== v.trim()) {
        return 'has leading or trailing whitespace';
    }
    return '';
}

export function validate(c: ControllerConfig): ValidationIssue[] {
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
    const hostPort = (section: string, label: string, v: string, field?: string) => {
        const p = checkHostPort(v);
        if (p) {
            err(section, `${label} ${p}`, field);
        }
    };
    const int = (section: string, label: string, v: number, min: number, max: number, field: string) => {
        if (v === null || v === undefined || typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
            err(section, `${label} must be a whole number from ${min} to ${max}`, field);
        }
    };
    const duration = (section: string, label: string, v: string, field: string, minMs = 0) => {
        const ms = parseDuration(v);
        if (isNaN(ms)) {
            err(section, `${label} is not a valid duration (try 30s, 5m, 24h)`, field);
        } else if (ms < minMs) {
            err(section, `${label} must be at least ${minMs / 1000}s`, field);
        }
    };
    const name = (section: string, label: string, v: string, field?: string) => {
        if (!v) {
            err(section, `${label} is required`, field);
        } else if (!NAME.test(v)) {
            err(section, `${label} "${v}" may only use letters, digits, dot, dash and underscore`, field);
        }
    };

    // identity
    if (c.trustDomain && !ENV_REF.test(c.trustDomain) && !TRUST_DOMAIN.test(c.trustDomain)) {
        err('identity', 'trustDomain must be a DNS-style name (letters, digits, dots, dashes; no spaces or quotes)',
            'trustDomain');
    }
    path('identity', 'identity.cert', c.identity.cert, 'identity.cert');
    path('identity', 'identity.server_cert', c.identity.serverCert, 'identity.serverCert', false);
    path('identity', 'identity.key', c.identity.key, 'identity.key');
    path('identity', 'identity.ca', c.identity.ca, 'identity.ca');

    // storage
    if (c.mode === 'standalone') {
        path('storage', 'db', c.db, 'db');
    } else {
        path('storage', 'cluster.dataDir', c.cluster.dataDir, 'cluster.dataDir');
        duration('storage', 'snapshotInterval', c.cluster.snapshotInterval, 'cluster.snapshotInterval');
        duration('storage', 'electionTimeout', c.cluster.electionTimeout, 'cluster.electionTimeout');
        duration('storage', 'heartbeatTimeout', c.cluster.heartbeatTimeout, 'cluster.heartbeatTimeout');
        int('storage', 'snapshotThreshold', c.cluster.snapshotThreshold, 1, 1000000, 'cluster.snapshotThreshold');
        if (!c.ctrl.advertiseAddress) {
            err('ctrl', 'advertise address is required in HA: peers and routers dial it (written as ctrl.options.advertiseAddress)', 'ctrl.advertiseAddress');
        }
        if (!c.trustDomain) {
            warn('identity', 'HA nodes need a spiffe:// URI SAN on the server cert; set trustDomain to match it',
                'trustDomain');
        }
    }

    // ctrl
    if (!c.ctrl.listener) {
        err('ctrl', 'ctrl.listener is required', 'ctrl.listener');
    } else {
        const p = checkEndpoint(c.ctrl.listener);
        if (p) {
            err('ctrl', `ctrl.listener ${p}`, 'ctrl.listener');
        }
    }
    if (c.ctrl.advertiseAddress) {
        const p = checkEndpoint(c.ctrl.advertiseAddress);
        if (p) {
            err('ctrl', `advertiseAddress ${p}`, 'ctrl.advertiseAddress');
        }
    }
    int('ctrl', 'connectTimeoutMs', c.ctrl.connectTimeoutMs, 30, 60000, 'ctrl.connectTimeoutMs');
    int('ctrl', 'maxQueuedConnects', c.ctrl.maxQueuedConnects, 1, 5000, 'ctrl.maxQueuedConnects');

    // network
    const n = c.network;
    int('network', 'cycleSeconds', n.cycleSeconds, 1, 86400, 'network.cycleSeconds');
    int('network', 'routeTimeoutSeconds', n.routeTimeoutSeconds, 1, 3600, 'network.routeTimeoutSeconds');
    int('network', 'createCircuitRetries', n.createCircuitRetries, 0, 100, 'network.createCircuitRetries');
    int('network', 'pendingLinkTimeoutSeconds', n.pendingLinkTimeoutSeconds, 1, 3600, 'network.pendingLinkTimeoutSeconds');
    int('network', 'minRouterCost', n.minRouterCost, 0, 65535, 'network.minRouterCost');
    duration('network', 'routerConnectChurnLimit', n.routerConnectChurnLimit, 'network.routerConnectChurnLimit');
    if (n.smartReroute) {
        if (typeof n.rerouteFraction !== 'number' || isNaN(n.rerouteFraction) || n.rerouteFraction <= 0 ||
            n.rerouteFraction > 1) {
            err('network', 'rerouteFraction must be greater than 0 and at most 1', 'network.rerouteFraction');
        }
        int('network', 'rerouteCap', n.rerouteCap, 1, 10000, 'network.rerouteCap');
    }

    // edge
    const e = c.edge;
    if (e.enabled) {
        if (!e.apiAddress) {
            err('edge', 'edge.api.address is required', 'edge.apiAddress');
        } else {
            hostPort('edge', 'edge.api.address', e.apiAddress, 'edge.apiAddress');
        }
        duration('edge', 'sessionTimeout', e.sessionTimeout, 'edge.sessionTimeout', 60000);
        duration('edge', 'identity enrollment duration', e.identityEnrollmentDuration,
            'edge.identityEnrollmentDuration', 300000);
        duration('edge', 'router enrollment duration', e.routerEnrollmentDuration,
            'edge.routerEnrollmentDuration', 300000);
        duration('edge', 'accessTokenDuration', e.accessTokenDuration, 'edge.accessTokenDuration');
        duration('edge', 'refreshTokenDuration', e.refreshTokenDuration, 'edge.refreshTokenDuration');
        const a = parseDuration(e.accessTokenDuration);
        const r = parseDuration(e.refreshTokenDuration);
        if (!isNaN(a) && !isNaN(r) && r < a + 60000) {
            err('edge', 'refreshTokenDuration must be at least 1m longer than accessTokenDuration',
                'edge.refreshTokenDuration');
        }
        path('edge', 'signing certificate', e.signingCert, 'edge.signingCert');
        path('edge', 'signing key', e.signingKey, 'edge.signingKey');
        if (e.authRateLimiter) {
            int('edge', 'auth rate limiter max size', e.authRateLimiterMax, 5, 1000, 'edge.authRateLimiterMax');
        }
        if (e.totpHostname && !ENV_REF.test(e.totpHostname) && !HOSTNAME.test(e.totpHostname)) {
            err('edge', 'TOTP hostname must be a hostname (no spaces, quotes or ports)', 'edge.totpHostname');
        }
        if (!c.web.some(w => w.apis['edge-client'] || w.apis['edge-management'])) {
            warn('web', 'edge is enabled but no web listener serves edge-client or edge-management');
        }
    }

    // web
    if (!c.web.length) {
        err('web', 'at least one web listener is required');
    }
    const seenNames = new Set<string>();
    const seenBinds = new Set<string>();
    c.web.forEach((w, i) => {
        const label = w.name || `listener ${i + 1}`;
        name('web', `listener ${i + 1} name`, w.name);
        if (w.name) {
            if (seenNames.has(w.name)) {
                err('web', `listener name "${w.name}" is used more than once`);
            }
            seenNames.add(w.name);
        }
        if (!w.bindPoints.length) {
            err('web', `${label}: add at least one bind point`);
        }
        w.bindPoints.forEach((b, bi) => {
            const bp = `${label} bind point ${bi + 1}`;
            if (b.identity) {
                const id = b.identity;
                if (!id.value) {
                    err('web', `${bp}: ${id.source === 'file' ? 'identity file' : 'identity env variable'} is required`);
                } else if (id.source === 'file') {
                    const p = checkPath(id.value);
                    if (p) {
                        err('web', `${bp}: identity file ${p}`);
                    }
                } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id.value)) {
                    err('web', `${bp}: env variable name may only use letters, digits and underscore`);
                }
                if (!id.service) {
                    err('web', `${bp}: the service to bind is required`);
                }
                return;
            }
            if (!b.interface) {
                err('web', `${bp}: interface is required`);
            } else {
                hostPort('web', `${bp}: interface`, b.interface);
                if (seenBinds.has(b.interface)) {
                    err('web', `${bp}: ${b.interface} is already bound by another listener`);
                }
                seenBinds.add(b.interface);
            }
            if (!b.address) {
                err('web', `${bp}: address is required`);
            } else {
                hostPort('web', `${bp}: address`, b.address);
            }
        });
        if (!Object.keys(w.apis).some(k => w.apis[k])) {
            err('web', `${label}: enable at least one API`);
        }
        if (w.apis['spa']) {
            if (!w.spaLocation) {
                err('web', `${label}: the SPA needs a location on disk`);
            } else {
                const p = checkPath(w.spaLocation);
                if (p) {
                    err('web', `${label}: SPA location ${p}`);
                }
            }
            if (w.spaPath && !/^[A-Za-z0-9._-]+$/.test(w.spaPath)) {
                err('web', `${label}: SPA URL path may only use letters, digits, dot, dash and underscore`);
            }
        }
    });
    duration('web', 'health check interval', c.healthCheckInterval, 'healthCheckInterval');

    // events
    const seenLoggers = new Set<string>();
    c.events.forEach((ev, i) => {
        name('events', `event logger ${i + 1} name`, ev.name);
        if (ev.name) {
            if (seenLoggers.has(ev.name)) {
                err('events', `logger name "${ev.name}" is used more than once`);
            }
            seenLoggers.add(ev.name);
        }
        const label = ev.name || `logger ${i + 1}`;
        if (!ev.subscriptions.length) {
            warn('events', `${label}: no subscriptions selected`);
        }
        const customHandler = ev.handlerRaw && ev.handlerRaw.type !== 'file';
        if (!customHandler) {
            path('events', `${label} file path`, ev.path, '');
        }
    });
    return out;
}

// ---- YAML emitter ----------------------------------------------------------------------------

const PLAIN_UNSAFE = /^[\s\-?:,\[\]{}#&*!|>'"%@`]|[:#]\s|:$|\s$|^$/;
const RESERVED = /^(true|false|null|yes|no|on|off|~|[-+]?(\d[\d_]*)(\.\d+)?([eE][-+]?\d+)?|0x[0-9a-f]+)$/i;

function scalar(v: any): string {
    if (v === null) {
        return 'null';
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
        return String(v);
    }
    const s = String(v);
    if (PLAIN_UNSAFE.test(s) || RESERVED.test(s)) {
        return JSON.stringify(s);
    }
    return s;
}

function dump(value: any, indent: number, lines: string[]): void {
    const pad = ' '.repeat(indent);
    if (Array.isArray(value)) {
        value.forEach(item => {
            if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
                const sub: string[] = [];
                dump(item, indent + 2, sub);
                // fold the first key onto the dash line
                sub[0] = pad + '- ' + sub[0].trimStart();
                lines.push(...sub);
            } else {
                lines.push(`${pad}- ${scalar(item)}`);
            }
        });
        return;
    }
    Object.keys(value).forEach(key => {
        const v = value[key];
        if (v === undefined) {
            return;
        }
        if (Array.isArray(v)) {
            if (!v.length) {
                lines.push(`${pad}${key}: []`);
            } else {
                lines.push(`${pad}${key}:`);
                dump(v, indent + 2, lines);
            }
        } else if (v !== null && typeof v === 'object') {
            if (!Object.keys(v).length) {
                lines.push(`${pad}${key}: {}`);
            } else {
                lines.push(`${pad}${key}:`);
                dump(v, indent + 2, lines);
            }
        } else {
            lines.push(`${pad}${key}: ${scalar(v)}`);
        }
    });
}

/** Add `key: value` to `target` when it differs from the default, or when `verbose` is on. */
function put(target: any, key: string, value: any, def: any, verbose: boolean) {
    if (verbose || value !== def) {
        target[key] = value;
    }
}

/** Emit an overlay bind point, starting from the ingested `identity` map so unmanaged keys survive. */
function identityBindPoint(b: BindPoint): any {
    const id = b.identity!;
    const out: any = isObj(id.raw) ? JSON.parse(JSON.stringify(id.raw)) : {};
    delete out.file;
    delete out.env;
    out[id.source] = id.value;
    out.service = id.service;
    if (id.clientAuth) {
        out.tlsClientAuthenticationPolicy = id.clientAuth;
    } else {
        delete out.tlsClientAuthenticationPolicy;
    }
    const opts = isObj(out.listenOptions) ? out.listenOptions : {};
    if (id.bindUsingEdgeIdentity) {
        opts.bindUsingEdgeIdentity = true;
    } else {
        delete opts.bindUsingEdgeIdentity;
    }
    if (Object.keys(opts).length) {
        out.listenOptions = opts;
    } else {
        delete out.listenOptions;
    }
    return {...(b.extra || {}), identity: out};
}

function parseIdentityBindPoint(b: any): BindPoint {
    const {identity, ...extra} = b;
    const source = typeof identity.env === 'string' && typeof identity.file !== 'string' ? 'env' : 'file';
    return {
        interface: '',
        address: '',
        identity: {
            source,
            value: String(identity[source] ?? ''),
            service: String(identity.service ?? ''),
            clientAuth: String(identity.tlsClientAuthenticationPolicy ?? ''),
            bindUsingEdgeIdentity: identity.listenOptions?.bindUsingEdgeIdentity === true,
            raw: identity,
        },
        extra,
    };
}

export function buildDocument(c: ControllerConfig, verbose = false): any {
    const doc: any = {v: 3};
    const d = defaultConfig();

    const identity: any = {cert: c.identity.cert, key: c.identity.key, ca: c.identity.ca};
    if (c.identity.serverCert) {
        identity.server_cert = c.identity.serverCert;
    }
    doc.identity = identity;
    if (c.trustDomain) {
        doc.trustDomain = c.trustDomain;
    }

    if (c.mode === 'standalone') {
        doc.db = c.db;
    } else {
        const cl: any = {dataDir: c.cluster.dataDir};
        put(cl, 'preferredLeader', c.cluster.preferredLeader, d.cluster.preferredLeader, verbose);
        put(cl, 'snapshotInterval', c.cluster.snapshotInterval, d.cluster.snapshotInterval, verbose);
        put(cl, 'snapshotThreshold', c.cluster.snapshotThreshold, d.cluster.snapshotThreshold, verbose);
        put(cl, 'electionTimeout', c.cluster.electionTimeout, d.cluster.electionTimeout, verbose);
        put(cl, 'heartbeatTimeout', c.cluster.heartbeatTimeout, d.cluster.heartbeatTimeout, verbose);
        put(cl, 'logLevel', c.cluster.logLevel, d.cluster.logLevel, verbose);
        doc.cluster = cl;
    }

    const options: any = {};
    if (c.ctrl.advertiseAddress) {
        options.advertiseAddress = c.ctrl.advertiseAddress;
    }
    put(options, 'connectTimeoutMs', c.ctrl.connectTimeoutMs, d.ctrl.connectTimeoutMs, verbose);
    put(options, 'maxQueuedConnects', c.ctrl.maxQueuedConnects, d.ctrl.maxQueuedConnects, verbose);
    doc.ctrl = {listener: c.ctrl.listener};
    if (Object.keys(options).length) {
        doc.ctrl.options = options;
    }

    const n = c.network;
    const dn = d.network;
    const net: any = {};
    put(net, 'cycleSeconds', n.cycleSeconds, dn.cycleSeconds, verbose);
    put(net, 'routeTimeoutSeconds', n.routeTimeoutSeconds, dn.routeTimeoutSeconds, verbose);
    put(net, 'createCircuitRetries', n.createCircuitRetries, dn.createCircuitRetries, verbose);
    put(net, 'pendingLinkTimeoutSeconds', n.pendingLinkTimeoutSeconds, dn.pendingLinkTimeoutSeconds, verbose);
    put(net, 'minRouterCost', n.minRouterCost, dn.minRouterCost, verbose);
    put(net, 'routerConnectChurnLimit', n.routerConnectChurnLimit, dn.routerConnectChurnLimit, verbose);
    if (n.smartReroute) {
        net.smart = {rerouteFraction: n.rerouteFraction, rerouteCap: n.rerouteCap};
    }
    if (Object.keys(net).length) {
        doc.network = net;
    }

    const hc: any = {};
    put(hc, 'interval', c.healthCheckInterval, d.healthCheckInterval, verbose);
    if (Object.keys(hc).length) {
        doc.healthChecks = {boltCheck: hc};
    }

    if (c.edge.enabled) {
        const e = c.edge;
        const api: any = {address: e.apiAddress};
        put(api, 'sessionTimeout', e.sessionTimeout, d.edge.sessionTimeout, verbose);
        const enrollment: any = {signingCert: {cert: e.signingCert, key: e.signingKey}};
        const idDur = e.identityEnrollmentDuration !== d.edge.identityEnrollmentDuration;
        const rtDur = e.routerEnrollmentDuration !== d.edge.routerEnrollmentDuration;
        if (verbose || idDur) {
            enrollment.edgeIdentity = {duration: e.identityEnrollmentDuration};
        }
        if (verbose || rtDur) {
            enrollment.edgeRouter = {duration: e.routerEnrollmentDuration};
        }
        doc.edge = {api, enrollment};

        const oidc: any = {};
        put(oidc, 'accessTokenDuration', e.accessTokenDuration, d.edge.accessTokenDuration, verbose);
        put(oidc, 'refreshTokenDuration', e.refreshTokenDuration, d.edge.refreshTokenDuration, verbose);
        if (Object.keys(oidc).length) {
            doc.edge.oidc = oidc;
        }
        if (e.totpHostname) {
            doc.edge.totp = {hostname: e.totpHostname};
        }
        if (!e.authRateLimiter) {
            doc.edge.authRateLimiter = {enabled: false};
        } else if (verbose || e.authRateLimiterMax !== d.edge.authRateLimiterMax) {
            doc.edge.authRateLimiter = {enabled: true, maxSize: e.authRateLimiterMax};
        }
    }

    doc.web = c.web.map(w => {
        const apis: any[] = [];
        API_BINDINGS.forEach(b => {
            if (!w.apis[b.id]) {
                return;
            }
            if (b.id === 'spa') {
                apis.push({
                    binding: 'spa',
                    options: {...(w.spaExtra || {}), path: w.spaPath || 'zac', location: w.spaLocation},
                });
            } else if (w.apiOptions?.[b.id]) {
                apis.push({binding: b.id, options: w.apiOptions[b.id]});
            } else {
                apis.push({binding: b.id});
            }
        });
        apis.push(...(w.extraApis || []));
        return {
            name: w.name,
            bindPoints: w.bindPoints.map(b => b.identity ? identityBindPoint(b) : ({
                interface: b.interface,
                address: b.address,
                ...(b.newAddress ? {newAddress: b.newAddress} : {}),
            })),
            ...(w.extra || {}),
            apis,
        };
    });

    if (c.events.length) {
        const events: any = {};
        c.events.forEach(e => {
            if (!e.name) {
                return;
            }
            events[e.name] = {
                subscriptions: e.subscriptions.map(type => e.rawSubs?.[type] ?? {type}),
                handler: e.handlerRaw && e.handlerRaw.type !== 'file'
                    ? e.handlerRaw
                    : {...(e.handlerRaw || {}), type: 'file', format: e.format, path: e.path},
            };
        });
        doc.events = events;
    }
    return doc;
}

export const isObj = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Keep a leaf when the source file had it or when it differs from the default, so a value the user
 * set back to its default still overwrites the stale one in the source.
 */
function prune(full: any, minimal: any, raw: any): any {
    const out: any = {};
    Object.keys(full).forEach(k => {
        const f = full[k];
        if (isObj(f)) {
            const sub = prune(f, minimal?.[k] ?? {}, raw?.[k] ?? {});
            if (Object.keys(sub).length || (raw && k in raw) || (minimal && k in minimal)) {
                out[k] = sub;
            }
        } else if ((raw && k in raw) || (minimal && k in minimal)) {
            out[k] = f;
        }
    });
    return out;
}

function merge(base: any, over: any): any {
    const out: any = {...base};
    Object.keys(over).forEach(k => {
        out[k] = isObj(over[k]) && isObj(base?.[k]) ? merge(base[k], over[k]) : over[k];
    });
    return out;
}

const MANAGED = ['v', 'identity', 'trustDomain', 'db', 'cluster', 'ctrl', 'network', 'healthChecks', 'edge', 'web', 'events'];

/** Document to emit: ingested source with the form's values applied on top. */
export function composeDocument(c: ControllerConfig, verbose = false): any {
    const minimal = buildDocument(c, verbose);
    if (!c.base) {
        return minimal;
    }
    const base = {...c.base};
    if (isObj(base.identity) && !c.identity.serverCert) {
        base.identity = {...base.identity};
        delete base.identity.server_cert;
    }
    // switching HA <-> standalone must drop the other storage key
    delete base[c.mode === 'ha' ? 'db' : 'cluster'];
    if (!c.edge.enabled) {
        delete base.edge;
    }
    const kept = prune(buildDocument(c, true), minimal, base);
    // managed keys the form no longer produces (e.g. emptied trustDomain) must not linger
    MANAGED.forEach(k => {
        if (!(k in minimal) && !(k in kept)) {
            delete base[k];
        }
    });
    kept.web = minimal.web;
    kept.events = minimal.events;
    if (!kept.events) {
        delete base.events;
    }
    return merge(base, kept);
}

/** Parse controller YAML into the form model. Unknown content is retained for round-tripping. */
export function fromYaml(text: string): { cfg: ControllerConfig; warnings: string[] } {
    const doc: any = parseYaml(text);
    if (!isObj(doc)) {
        throw new Error('The file is not a YAML mapping');
    }
    const warnings: string[] = [];
    if (doc.v !== 3) {
        warnings.push(`config version is ${doc.v ?? 'missing'}; this builder writes v: 3`);
    }
    const c = defaultConfig();
    c.base = doc;
    const s = (v: any, def: string) => (v === undefined || v === null ? def : String(v));
    const n = (v: any, def: number) => (typeof v === 'number' ? v : def);

    c.trustDomain = s(doc.trustDomain, '');
    const id = doc.identity || {};
    c.identity = {
        cert: s(id.cert, ''), serverCert: s(id.server_cert, ''), key: s(id.key, ''), ca: s(id.ca, ''),
    };

    if (doc.cluster) {
        c.mode = 'ha';
        const cl = doc.cluster;
        c.cluster = {
            dataDir: s(cl.dataDir, ''),
            preferredLeader: cl.preferredLeader === true,
            snapshotInterval: s(cl.snapshotInterval, c.cluster.snapshotInterval),
            snapshotThreshold: n(cl.snapshotThreshold, c.cluster.snapshotThreshold),
            electionTimeout: s(cl.electionTimeout, c.cluster.electionTimeout),
            heartbeatTimeout: s(cl.heartbeatTimeout, c.cluster.heartbeatTimeout),
            logLevel: s(cl.logLevel, c.cluster.logLevel),
        };
    } else {
        c.db = s(doc.db, '');
    }

    const ctrl = doc.ctrl || {};
    const opts = ctrl.options || {};
    c.ctrl = {
        listener: s(ctrl.listener, ''),
        advertiseAddress: s(opts.advertiseAddress, ''),
        connectTimeoutMs: n(opts.connectTimeoutMs, c.ctrl.connectTimeoutMs),
        maxQueuedConnects: n(opts.maxQueuedConnects, c.ctrl.maxQueuedConnects),
    };

    const net = doc.network || {};
    const dn = c.network;
    c.network = {
        cycleSeconds: n(net.cycleSeconds, dn.cycleSeconds),
        routeTimeoutSeconds: n(net.routeTimeoutSeconds, dn.routeTimeoutSeconds),
        createCircuitRetries: n(net.createCircuitRetries, dn.createCircuitRetries),
        pendingLinkTimeoutSeconds: n(net.pendingLinkTimeoutSeconds, dn.pendingLinkTimeoutSeconds),
        minRouterCost: n(net.minRouterCost, dn.minRouterCost),
        routerConnectChurnLimit: s(net.routerConnectChurnLimit, dn.routerConnectChurnLimit),
        smartReroute: isObj(net.smart),
        rerouteFraction: n(net.smart?.rerouteFraction, dn.rerouteFraction),
        rerouteCap: n(net.smart?.rerouteCap, dn.rerouteCap),
    };

    c.healthCheckInterval = s(doc.healthChecks?.boltCheck?.interval, c.healthCheckInterval);

    // the builder always manages the edge block; a fabric-only file gains one with the defaults below
    const e = isObj(doc.edge) ? doc.edge : {};
    {
        const de = c.edge;
        c.edge = {
            enabled: true,
            apiAddress: s(e.api?.address, ''),
            sessionTimeout: s(e.api?.sessionTimeout, de.sessionTimeout),
            signingCert: s(e.enrollment?.signingCert?.cert, ''),
            signingKey: s(e.enrollment?.signingCert?.key, ''),
            identityEnrollmentDuration: s(e.enrollment?.edgeIdentity?.duration, de.identityEnrollmentDuration),
            routerEnrollmentDuration: s(e.enrollment?.edgeRouter?.duration, de.routerEnrollmentDuration),
            accessTokenDuration: s(e.oidc?.accessTokenDuration, de.accessTokenDuration),
            refreshTokenDuration: s(e.oidc?.refreshTokenDuration, de.refreshTokenDuration),
            authRateLimiter: e.authRateLimiter?.enabled !== false,
            authRateLimiterMax: n(e.authRateLimiter?.maxSize, de.authRateLimiterMax),
            totpHostname: s(e.totp?.hostname, ''),
        };
    }

    const known = API_BINDINGS.map(b => b.id);
    c.web = (Array.isArray(doc.web) ? doc.web : []).map((w: any) => {
        const {name, bindPoints, apis, ...extra} = w || {};
        const listener: WebListener = {
            name: s(name, ''),
            bindPoints: (Array.isArray(bindPoints) ? bindPoints : []).map((b: any) => isObj(b?.identity)
                ? parseIdentityBindPoint(b)
                : ({
                    interface: s(b?.interface, ''), address: s(b?.address, ''),
                    ...(b?.newAddress ? {newAddress: String(b.newAddress)} : {}),
                })),
            apis: {},
            spaPath: 'zac',
            spaLocation: '',
            extra,
            extraApis: [],
            apiOptions: {},
        };
        (Array.isArray(apis) ? apis : []).forEach((a: any) => {
            if (known.includes(a?.binding)) {
                listener.apis[a.binding] = true;
                if (a.binding === 'spa') {
                    const {path, location, ...rest} = a.options || {};
                    listener.spaPath = s(path, 'zac');
                    listener.spaLocation = s(location, '');
                    listener.spaExtra = rest;
                } else if (a.options) {
                    listener.apiOptions![a.binding] = a.options;
                }
            } else {
                listener.extraApis!.push(a);
                warnings.push(`kept unrecognized API binding "${a?.binding}" as-is`);
            }
        });
        return listener;
    });

    c.events = isObj(doc.events) ? Object.keys(doc.events).map(name => {
        const ev = doc.events[name] || {};
        const subs = Array.isArray(ev.subscriptions) ? ev.subscriptions : [];
        const rawSubs: any = {};
        subs.forEach((x: any) => rawSubs[x?.type] = x);
        return {
            name,
            subscriptions: subs.map((x: any) => String(x?.type)),
            format: ev.handler?.format === 'cs' ? 'cs' : 'json',
            path: s(ev.handler?.path, ''),
            rawSubs,
            handlerRaw: ev.handler,
        } as EventLogger;
    }) : [];

    const unmanaged = Object.keys(doc).filter(k => !MANAGED.includes(k));
    if (unmanaged.length) {
        warnings.push(`passing through untouched: ${unmanaged.join(', ')}`);
    }
    return {cfg: c, warnings};
}

/** Emit a document with a comment header and a blank line between top-level sections. */
export function dumpDocument(doc: any, header: string[]): string {
    const lines: string[] = [...header, ''];
    Object.keys(doc).forEach((key, i) => {
        if (i > 0) {
            lines.push('');
        }
        dump({[key]: doc[key]}, 0, lines);
    });
    return lines.join('\n') + '\n';
}

export function toYaml(c: ControllerConfig, verbose = false): string {
    return dumpDocument(composeDocument(c, verbose), [
        '# OpenZiti controller configuration',
        '# Generated by ZAC Config Builder. Review before use; ${ENV_VARS} are expanded by the controller.',
    ]);
}
