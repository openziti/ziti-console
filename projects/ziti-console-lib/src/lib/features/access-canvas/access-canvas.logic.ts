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

/**
 * Pure, framework-free logic for the Access Canvas: role matching, effective access,
 * grant options with impact preview, and the "why can't X reach Y" advisor.
 *
 * Role strings follow the Edge Management API: "#attr" selects by role attribute,
 * "@<id>" selects one entity by id, and "#all" selects everything.
 */

export type Semantic = 'AnyOf' | 'AllOf';
export type AcKind = 'identity' | 'service' | 'router';

export interface AcIdentity { id: string; name: string; attrs: string[]; enrolled: boolean; online: boolean; isAdmin: boolean; }
export interface AcService {
    id: string; name: string; attrs: string[];
    // Kept so a pasted copy can reuse the same configs and settings.
    configs?: string[]; encryptionRequired?: boolean; terminatorStrategy?: string;
}
export interface AcRouter { id: string; name: string; attrs: string[]; online: boolean; }
export interface AcServicePolicy {
    id: string; name: string; type: 'Dial' | 'Bind'; semantic: Semantic;
    identityRoles: string[]; serviceRoles: string[]; posture: string[];
}
export interface AcErPolicy { id: string; name: string; semantic: Semantic; identityRoles: string[]; routerRoles: string[]; }
export interface AcSerp { id: string; name: string; semantic: Semantic; serviceRoles: string[]; routerRoles: string[]; }

export interface AcModel {
    identities: AcIdentity[];
    services: AcService[];
    routers: AcRouter[];
    servicePolicies: AcServicePolicy[];
    erPolicies: AcErPolicy[];
    serps: AcSerp[];
}

/** Canvas positions, shared through a config on the controller. Keys are canvas node keys. */
export interface AcLayout {
    v: 1;
    nodes: Record<string, { x: number; y: number }>;
    /** Groups created on the canvas that may not have members yet, as "kind:attr". */
    groups?: string[];
}

export interface AcNewIdentity { id: string; name: string; attrs: string[]; }
export interface AcNewService {
    id: string; name: string; attrs: string[];
    configs: string[]; encryptionRequired: boolean; terminatorStrategy: string;
}

/** A service configuration (intercept.v1 or host.v1) created alongside a service. */
export interface AcNewConfig { id: string; name: string; type: string; data: any; }

export type AcOp =
    | { op: 'addAttr'; kind: AcKind; id: string; attr: string }
    | { op: 'removeAttr'; kind: AcKind; id: string; attr: string }
    | { op: 'addIdentityRole'; policy: string; role: string }
    | { op: 'createPolicy'; policy: AcServicePolicy }
    | { op: 'createErPolicy'; policy: AcErPolicy }
    | { op: 'createSerp'; policy: AcSerp }
    | { op: 'createConfig'; config: AcNewConfig }
    | { op: 'createIdentity'; identity: AcNewIdentity }
    | { op: 'createService'; service: AcNewService };

/** Management API collection for each kind. */
export const KIND_API: Record<AcKind, string> = { identity: 'identities', service: 'services', router: 'edge-routers' };
export const KIND_LABEL: Record<AcKind, [string, string]> = {
    identity: ['identity', 'identities'], service: ['service', 'services'], router: ['router', 'routers'],
};

export function entitiesOf(m: AcModel, kind: AcKind): { id: string; name: string; attrs: string[] }[] {
    return kind === 'identity' ? m.identities : kind === 'service' ? m.services : m.routers;
}

export interface AcEndpoint { kind: 'group' | 'identity' | 'service'; attr?: string; id?: string; }

