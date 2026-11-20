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

// Set-up wizard: one service, the identity that hosts it, the users who may reach it, and the
// policies between them, named the way OpenZiti deployments usually name them.

import {AcModel, AcOp, clone, applyOps, identityRouters, serviceRouters} from './access-canvas.logic';

export interface ServiceTemplate {
    id: string; label: string; group: string;
    /** Short name used in names, e.g. "ssh" in loft-50-ssh. */
    slug: string;
    port: number;
    protocols: ('tcp' | 'udp')[];
    /** User groups that usually get this kind of service, most likely first. */
    users: string[];
    note?: string;
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
    {id: 'ssh', label: 'SSH (remote shell)', group: 'Remote access', slug: 'ssh', port: 22, protocols: ['tcp'], users: ['it-admins', 'developers', 'sre']},
    {id: 'rdp', label: 'Remote Desktop (RDP)', group: 'Remote access', slug: 'rdp', port: 3389, protocols: ['tcp'], users: ['it-admins', 'support', 'employees']},
    {id: 'vnc', label: 'VNC screen sharing', group: 'Remote access', slug: 'vnc', port: 5900, protocols: ['tcp'], users: ['support', 'it-admins']},
    {id: 'https', label: 'Internal web app (HTTPS)', group: 'Web', slug: 'https', port: 443, protocols: ['tcp'], users: ['employees', 'developers']},
    {id: 'http', label: 'Internal web app (HTTP)', group: 'Web', slug: 'http', port: 80, protocols: ['tcp'], users: ['employees', 'developers'],
        note: 'Traffic is encrypted end to end over Ziti even though the app speaks plain HTTP.'},
    {id: 'api', label: 'Internal API (HTTPS, 8443)', group: 'Web', slug: 'api', port: 8443, protocols: ['tcp'], users: ['developers', 'sre']},
    {id: 'grafana', label: 'Grafana / dashboards', group: 'Web', slug: 'grafana', port: 3000, protocols: ['tcp'], users: ['sre', 'developers']},
    {id: 'jenkins', label: 'Jenkins / CI server', group: 'Web', slug: 'jenkins', port: 8080, protocols: ['tcp'], users: ['developers', 'sre']},
    {id: 'postgres', label: 'PostgreSQL', group: 'Databases', slug: 'postgres', port: 5432, protocols: ['tcp'], users: ['dbas', 'developers']},
    {id: 'mysql', label: 'MySQL / MariaDB', group: 'Databases', slug: 'mysql', port: 3306, protocols: ['tcp'], users: ['dbas', 'developers']},
    {id: 'mssql', label: 'Microsoft SQL Server', group: 'Databases', slug: 'mssql', port: 1433, protocols: ['tcp'], users: ['dbas', 'developers']},
    {id: 'redis', label: 'Redis', group: 'Databases', slug: 'redis', port: 6379, protocols: ['tcp'], users: ['developers', 'sre']},
    {id: 'smb', label: 'Windows file share (SMB)', group: 'Files and infrastructure', slug: 'smb', port: 445, protocols: ['tcp'], users: ['employees', 'finance', 'hr']},
    {id: 'k8s', label: 'Kubernetes API', group: 'Files and infrastructure', slug: 'k8s-api', port: 6443, protocols: ['tcp'], users: ['platform-engineers', 'sre']},
    {id: 'custom', label: 'Something else (choose the port)', group: 'Other', slug: 'app', port: 8080, protocols: ['tcp'], users: ['employees']},
];

export interface UserGroup { attr: string; label: string; }

export const USER_GROUPS: UserGroup[] = [
    {attr: 'employees', label: 'All employees'},
    {attr: 'it-admins', label: 'IT administrators'},
    {attr: 'developers', label: 'Developers'},
    {attr: 'sre', label: 'SRE / operations'},
    {attr: 'platform-engineers', label: 'Platform engineers'},
    {attr: 'dbas', label: 'Database administrators'},
    {attr: 'support', label: 'Support / help desk'},
    {attr: 'finance', label: 'Finance'},
    {attr: 'hr', label: 'HR'},
    {attr: 'sales', label: 'Sales'},
    {attr: 'contractors', label: 'Contractors'},
    {attr: 'executives', label: 'Executives'},
];