export interface AcImpact { pairs: number; identities: number; services: number; outside: string[]; noRoute: number; }
export interface AcOption {
    kind: 'attr' | 'newattr' | 'oneoff' | 'extend' | 'create';
    title: string; why: string; ops: AcOp[];
    impact: AcImpact; calls: string[]; exception: boolean; recommended: boolean; score: number;
}
export interface AcGrantResult {
    opts: AcOption[]; already: boolean; allowedBy: string[];
    srcLabel: string; tgtLabel: string; srcCount: number; tgtCount: number; unhosted: string[];
}
export interface AcStep { st: 'ok' | 'bad' | 'info'; t: string; d?: string; fix?: string; }

export const MGMT = '/edge/management/v1';

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

// ------------------------------------------------------------------ matching
type Entity = { id: string; name: string; attrs: string[] };

export function matchRole(e: Entity, r: string): boolean {
    if (r === '#all') return true;
    if (r[0] === '#') return e.attrs.includes(r.slice(1));
    if (r[0] === '@') return e.id === r.slice(1) || e.name === r.slice(1);
    return false;
}

export function matches(e: Entity, roles: string[], sem: Semantic = 'AnyOf'): boolean {
    if (!roles?.length) return false;
    return sem === 'AllOf' ? roles.every(r => matchRole(e, r)) : roles.some(r => matchRole(e, r));
}

export const dialFor = (m: AcModel, i: AcIdentity, s: AcService) =>
    m.servicePolicies.filter(p => p.type === 'Dial' && matches(i, p.identityRoles, p.semantic) && matches(s, p.serviceRoles, p.semantic));

export const bindsFor = (m: AcModel, s: AcService) =>
    m.servicePolicies.filter(p => p.type === 'Bind' && matches(s, p.serviceRoles, p.semantic));

export const isHost = (m: AcModel, i: AcIdentity) =>
    m.servicePolicies.some(p => p.type === 'Bind' && matches(i, p.identityRoles, p.semantic));

const isDialer = (m: AcModel, i: AcIdentity) =>
    m.servicePolicies.some(p => p.type === 'Dial' && matches(i, p.identityRoles, p.semantic));

/** Identities that use services: everything except admins and pure hosts. */
export const clients = (m: AcModel) => m.identities.filter(i => !i.isAdmin && (!isHost(m, i) || isDialer(m, i)));
export const hosts = (m: AcModel) => m.identities.filter(i => isHost(m, i));

export const hostsFor = (m: AcModel, s: AcService) =>
    m.identities.filter(h => bindsFor(m, s).some(p => matches(h, p.identityRoles, p.semantic)));

export const identityRouters = (m: AcModel, i: AcIdentity) =>
    m.routers.filter(r => m.erPolicies.some(p => matches(i, p.identityRoles, p.semantic) && matches(r, p.routerRoles, p.semantic)));

export const serviceRouters = (m: AcModel, s: AcService) =>
    m.routers.filter(r => m.serps.some(p => matches(s, p.serviceRoles, p.semantic) && matches(r, p.routerRoles, p.semantic)));

export function accessSet(m: AcModel): Set<string> {
    const set = new Set<string>();
    for (const i of clients(m)) for (const s of m.services) if (dialFor(m, i, s).length) set.add(i.id + '|' + s.id);
    return set;
}

export function canRoute(m: AcModel, i: AcIdentity, s: AcService): boolean {
    const sr = serviceRouters(m, s).map(r => r.id);
    const ir = identityRouters(m, i).some(r => sr.includes(r.id));
    const hr = hostsFor(m, s).some(h => identityRouters(m, h).some(r => sr.includes(r.id)));
    return ir && hr;
}

// ------------------------------------------------------------------ display helpers
export function roleLabel(m: AcModel, r: string): string {
    if (r[0] !== '@') return r;
    const id = r.slice(1);
    const e = [...m.identities, ...m.services, ...m.routers].find(x => x.id === id);
    return e ? '@' + e.name : r;
}

export function groups<T extends Entity>(list: T[]): [string, T[]][] {
    const map = new Map<string, T[]>();
    for (const e of list) {
        const keys = e.attrs.length ? e.attrs : [''];
        for (const a of keys) {
            if (!map.has(a)) map.set(a, []);
            map.get(a)!.push(e);
        }
    }
    return [...map.entries()].sort((a, b) => (Number(a[0] === '') - Number(b[0] === '')) || a[0].localeCompare(b[0]));
}

// ------------------------------------------------------------------ changes
export function applyOps(m: AcModel, ops: AcOp[]): AcModel {
    for (const op of ops) {
        if (op.op === 'addAttr') {
            const e = entitiesOf(m, op.kind).find(x => x.id === op.id);
            if (e && !e.attrs.includes(op.attr)) e.attrs.push(op.attr);
        } else if (op.op === 'removeAttr') {
            const e = entitiesOf(m, op.kind).find(x => x.id === op.id);
            if (e) e.attrs = e.attrs.filter(a => a !== op.attr);
        } else if (op.op === 'createIdentity') {
            m.identities.push({ id: op.identity.id, name: op.identity.name, attrs: [...op.identity.attrs], enrolled: false, online: false, isAdmin: false });
        } else if (op.op === 'createService') {
            const s = op.service;
            m.services.push({ id: s.id, name: s.name, attrs: [...s.attrs], configs: [...s.configs], encryptionRequired: s.encryptionRequired, terminatorStrategy: s.terminatorStrategy });
        } else if (op.op === 'addIdentityRole') {
            const p = m.servicePolicies.find(x => x.id === op.policy);
            if (p && !p.identityRoles.includes(op.role)) p.identityRoles.push(op.role);
        } else if (op.op === 'createPolicy') {
            m.servicePolicies.push(clone(op.policy));
        } else if (op.op === 'createErPolicy') {
            m.erPolicies.push(clone(op.policy));
        } else if (op.op === 'createSerp') {
            m.serps.push(clone(op.policy));
        }
    }
    return m;
}

/** The request each op becomes, shown before anything is sent. */
export function describeCalls(base: AcModel, ops: AcOp[]): string[] {
    const m = clone(base);
    const out: string[] = [];
    for (const op of ops) {
        applyOps(m, [op]);
        if (op.op === 'addAttr' || op.op === 'removeAttr') {
            const e = entitiesOf(m, op.kind).find(x => x.id === op.id);
            if (e) out.push(`PATCH ${MGMT}/${KIND_API[op.kind]}/${e.id}\n{ "roleAttributes": ${JSON.stringify(e.attrs)} }`);
        } else if (op.op === 'createIdentity') {
            out.push(`POST ${MGMT}/identities\n${JSON.stringify(identityBody(op.identity), null, 2)}`);
        } else if (op.op === 'createService') {
            out.push(`POST ${MGMT}/services\n${JSON.stringify(serviceBody(op.service), null, 2)}`);
        } else if (op.op === 'addIdentityRole') {
            const p = m.servicePolicies.find(x => x.id === op.policy)!;
            out.push(`PATCH ${MGMT}/service-policies/${p.id}\n{ "identityRoles": ${JSON.stringify(p.identityRoles)} }`);
        } else if (op.op === 'createPolicy') {
            out.push(`POST ${MGMT}/service-policies\n${JSON.stringify(policyBody(op.policy), null, 2)}`);
        } else if (op.op === 'createErPolicy') {
            out.push(`POST ${MGMT}/edge-router-policies\n${JSON.stringify(erPolicyBody(op.policy), null, 2)}`);
        } else if (op.op === 'createSerp') {
            out.push(`POST ${MGMT}/service-edge-router-policies\n${JSON.stringify(serpBody(op.policy), null, 2)}`);
        } else if (op.op === 'createConfig') {
            out.push(`POST ${MGMT}/configs   (config type ${op.config.type})\n${JSON.stringify({name: op.config.name, data: op.config.data}, null, 2)}`);
        }
    }
    return out;
}