export interface WizardInput {
    templateId: string;
    /** The system or machine the service runs on, e.g. loft-50, billing, crm. */
    system: string;
    serviceName: string;
    /** What users connect to (intercepted on their device). */
    interceptHost: string;
    interceptPort: number;
    /** Where the real server listens, as seen from the hosting identity. */
    hostAddress: string;
    hostPort: number;
    protocols: ('tcp' | 'udp')[];
    /** Hosting identity: an existing one, or a new one with this name. */
    hostMode: 'new' | 'existing';
    hostId: string;
    hostName: string;
    hostsAttr: string;
    /** Users: a role attribute, and either a new user device or existing identities to add to it. */
    usersAttr: string;
    userMode: 'new' | 'existing';
    userIds: string[];
    newUserName: string;
}

/** Lowercase words joined by dashes: the usual shape of OpenZiti names and role attributes. */
export const slugify = (s: string) => s.trim().toLowerCase().replace(/^[#@]/, '').replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');

export const templateById = (id: string) => SERVICE_TEMPLATES.find(t => t.id === id) || SERVICE_TEMPLATES[SERVICE_TEMPLATES.length - 1];

/** Names derived from the system and service type; the wizard shows them as editable suggestions. */
export function suggest(templateId: string, system: string): Pick<WizardInput,
    'serviceName' | 'interceptHost' | 'interceptPort' | 'hostAddress' | 'hostPort' | 'protocols' | 'hostName' | 'hostsAttr' | 'usersAttr'> {
    const t = templateById(templateId);
    const sys = slugify(system) || 'app-server';
    const serviceName = `${sys}-${t.slug}`;
    return {
        serviceName,
        interceptHost: `${sys}.ziti`,
        interceptPort: t.port,
        hostAddress: '127.0.0.1',
        hostPort: t.port,
        protocols: [...t.protocols],
        hostName: sys,
        hostsAttr: `${serviceName}-hosts`,
        usersAttr: t.users[0],
    };
}

export function blankInput(templateId = 'ssh', system = ''): WizardInput {
    return {
        templateId, system, ...suggest(templateId, system),
        hostMode: 'new', hostId: '', userMode: 'new', userIds: [], newUserName: '',
    };
}

export interface WizardCheck { field: string; message: string; }

const validPort = (p: number) => Number.isInteger(p) && p >= 1 && p <= 65535;
const validName = (s: string) => /^[a-z0-9][a-z0-9._-]*$/.test(s);

/** Problems that stop the wizard from producing changes, per step field. */
export function validate(m: AcModel, w: WizardInput): WizardCheck[] {
    const out: WizardCheck[] = [];
    const taken = (list: { name: string }[], n: string) => list.some(x => x.name.toLowerCase() === n.toLowerCase());
    if (!w.system.trim()) out.push({field: 'system', message: 'Name the system or machine it runs on.'});
    if (!validName(w.serviceName)) out.push({field: 'serviceName', message: 'Use lowercase letters, digits, dots and dashes.'});
    else if (taken(m.services, w.serviceName)) out.push({field: 'serviceName', message: `A service named ${w.serviceName} already exists.`});
    if (!w.interceptHost.trim() || /\s/.test(w.interceptHost)) out.push({field: 'interceptHost', message: 'Enter a hostname or IP address users will connect to.'});
    if (!validPort(w.interceptPort)) out.push({field: 'interceptPort', message: 'Ports are 1 to 65535.'});
    if (!w.hostAddress.trim() || /\s/.test(w.hostAddress)) out.push({field: 'hostAddress', message: 'Enter the address the server listens on.'});
    if (!validPort(w.hostPort)) out.push({field: 'hostPort', message: 'Ports are 1 to 65535.'});
    if (w.hostMode === 'existing' && !m.identities.some(i => i.id === w.hostId)) out.push({field: 'hostId', message: 'Choose the identity that hosts it.'});
    if (w.hostMode === 'new') {
        if (!validName(w.hostName)) out.push({field: 'hostName', message: 'Use lowercase letters, digits, dots and dashes.'});
        else if (taken(m.identities, w.hostName)) out.push({field: 'hostName', message: `An identity named ${w.hostName} already exists. Choose “Existing identity” to use it.`});
    }
    if (!validName(w.hostsAttr)) out.push({field: 'hostsAttr', message: 'Use lowercase letters, digits, dots and dashes.'});
    if (!validName(w.usersAttr)) out.push({field: 'usersAttr', message: 'Choose or type a user group.'});
    if (w.userMode === 'new') {
        if (!w.newUserName) out.push({field: 'newUserName', message: 'Name the user\'s device, e.g. jdoe-laptop, or choose “Existing identities”.'});
        else if (!validName(w.newUserName)) out.push({field: 'newUserName', message: 'Use lowercase letters, digits, dots and dashes.'});
        else if (taken(m.identities, w.newUserName) || (w.hostMode === 'new' && w.newUserName === w.hostName)) {
            out.push({field: 'newUserName', message: `An identity named ${w.newUserName} already exists. Choose “Existing identities” to use it.`});
        }
    } else {
        const inGroup = m.identities.some(i => !i.isAdmin && i.attrs.includes(w.usersAttr) && !(w.hostMode === 'existing' && i.id === w.hostId));
        if (!w.userIds.length && !inGroup) out.push({field: 'userIds', message: `Nobody has #${w.usersAttr} yet, so nobody could use it. Pick at least one identity, or create a new user device.`});
    }
    return out;
}

export interface WizardItem { what: string; name: string; detail: string; existing?: boolean; }
export interface WizardPlan {
    ops: AcOp[]; items: WizardItem[]; title: string; summary: string; next: string[];
    /** Identities the plan creates, and existing ones it changes (shown at the top of the review). */
    created: string[]; updated: string[];
}

/**
 * The changes for one service end to end: its two configs, the service, the hosting identity,
 * the users, a Bind and a Dial policy, and router policies only where nothing covers them yet.
 * Policies select by role attribute, so nothing depends on ids created during the apply.
 */
export function plan(m: AcModel, w: WizardInput, newId: () => string): WizardPlan {
    const ops: AcOp[] = [];
    const items: WizardItem[] = [];
    const svc = w.serviceName;
    const port = (p: number) => ({low: p, high: p});

    const intercept = {id: newId(), name: `${svc}.intercept.v1`, type: 'intercept.v1',
        data: {protocols: w.protocols, addresses: [w.interceptHost.trim()], portRanges: [port(w.interceptPort)]}};
    const host = {id: newId(), name: `${svc}.host.v1`, type: 'host.v1',
        data: {protocol: w.protocols[0], address: w.hostAddress.trim(), port: w.hostPort}};
    ops.push({op: 'createConfig', config: intercept}, {op: 'createConfig', config: host});
    items.push({what: 'Config (intercept.v1)', name: intercept.name, detail: `users connect to ${w.interceptHost}:${w.interceptPort}`});
    items.push({what: 'Config (host.v1)', name: host.name, detail: `forwarded to ${w.hostAddress}:${w.hostPort} on the hosting identity`});

    const t = templateById(w.templateId);
    const svcAttrs = [...new Set([svc, t.slug])];
    const svcId = newId();
    ops.push({op: 'createService', service: {id: svcId, name: svc, attrs: svcAttrs, configs: [intercept.id, host.id],
        encryptionRequired: true, terminatorStrategy: 'smartrouting'}});
    items.push({what: 'Service', name: svc, detail: `role attributes ${svcAttrs.map(a => '#' + a).join(', ')}`});

    let hostLabel: string;
    if (w.hostMode === 'new') {
        ops.push({op: 'createIdentity', identity: {id: newId(), name: w.hostName, attrs: [w.hostsAttr]}});
        items.push({what: 'Identity (hosts it)', name: w.hostName, detail: `role attribute #${w.hostsAttr}; enroll it on the server`});
        hostLabel = w.hostName;
    } else {
        const h = m.identities.find(i => i.id === w.hostId)!;
        if (!h.attrs.includes(w.hostsAttr)) ops.push({op: 'addAttr', kind: 'identity', id: h.id, attr: w.hostsAttr});
        items.push({what: 'Identity (hosts it)', name: h.name, detail: `gets role attribute #${w.hostsAttr}`, existing: true});
        hostLabel = h.name;
    }

    const users: string[] = [];
    for (const id of w.userMode === 'existing' ? w.userIds : []) {
        const u = m.identities.find(i => i.id === id);
        if (!u) continue;
        users.push(u.name);
        if (!u.attrs.includes(w.usersAttr)) ops.push({op: 'addAttr', kind: 'identity', id, attr: w.usersAttr});
        items.push({what: 'Identity (user)', name: u.name, detail: `gets role attribute #${w.usersAttr}`, existing: true});
    }
    if (w.userMode === 'new' && w.newUserName) {
        ops.push({op: 'createIdentity', identity: {id: newId(), name: w.newUserName, attrs: [w.usersAttr]}});
        items.push({what: 'Identity (user)', name: w.newUserName, detail: `role attribute #${w.usersAttr}; enroll it on the user's device`});
        users.push(w.newUserName);
    }
    const already = m.identities.filter(i => !i.isAdmin && i.attrs.includes(w.usersAttr) && !users.includes(i.name)).map(i => i.name);

    ops.push({op: 'createPolicy', policy: {id: newId(), name: `${svc}-bind`, type: 'Bind', semantic: 'AnyOf',
        identityRoles: ['#' + w.hostsAttr], serviceRoles: ['#' + svc], posture: []}});
    items.push({what: 'Bind service policy', name: `${svc}-bind`, detail: `#${w.hostsAttr} hosts #${svc}`});
    ops.push({op: 'createPolicy', policy: {id: newId(), name: `${svc}-dial`, type: 'Dial', semantic: 'AnyOf',
        identityRoles: ['#' + w.usersAttr], serviceRoles: ['#' + svc], posture: []}});
    items.push({what: 'Dial service policy', name: `${svc}-dial`, detail: `#${w.usersAttr} may use #${svc}`});

    // Router policies only where the existing ones don't already cover the new pieces.
    const after = applyOps(clone(m), ops);
    const svcAfter = after.services.find(s => s.id === svcId)!;
    if (after.routers.length && !serviceRouters(after, svcAfter).length) {
        ops.push({op: 'createSerp', policy: {id: newId(), name: `${svc}-routers`, semantic: 'AnyOf', serviceRoles: ['#' + svc], routerRoles: ['#all']}});
        items.push({what: 'Service Router Policy', name: `${svc}-routers`, detail: `#${svc} may use all routers`});
    }
    const needRoutes = after.identities.filter(i => (i.attrs.includes(w.hostsAttr) || i.attrs.includes(w.usersAttr)) && !identityRouters(after, i).length);
    if (after.routers.length && needRoutes.length) {
        const roles = [...new Set(needRoutes.map(i => i.attrs.includes(w.hostsAttr) ? '#' + w.hostsAttr : '#' + w.usersAttr))];
        ops.push({op: 'createErPolicy', policy: {id: newId(), name: `${svc}-identities-routers`, semantic: 'AnyOf', identityRoles: roles, routerRoles: ['#all']}});
        items.push({what: 'Router Policy', name: `${svc}-identities-routers`, detail: `${roles.join(', ')} may use all routers`});
    }

    const next: string[] = [];
    if (w.hostMode === 'new') {
        next.push(`On the server, enroll ${w.hostName} with its one-time token (Identities → ${w.hostName} → Token): ` +
            `sudo ziti-edge-tunnel enroll --jwt ${w.hostName}.jwt --identity /opt/openziti/etc/identities/${w.hostName}.json, then restart ziti-edge-tunnel.`);
    }
    if (w.userMode === 'new' && w.newUserName) next.push(`Enroll ${w.newUserName} in Ziti Desktop Edge (or another tunneler) on that user's device with its token.`);
    next.push(`Users connect to ${w.interceptHost}:${w.interceptPort} with their usual client; Ziti carries it to ${w.hostAddress}:${w.hostPort} on ${hostLabel}.`);

    const who = [...users, ...already];
    const created = ops.filter(o => o.op === 'createIdentity').map((o: any) => o.identity.name);
    const updated = [...new Set(ops.filter(o => o.op === 'addAttr').map((o: any) => m.identities.find(i => i.id === o.id)?.name).filter(Boolean))] as string[];
    return {
        ops, items, next, created, updated,
        title: `Set up ${svc} for #${w.usersAttr}`,
        summary: `${t.label} on ${hostLabel}, reachable at ${w.interceptHost}:${w.interceptPort} by #${w.usersAttr}` +
            (who.length ? ` (${who.slice(0, 3).join(', ')}${who.length > 3 ? ` and ${who.length - 3} more` : ''})` : ' (nobody has it yet)') + '.',
    };
}