export const policyBody = (p: AcServicePolicy) => ({
    name: p.name, type: p.type, semantic: p.semantic,
    identityRoles: p.identityRoles, serviceRoles: p.serviceRoles, postureCheckRoles: [] as string[],
});
export const erPolicyBody = (p: AcErPolicy) => ({
    name: p.name, semantic: p.semantic, identityRoles: p.identityRoles, edgeRouterRoles: p.routerRoles,
});
export const serpBody = (p: AcSerp) => ({
    name: p.name, semantic: p.semantic, serviceRoles: p.serviceRoles, edgeRouterRoles: p.routerRoles,
});
export const identityBody = (i: AcNewIdentity) => ({
    name: i.name, type: 'Default', isAdmin: false, roleAttributes: i.attrs, enrollment: { ott: true },
});
export const serviceBody = (s: AcNewService) => ({
    name: s.name, roleAttributes: s.attrs, configs: s.configs,
    encryptionRequired: s.encryptionRequired, terminatorStrategy: s.terminatorStrategy,
});

export function impact(base: AcModel, ops: AcOp[], tgtServiceIds: string[]): AcImpact {
    const after = applyOps(clone(base), ops);
    const a = accessSet(base), b = accessSet(after);
    const added = [...b].filter(k => !a.has(k)).map(k => k.split('|'));
    const svcAdded = new Set(added.map(x => x[1]));
    const byId = (id: string) => after.services.find(s => s.id === id)!;
    const ident = (id: string) => after.identities.find(i => i.id === id)!;
    return {
        pairs: added.length,
        identities: new Set(added.map(x => x[0])).size,
        services: svcAdded.size,
        outside: [...svcAdded].filter(s => !tgtServiceIds.includes(s)).map(s => byId(s).name),
        noRoute: new Set(added.filter(([i, s]) => !canRoute(after, ident(i), byId(s))).map(x => x[0])).size,
    };
}

const slug = (s: string) => s.replace(/^[#@]/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Ways to grant `src` Dial access to `tgt`, best first-class choice marked recommended. */
export function buildOptions(m: AcModel, src: AcEndpoint, tgt: AcEndpoint, newId: () => string): AcGrantResult {
    const srcIds = src.kind === 'group' ? clients(m).filter(i => i.attrs.includes(src.attr!)) : m.identities.filter(i => i.id === src.id);
    const tgtSvcs = tgt.kind === 'group' ? m.services.filter(s => s.attrs.includes(tgt.attr!)) : m.services.filter(s => s.id === tgt.id);
    const srcRole = src.kind === 'group' ? '#' + src.attr : '@' + srcIds[0].id;
    const tgtRole = tgt.kind === 'group' ? '#' + tgt.attr : '@' + tgtSvcs[0].id;
    const srcLabel = src.kind === 'group' ? '#' + src.attr : srcIds[0].name;
    const tgtLabel = tgt.kind === 'group' ? '#' + tgt.attr : tgtSvcs[0].name;
    const tgtSlug = tgt.kind === 'group' ? slug(tgt.attr!) : slug(tgtSvcs[0].name);
    const tgtIds = tgtSvcs.map(s => s.id);
    const already = srcIds.length > 0 && srcIds.every(i => tgtSvcs.every(s => dialFor(m, i, s).length));
    const allowedBy = [...new Set(srcIds.flatMap(i => tgtSvcs.flatMap(s => dialFor(m, i, s).map(p => p.name))))];
    const candidates = m.servicePolicies.filter(p => p.type === 'Dial' && tgtSvcs.every(s => matches(s, p.serviceRoles, p.semantic)));
    const rl = (roles: string[]) => roles.map(r => roleLabel(m, r)).join(', ');
    const opts: AcOption[] = [];
    const base = (kind: AcOption['kind'], score: number, title: string, why: string, ops: AcOp[], exception = false) =>
        opts.push({ kind, title, why, ops, exception, score, recommended: false, impact: null as any, calls: [] });

    if (src.kind === 'identity') {
        const i = srcIds[0], seen = new Set<string>();
        for (const p of candidates) for (const r of p.identityRoles) {
            if (r[0] !== '#' || r === '#all' || i.attrs.includes(r.slice(1)) || seen.has(r)) continue;
            seen.add(r);
            base('attr', 0, `Add ${r} to ${i.name}`,
                `${i.name} joins the ${r} group. ${p.name} already lets that group dial ${rl(p.serviceRoles)}.`,
                [{ op: 'addAttr', kind: 'identity', id: i.id, attr: r.slice(1) }]);
        }
        const newAttr = `${tgtSlug}-users`;
        base('newattr', 1, `Create group #${newAttr} for ${tgtLabel}`,
            `Gives ${i.name} #${newAttr} and creates a Dial policy for that group, so the next person needs only the attribute.`,
            [{ op: 'addAttr', kind: 'identity', id: i.id, attr: newAttr },
             { op: 'createPolicy', policy: { id: newId(), name: `${newAttr}-dial`, type: 'Dial', semantic: 'AnyOf', identityRoles: ['#' + newAttr], serviceRoles: [tgtRole], posture: [] } }]);
        base('oneoff', 3, `One-off policy for ${i.name}`,
            `A Dial policy naming ${i.name} directly. Fine for a one-time exception, but it doesn't scale and hides intent.`,
            [{ op: 'createPolicy', policy: { id: newId(), name: `${slug(i.name)}-${tgtSlug}-dial`, type: 'Dial', semantic: 'AnyOf', identityRoles: [srcRole], serviceRoles: [tgtRole], posture: [] } }], true);
    } else {
        for (const p of candidates) if (!p.identityRoles.includes(srcRole)) {
            base('extend', 0, `Add ${srcRole} to policy ${p.name}`,
                `${p.name} already grants ${rl(p.serviceRoles)}${p.posture.length ? ` with posture checks (${p.posture.join(', ')})` : ''}. One role added, no new policy.`,
                [{ op: 'addIdentityRole', policy: p.id, role: srcRole }]);
        }
        base('create', 1, `Create Dial policy ${slug(srcRole)}-${tgtSlug}-dial`,
            `A new policy: ${srcLabel} may dial ${tgtLabel}. Clear and separate, at the cost of one more policy.`,
            [{ op: 'createPolicy', policy: { id: newId(), name: `${slug(srcRole)}-${tgtSlug}-dial`, type: 'Dial', semantic: 'AnyOf', identityRoles: [srcRole], serviceRoles: [tgtRole], posture: [] } }]);
    }
    for (const o of opts) {
        o.impact = impact(m, o.ops, tgtIds);
        o.calls = describeCalls(m, o.ops);
        o.score += (o.impact.outside.length ? 2.5 : 0) + (o.exception ? 1 : 0);
    }
    if (opts.length) opts.reduce((a, b) => (b.score < a.score ? b : a)).recommended = true;
    return {
        opts, already, allowedBy, srcLabel, tgtLabel, srcCount: srcIds.length, tgtCount: tgtSvcs.length,
        unhosted: tgtSvcs.filter(s => !hostsFor(m, s).length).map(s => s.name),
    };
}

// ------------------------------------------------------------------ advisor
export function advise(m: AcModel, i: AcIdentity, s: AcService): AcStep[] {
    const steps: AcStep[] = [];
    const attrs = (a: string[]) => a.length ? a.map(x => '#' + x).join(', ') : 'no attributes';
    if (!i.enrolled) steps.push({ st: 'bad', t: "Identity isn't enrolled", d: 'It has no certificate yet, so it cannot sign in to the network.', fix: 'Open the identity and enroll it with its JWT or QR code in a Ziti tunneler.' });

    const dial = dialFor(m, i, s);
    steps.push(dial.length
        ? { st: 'ok', t: 'Dial allowed', d: `by ${dial.map(p => p.name).join(', ')}` }
        : { st: 'bad', t: 'No Dial policy matches both', d: `${i.name} has ${attrs(i.attrs)}; ${s.name} has ${attrs(s.attrs)}.`, fix: `Drag ${i.name} (or its group) onto ${s.name} to choose how to grant it.` });
    if (dial.length) {
        const free = dial.some(p => !p.posture.length);
        steps.push(free
            ? { st: 'ok', t: 'No posture checks required' }
            : { st: 'info', t: `Posture checks: ${[...new Set(dial.flatMap(p => p.posture))].join(', ')}`, d: 'The device must pass them when it connects.' });
    }

    const hsAll = hostsFor(m, s), hs = hsAll.filter(h => h.enrolled);
    if (!hsAll.length) steps.push({ st: 'bad', t: 'Nothing hosts this service', d: 'No Bind policy gives any identity this service, so there is no far end.', fix: 'Open the service in Simple Service and add a hosting identity.' });
    else if (!hs.length) steps.push({ st: 'bad', t: "Its hosts aren't enrolled", d: hsAll.map(h => h.name).join(', '), fix: 'Enroll the hosting identity on the server that runs the service.' });
    else steps.push({ st: 'ok', t: 'Service is hosted', d: `by ${hs.map(h => h.name).join(', ')} (${bindsFor(m, s).map(p => p.name).join(', ')})` });

    const ir = identityRouters(m, i);
    steps.push(ir.length
        ? { st: 'ok', t: 'Identity can use edge routers', d: ir.map(r => r.name).join(', ') }
        : { st: 'bad', t: 'Identity has no edge routers', d: `No edge router policy includes ${i.name} (${attrs(i.attrs)}).`, fix: `Add ${i.attrs[0] ? '#' + i.attrs[0] : i.name} to an edge router policy.` });

    const sr = serviceRouters(m, s);
    if (ir.length) {
        const common = ir.filter(r => sr.some(x => x.id === r.id));
        const online = common.filter(r => r.online);
        const label = (r: AcRouter) => r.name + (r.online ? '' : ' (offline)');
        steps.push(!common.length
            ? { st: 'bad', t: 'No shared router carries the service', d: `${i.name}'s routers don't serve ${s.name}.`, fix: 'Widen the service edge router policy.' }
            : online.length
                ? { st: 'ok', t: 'A shared router is online', d: common.map(label).join(', ') }
                : { st: 'bad', t: 'Every shared router is offline', d: common.map(label).join(', '), fix: 'Bring a router back online, or allow this identity on another router.' });
    }
    if (hs.length) {
        const ok = hs.some(h => identityRouters(m, h).some(r => sr.some(x => x.id === r.id)));
        steps.push(ok ? { st: 'ok', t: 'A host can reach a router that carries it' }
            : { st: 'bad', t: "Hosts can't reach a router that carries it", fix: "Add the hosts' attribute to an edge router policy." });
    }
    return steps;
}

// ------------------------------------------------------------------ getting started

export const CONCEPTS: Record<string, string> = {
    identities: 'An identity is a person, device or app with its own certificate. Policies select identities by role attribute (#sales), not one by one. @name picks a single identity; keep it for exceptions.',
    dial: 'A Dial policy lets identities use (connect to) services. Both sides are chosen by attribute. AnyOf means matching any listed role is enough; AllOf means all of them.',
    services: 'A service is something you publish on the overlay: an app, an API, an SSH port. Clients reach it through an intercept address, and it needs no open port on the internet.',
    bind: 'A Bind policy says which identities host a service. They run a tunneler or SDK next to the real server and receive its traffic.',
    hosts: 'Hosting identities sit next to the real server and forward overlay traffic to it. A service without an enrolled host has nowhere to go.',
    routers: 'Edge routers carry the traffic. An identity needs an edge router policy that allows it on a router, and the service needs a service edge router policy for that same router.',
};
