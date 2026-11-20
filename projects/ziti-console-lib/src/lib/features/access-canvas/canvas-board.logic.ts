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
 * Pure logic for the free-form Access Canvas board: which boxes exist, how policies connect
 * them, where they sit, what is filtered out, what looks broken, and what a cut/copy/paste
 * or drag means as API changes. No Angular here, so it can be unit tested on its own.
 *
 * Board vocabulary:
 *   group  a box for one role attribute of one kind ("identity #sales"); its cards are members
 *   free   a card for an entity that has no role attributes, so it belongs to no group
 *   hub    a small pill for one policy; lines run from the policy's identity side to the hub
 *          and from the hub to its service or router side
 */

import {
    AcIdentity, AcKind, AcLayout, AcModel, AcOp, AcService, KIND_LABEL, Semantic, dialFor, entitiesOf,
    hostsFor, identityRouters, isHost, matches, serviceRouters,
} from './access-canvas.logic';

export type HubFamily = 'dial' | 'bind' | 'erp' | 'serp';

export interface BoardMember {
    kind: AcKind; id: string; name: string;
    problems: string[];
    /** Its membership in this group is a pending change. */
    pending: boolean;
    hit: boolean;
}

export interface BoardNode {
    key: string;
    type: 'group' | 'free' | 'hub';
    kind?: AcKind;              // group, free
    attr?: string;              // group
    entity?: BoardMember;       // free
    policy?: { id: string; name: string; family: HubFamily; semantic: Semantic; posture: string[]; all: string[] };
    members: BoardMember[];     // group (all) ; [] otherwise
    shown: BoardMember[];       // group members drawn as rows
    more: number;               // group members not drawn
    x: number; y: number; w: number; h: number;
    problems: string[];         // own problems (free card, hub) or a summary (group)
    problemCount: number;
    pending: boolean;
    hit: boolean;               // matches the name search
    dim: boolean;               // visible but outside the focus of the active filters
}

export interface Anchor { node: string; member?: string; }

export interface BoardEdge {
    id: string; family: HubFamily; policy: string;
    from: Anchor; to: Anchor;
    pending: boolean; byName: boolean;
}

export interface BoardFilters {
    types: Record<AcKind, boolean>;
    /** Attribute names; when any are set only those groups (and what their policies connect) show. */
    attrs: string[];
    search: string;
    problemsOnly: boolean;
}

export interface BoardMarks {
    /** "kind:id:attr" memberships added or removed by pending changes. */
    attrs: Set<string>;
    policies: Set<string>;
    roles: Set<string>;
    created: Set<string>;
}

export interface Board { nodes: BoardNode[]; edges: BoardEdge[]; }

// ------------------------------------------------------------------ keys and geometry
export const groupKey = (kind: AcKind, attr: string) => `g:${kind}:${attr}`;
export const freeKey = (kind: AcKind, id: string) => `e:${kind}:${id}`;
export const hubKey = (family: HubFamily, id: string) => `p:${family}:${id}`;

export const GEO = {
    groupW: 240, headerH: 38, rowH: 26, padB: 8, moreH: 26, maxRows: 8,
    freeW: 200, freeH: 40, hubH: 26, hubMinW: 80, hubMaxW: 260,
    colGap: 140, rowGap: 28,
};

export function groupHeight(shown: number, more: boolean): number {
    return GEO.headerH + Math.max(1, shown) * GEO.rowH + (more ? GEO.moreH : 0) + GEO.padB;
}
export const hubWidth = (name: string) => Math.max(GEO.hubMinW, Math.min(GEO.hubMaxW, 34 + name.length * 7));

// ------------------------------------------------------------------ problems
/** Things that stop an identity, service or router from working, in plain words. */
export function entityProblems(m: AcModel, kind: AcKind, id: string): string[] {
    const out: string[] = [];
    if (kind === 'identity') {
        const i = m.identities.find(x => x.id === id);
        if (!i || i.isAdmin) return out;
        if (!i.enrolled) out.push('Not enrolled');
        const host = isHost(m, i);
        const dials = m.services.some(s => dialFor(m, i, s).length);
        if ((host || dials) && !identityRouters(m, i).length) out.push('No edge router policy');
        if (host && i.enrolled && !i.online) out.push('Hosting identity is offline');
    } else if (kind === 'service') {
        const s = m.services.find(x => x.id === id);
        if (!s) return out;
        const hs = hostsFor(m, s);
        if (!hs.length) out.push('Not hosted');
        else if (!hs.some(h => h.enrolled)) out.push('Host not enrolled');
        if (!serviceRouters(m, s).length) out.push('No service edge router policy');
        if (!m.identities.some(i => !i.isAdmin && dialFor(m, i, s).length)) out.push('Nobody can use it');
    } else {
        const r = m.routers.find(x => x.id === id);
        if (r && !r.online) out.push('Offline');
    }
    return out;
}

// ------------------------------------------------------------------ roles
const roleKinds: Record<HubFamily, [AcKind, AcKind]> = {
    dial: ['identity', 'service'], bind: ['identity', 'service'], erp: ['identity', 'router'], serp: ['service', 'router'],
};

interface PolicyView {
    id: string; name: string; family: HubFamily; semantic: Semantic; posture: string[];
    left: string[]; right: string[];
}

function policies(m: AcModel): PolicyView[] {
    return [
        ...m.servicePolicies.map(p => ({
            id: p.id, name: p.name, family: (p.type === 'Dial' ? 'dial' : 'bind') as HubFamily, semantic: p.semantic,
            posture: p.posture, left: p.identityRoles, right: p.serviceRoles,
        })),
        ...m.erPolicies.map(p => ({ id: p.id, name: p.name, family: 'erp' as HubFamily, semantic: p.semantic, posture: [], left: p.identityRoles, right: p.routerRoles })),
        ...m.serps.map(p => ({ id: p.id, name: p.name, family: 'serp' as HubFamily, semantic: p.semantic, posture: [], left: p.serviceRoles, right: p.routerRoles })),
    ];
}

/** Visible entities of a kind: admins and router identities are not drawn as identities. */
function drawn(m: AcModel, kind: AcKind) {
    return kind === 'identity' ? m.identities.filter(i => !i.isAdmin) : entitiesOf(m, kind);
}

// ------------------------------------------------------------------ build
export interface BuildOptions {
    layout: AcLayout;
    filters: BoardFilters;
    marks: BoardMarks;
    expanded: Set<string>;
}

/**
 * Builds the board for the draft model: groups, free cards, policy hubs, their edges,
 * positions (saved, else automatic) and filter state.
 */
export function buildBoard(m: AcModel, o: BuildOptions): Board {
    const q = o.filters.search.trim().toLowerCase().replace(/^[#@]/, '');
    const hitText = (s: string) => !!q && s.toLowerCase().includes(q);
    const nodes = new Map<string, BoardNode>();

    const member = (kind: AcKind, e: { id: string; name: string; attrs: string[] }, attr?: string): BoardMember => ({
        kind, id: e.id, name: e.name, problems: entityProblems(m, kind, e.id),
        pending: !!attr && (o.marks.attrs.has(`${kind}:${e.id}:${attr}`) || o.marks.created.has(e.id)),
        hit: hitText(e.name),
    });

    const ensureGroup = (kind: AcKind, attr: string) => {
        const key = groupKey(kind, attr);
        if (!nodes.has(key)) nodes.set(key, {
            key, type: 'group', kind, attr, members: [], shown: [], more: 0, x: 0, y: 0, w: GEO.groupW, h: 0,
            problems: [], problemCount: 0, pending: false, hit: hitText(attr), dim: false,
        });
        return nodes.get(key)!;
    };

    for (const kind of ['identity', 'service', 'router'] as AcKind[]) {
        for (const e of drawn(m, kind)) {
            if (!e.attrs.length) {
                const ent = member(kind, e);
                nodes.set(freeKey(kind, e.id), {
                    key: freeKey(kind, e.id), type: 'free', kind, entity: ent, members: [], shown: [], more: 0,
                    x: 0, y: 0, w: GEO.freeW, h: GEO.freeH, problems: ent.problems, problemCount: ent.problems.length,
                    pending: o.marks.created.has(e.id), hit: ent.hit, dim: false,
                });
                continue;
            }
            for (const a of e.attrs) ensureGroup(kind, a).members.push(member(kind, e, a));
        }
    }
    // Groups a policy selects but nobody has yet, and groups created on the canvas.
    const pols = policies(m);
    for (const p of pols) {
        const [lk, rk] = roleKinds[p.family];
        for (const r of p.left) if (r[0] === '#' && r !== '#all') ensureGroup(lk, r.slice(1));
        for (const r of p.right) if (r[0] === '#' && r !== '#all') ensureGroup(rk, r.slice(1));
    }
    for (const g of o.layout.groups || []) {
        const i = g.indexOf(':');
        const kind = g.slice(0, i) as AcKind, attr = g.slice(i + 1);
        if (kind === 'identity' || kind === 'service' || kind === 'router') ensureGroup(kind, attr);
    }

    // Hubs and edges.
    const edges: BoardEdge[] = [];
    const anchorFor = (kind: AcKind, role: string): Anchor | null | 'all' => {
        if (role === '#all') return 'all';
        if (role[0] === '#') return { node: groupKey(kind, role.slice(1)) };
        if (role[0] !== '@') return null;
        const ref = role.slice(1);
        const e = drawn(m, kind).find(x => x.id === ref || x.name === ref);
        if (!e) return null;
        if (!e.attrs.length) return { node: freeKey(kind, e.id) };
        return { node: groupKey(kind, [...e.attrs].sort()[0]), member: e.id };
    };
    for (const p of pols) {
        const key = hubKey(p.family, p.id);
        const [lk, rk] = roleKinds[p.family];
        const all: string[] = [];
        const problems: string[] = [];
        const pend = o.marks.policies.has(p.id);
        const side = (roles: string[], kind: AcKind, left: boolean) => {
            let matched = 0;
            for (const r of roles) {
                const a = anchorFor(kind, r);
                if (a === 'all') { all.push(`all ${KIND_LABEL[kind][1]}`); matched++; continue; }
                if (!a) { problems.push(r[0] === '@' ? `Names a missing ${KIND_LABEL[kind][0]}: ${r}` : `Role not understood: ${r}`); continue; }
                matched++;
                const e: BoardEdge = {
                    id: `${key}|${left ? 'L' : 'R'}|${r}`, family: p.family, policy: p.id,
                    from: left ? a : { node: key }, to: left ? { node: key } : a,
                    pending: pend || o.marks.roles.has(`${p.id}:${r}`), byName: r[0] === '@',
                };
                edges.push(e);
            }
            const sel = drawn(m, kind).filter(x => matches(x, roles, p.semantic)).length;
            if (roles.length && !sel) {
                const want = roles.join(p.semantic === 'AllOf' ? ' and ' : ' or ');
                problems.push(`Selects no ${KIND_LABEL[kind][1]}: none has ${want}`);
            }
            return matched;
        };
        side(p.left, lk, true);
        side(p.right, rk, false);
        nodes.set(key, {
            key, type: 'hub', policy: { id: p.id, name: p.name, family: p.family, semantic: p.semantic, posture: p.posture, all },
            members: [], shown: [], more: 0, x: 0, y: 0, w: hubWidth(p.name), h: GEO.hubH,
            problems: [...new Set(problems)], problemCount: new Set(problems).size, pending: pend, hit: hitText(p.name), dim: false,
        });
    }

    // Group sizes and summaries.
    for (const n of nodes.values()) {
        if (n.type !== 'group') continue;
        n.members.sort((a, b) => a.name.localeCompare(b.name));
        // While filtering by name, a group matched through its members lists only those members.
        const narrowed = !!q && !n.hit && !o.expanded.has(n.key) && n.members.some(x => x.hit);
        n.shown = narrowed ? n.members.filter(x => x.hit)
            : o.expanded.has(n.key) ? n.members : n.members.slice(0, GEO.maxRows);
        n.more = n.members.length - n.shown.length;
        n.h = groupHeight(n.shown.length, n.more > 0);
        const bad = n.members.filter(x => x.problems.length);
        n.problemCount = bad.length;
        n.problems = bad.length ? [`${bad.length} of ${n.members.length} with problems`] : [];
        n.pending = n.members.some(x => x.pending) || (o.layout.groups || []).includes(`${n.kind}:${n.attr}`) && !n.members.length;
        if (narrowed) n.hit = true;
    }

    const all = [...nodes.values()];
    placeNodes(m, all, edges, o.layout);
    applyFilters(all, edges, o.filters);
    return { nodes: all, edges };
}

// ------------------------------------------------------------------ filters
/**
 * Hides nodes outside the type filter; with attribute, problem or name filters, keeps the
 * matching nodes plus (dimmed) whatever their policies connect them to.
 * Hidden nodes are removed from the array; edges to them are dropped.
 */
export function applyFilters(nodes: BoardNode[], edges: BoardEdge[], f: BoardFilters): void {
    const byKey = new Map(nodes.map(n => [n.key, n]));
    const hubKinds: Record<HubFamily, AcKind[]> = roleKinds as any;
    const typeOk = (n: BoardNode) => n.type === 'hub'
        ? hubKinds[n.policy!.family].every(k => f.types[k])
        : f.types[n.kind!];
    let visible = new Set(nodes.filter(typeOk).map(n => n.key));

    const ends = (e: BoardEdge) => [e.from.node, e.to.node];
    const neighbours = (keys: Set<string>) => {
        const out = new Set(keys);
        // node -> hubs touching it -> everything those hubs touch
        const hubs = new Set<string>();
        for (const e of edges) for (const k of ends(e)) if (keys.has(k)) ends(e).forEach(x => { if (byKey.get(x)?.type === 'hub') hubs.add(x); });
        for (const k of keys) if (byKey.get(k)?.type === 'hub') hubs.add(k);
        for (const e of edges) if (ends(e).some(k => hubs.has(k))) ends(e).forEach(k => out.add(k));
        hubs.forEach(h => out.add(h));
        return out;
    };

    const attrSeed = f.attrs.length ? new Set(nodes.filter(n => n.type === 'group' && f.attrs.includes(n.attr!)).map(n => n.key)) : null;
    const probSeed = f.problemsOnly ? new Set(nodes.filter(n => n.problemCount > 0).map(n => n.key)) : null;
    const nameSeed = f.search.trim() ? new Set(nodes.filter(n => n.hit).map(n => n.key)) : null;
    for (const seed of [attrSeed, probSeed, nameSeed]) {
        if (!seed) continue;
        const keep = neighbours(seed);
        visible = new Set([...visible].filter(k => keep.has(k)));
        for (const n of nodes) if (keep.has(n.key) && !seed.has(n.key)) n.dim = true;
    }
    // A hub is only useful with something on both sides (or "all").
    for (const n of nodes) {
        if (n.type !== 'hub' || !visible.has(n.key)) continue;
        const sides = edges.filter(e => e.policy === n.policy!.id)
            .map(e => (e.to.node === n.key ? e.from.node : e.to.node)).filter(k => visible.has(k));
        if (!sides.length && !n.policy!.all.length) visible.delete(n.key);
    }

    for (let i = nodes.length - 1; i >= 0; i--) if (!visible.has(nodes[i].key)) nodes.splice(i, 1);
    for (let i = edges.length - 1; i >= 0; i--) if (!ends(edges[i]).every(k => visible.has(k))) edges.splice(i, 1);
}

// ------------------------------------------------------------------ placement
/**
 * Saved positions win. Everything else is placed in columns: people who use services,
 * Dial policies, services, Bind policies, hosts; routers and router policies underneath.
 * Hubs without a saved position sit level with what they connect.
 */
export function placeNodes(m: AcModel, nodes: BoardNode[], edges: BoardEdge[], layout: AcLayout): void {
    const saved = layout.nodes || {};
    const byKey = new Map(nodes.map(n => [n.key, n]));
    const col = (n: BoardNode): number => {
        if (n.type === 'hub') return { dial: 1, bind: 3, erp: 6, serp: 7 }[n.policy!.family];
        if (n.kind === 'service') return 2;
        if (n.kind === 'router') return 8;
        const ids = n.type === 'group' ? n.members.map(x => x.id) : [n.entity!.id];
        const list = ids.map(id => m.identities.find(i => i.id === id)).filter(Boolean) as AcIdentity[];
        if (!list.length && n.type === 'group') {
            // Empty group: place it by the policies that select it (hosts on the right).
            const role = '#' + n.attr;
            const bind = m.servicePolicies.some(p => p.type === 'Bind' && p.identityRoles.includes(role));
            const dial = m.servicePolicies.some(p => p.type === 'Dial' && p.identityRoles.includes(role));
            return bind && !dial ? 4 : 0;
        }
        const hostOnly = list.length > 0 && list.every(i => isHost(m, i) && !m.services.some(s => dialFor(m, i, s).length));
        return hostOnly ? 4 : 0;
    };
    const step = GEO.groupW + GEO.colGap;
    const colX: Record<number, number> = { 0: 0, 1: step, 2: step * 2, 3: step * 3, 4: step * 4 };
    const fixed = nodes.filter(n => saved[n.key]);
    for (const n of fixed) { n.x = saved[n.key].x; n.y = saved[n.key].y; }

    const nextY: Record<number, number> = {};
    const bottomOf = (x0: number, x1: number) => fixed.filter(n => n.x < x1 && n.x + n.w > x0).reduce((y, n) => Math.max(y, n.y + n.h + GEO.rowGap), 0);
    const sortKey = (n: BoardNode) => (n.type === 'group' ? n.attr! : n.type === 'free' ? '~' + n.entity!.name : n.policy!.name).toLowerCase();

    // Entities first (columns 0, 2, 4), then routers in a band below them.
    const loose = nodes.filter(n => !saved[n.key]).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    for (const c of [0, 2, 4]) {
        nextY[c] = bottomOf(colX[c], colX[c] + GEO.groupW);
        for (const n of loose.filter(x => x.type !== 'hub' && col(x) === c)) {
            n.x = colX[c]; n.y = nextY[c]; nextY[c] += n.h + GEO.rowGap;
        }
    }
    const placedBottom = Math.max(0, ...nodes.filter(n => n.type !== 'hub' && col(n) !== 8).map(n => n.y + n.h));
    const routerBandY = placedBottom + 160;
    let rx = 0;
    for (const n of loose.filter(x => x.type !== 'hub' && col(x) === 8)) { n.x = rx; n.y = routerBandY + 120; rx += n.w + GEO.colGap / 2; }

    // Hubs: between their endpoints, nudged down to avoid overlaps in their lane.
    const centre = (a: Anchor) => { const t = byKey.get(a.node); return t ? { x: t.x + t.w / 2, y: t.y + Math.min(t.h / 2, 60) } : null; };
    const lanes = new Map<string, number[]>();
    for (const n of loose.filter(x => x.type === 'hub')) {
        const pts = edges.filter(e => e.policy === n.policy!.id).map(e => centre(e.from.node === n.key ? e.to : e.from)).filter(Boolean) as { x: number; y: number }[];
        const fam = n.policy!.family;
        let x: number, y: number;
        if (pts.length) {
            x = pts.reduce((s, p) => s + p.x, 0) / pts.length - n.w / 2;
            y = pts.reduce((s, p) => s + p.y, 0) / pts.length - n.h / 2;
        } else { x = colX[col(n)] ?? 0; y = fam === 'erp' || fam === 'serp' ? routerBandY : 0; }
        if (fam === 'dial') x = colX[1] + (GEO.groupW - n.w) / 2;
        if (fam === 'bind') x = colX[3] + (GEO.groupW - n.w) / 2;
        if (fam === 'erp' || fam === 'serp') y = routerBandY + (fam === 'serp' ? 40 : 0);
        const lane = fam + ':' + Math.round(x / 50);
        const taken = lanes.get(lane) || [];
        while (taken.some(t => Math.abs(t - y) < GEO.hubH + 8)) y += GEO.hubH + 8;
        taken.push(y); lanes.set(lane, taken);
        n.x = Math.round(x); n.y = Math.round(y);
    }
}

// ------------------------------------------------------------------ edge geometry
export interface Rect { x: number; y: number; w: number; h: number; }

/** Where a line meets a node: a member row if that row is drawn, else the node's header. */
export function anchorRect(nodes: Map<string, BoardNode>, a: Anchor): Rect | null {
    const n = nodes.get(a.node);
    if (!n) return null;
    if (n.type === 'group' && a.member) {
        const i = n.shown.findIndex(x => x.id === a.member);
        if (i >= 0) return { x: n.x, y: n.y + GEO.headerH + i * GEO.rowH, w: n.w, h: GEO.rowH };
    }
    if (n.type === 'group') return { x: n.x, y: n.y, w: n.w, h: GEO.headerH };
    return { x: n.x, y: n.y, w: n.w, h: n.h };
}

export function edgePath(nodes: Map<string, BoardNode>, e: BoardEdge): string {
    const a = anchorRect(nodes, e.from), b = anchorRect(nodes, e.to);
    if (!a || !b) return '';
    const ay = a.y + a.h / 2, by = b.y + b.h / 2;
    let x1: number, x2: number;
    if (a.x + a.w <= b.x) { x1 = a.x + a.w; x2 = b.x; }
    else if (b.x + b.w <= a.x) { x1 = a.x; x2 = b.x + b.w; }
    else { x1 = a.x + a.w; x2 = b.x + b.w; }   // overlapping columns: loop out on the right
    const bend = Math.max(40, Math.abs(x2 - x1) / 2);
    const c1 = x1 + (x1 <= x2 || a.x + a.w === x1 ? bend : -bend);
    const c2 = x2 + (x1 <= x2 ? -bend : bend);
    return `M${x1},${ay} C${c1},${ay} ${c2},${by} ${x2},${by}`;
}

export function boardBounds(nodes: BoardNode[]): Rect {
    if (!nodes.length) return { x: 0, y: 0, w: 0, h: 0 };
    const x0 = Math.min(...nodes.map(n => n.x)), y0 = Math.min(...nodes.map(n => n.y));
    const x1 = Math.max(...nodes.map(n => n.x + n.w)), y1 = Math.max(...nodes.map(n => n.y + n.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ------------------------------------------------------------------ clipboard and drag semantics
export interface ClipItem { kind: AcKind; id: string; name: string; attrs: string[]; fromAttr?: string; }
export interface Clip { mode: 'copy' | 'cut'; items: ClipItem[]; }
export interface Intent { title: string; summary: string; ops: AcOp[]; }
export type IntentResult = Intent | { error: string };

const plural = (n: number, kind: AcKind) => `${n} ${KIND_LABEL[kind][n === 1 ? 0 : 1]}`;
const names = (xs: { name: string }[]) => xs.length <= 3 ? xs.map(x => x.name).join(', ') : `${xs.slice(0, 2).map(x => x.name).join(', ')} and ${xs.length - 2} more`;

/** Removing what was cut: the group it was cut from, or every attribute it was copied with. */
function cutOps(it: ClipItem, keep: string[] = []): AcOp[] {
    const from = it.fromAttr ? [it.fromAttr] : it.attrs;
    return from.filter(a => !keep.includes(a)).map(a => ({ op: 'removeAttr', kind: it.kind, id: it.id, attr: a } as AcOp));
}

/** Paste into a group: the items join it. Cut items also leave where they were cut from. */
export function pasteIntoGroup(m: AcModel, clip: Clip, kind: AcKind, attr: string): IntentResult {
    const items = clip.items.filter(i => i.kind === kind);
    if (!items.length) return { error: `Only ${KIND_LABEL[kind][1]} can go into an ${KIND_LABEL[kind][0]} group.` };
    const ops: AcOp[] = [];
    for (const it of items) {
        const cur = entitiesOf(m, kind).find(x => x.id === it.id);
        if (!cur) continue;
        if (!cur.attrs.includes(attr)) ops.push({ op: 'addAttr', kind, id: it.id, attr });
        if (clip.mode === 'cut') ops.push(...cutOps(it, [attr]));
    }
    if (!ops.length) return { error: `Already in #${attr}.` };
    const verb = clip.mode === 'cut' ? 'Move' : 'Add';
    return {
        title: `${verb} ${names(items)} ${clip.mode === 'cut' ? 'to' : 'to group'} #${attr}`,
        summary: `${plural(items.length, kind)} ${clip.mode === 'cut' ? 'moved into' : 'added to'} #${attr}; they get whatever access #${attr} has.`,
        ops,
    };
}

/** Paste onto entities: each target gains the copied items' attributes (same access). */
export function pasteOntoEntities(m: AcModel, clip: Clip, targets: { kind: AcKind; id: string }[]): IntentResult {
    const kind = targets[0]?.kind;
    const items = clip.items.filter(i => i.kind === kind);
    if (!kind || !items.length) return { error: 'Paste access onto the same kind of thing you copied (identity onto identity, service onto service).' };
    const attrs = [...new Set(items.flatMap(i => i.fromAttr ? [i.fromAttr] : i.attrs))];
    if (!attrs.length) return { error: `${names(items)} ${items.length === 1 ? 'has' : 'have'} no attributes to copy.` };
    const ops: AcOp[] = [];
    const tgts = targets.map(t => entitiesOf(m, t.kind).find(x => x.id === t.id)!).filter(Boolean);
    for (const t of tgts) for (const a of attrs) if (!t.attrs.includes(a)) ops.push({ op: 'addAttr', kind, id: t.id, attr: a });
    if (clip.mode === 'cut') for (const it of items) if (!tgts.some(t => t.id === it.id)) ops.push(...cutOps(it));
    if (!ops.length) return { error: `${names(tgts)} already ${tgts.length === 1 ? 'has' : 'have'} ${attrs.map(a => '#' + a).join(', ')}.` };
    return {
        title: `${clip.mode === 'cut' ? 'Move' : 'Copy'} access from ${names(items)} to ${names(tgts)}`,
        summary: `${names(tgts)} gain${tgts.length === 1 ? 's' : ''} ${attrs.map(a => '#' + a).join(', ')}` +
            (clip.mode === 'cut' ? `; ${names(items)} lose${items.length === 1 ? 's' : ''} ${items.some(i => i.fromAttr) ? 'that group' : 'them'}.` : '.') +
            ' Policies that name an identity directly (@name) are not copied.',
        ops,
    };
}

export function uniqueName(base: string, taken: string[]): string {
    const set = new Set(taken.map(t => t.toLowerCase()));
    let n = `${base}-copy`;
    for (let i = 2; set.has(n.toLowerCase()); i++) n = `${base}-copy-${i}`;
    return n;
}

/** Paste on empty canvas: new identities or services with the same attributes (and configs). */
export function pasteAsNew(m: AcModel, clip: Clip, newId: () => string): IntentResult & { created?: { kind: AcKind; id: string }[] } {
    if (clip.mode === 'cut') return { error: 'Cut items can only be pasted into a group or onto another item. Use Copy to make new ones.' };
    const items = clip.items.filter(i => i.kind !== 'router');
    if (!items.length) return { error: "Routers can't be created from the canvas; they enroll with their own JWT." };
    const ops: AcOp[] = [];
    const created: { kind: AcKind; id: string }[] = [];
    const newNames: { name: string }[] = [];
    const taken = [...m.identities.map(i => i.name), ...m.services.map(s => s.name)];
    for (const it of items) {
        const name = uniqueName(it.name, taken);
        taken.push(name);
        newNames.push({ name });
        const id = newId();
        created.push({ kind: it.kind, id });
        if (it.kind === 'identity') ops.push({ op: 'createIdentity', identity: { id, name, attrs: [...it.attrs] } });
        else {
            const s = m.services.find(x => x.id === it.id) as AcService | undefined;
            ops.push({ op: 'createService', service: {
                id, name, attrs: [...it.attrs], configs: [...(s?.configs || [])],
                encryptionRequired: s?.encryptionRequired ?? true, terminatorStrategy: s?.terminatorStrategy || 'smartrouting',
            } });
        }
    }
    const ids = items.filter(i => i.kind === 'identity').length;
    return {
        title: `Create ${names(newNames)}`,
        summary: `New ${items.length === 1 ? (items[0].kind === 'identity' ? 'identity' : 'service') : 'items'} with the same attributes` +
            (items.some(i => i.kind === 'service') ? ' and configs' : '') + '.' +
            (ids ? ` New identities need enrolling with their own JWT (on the identity page) within 3 hours.` : ''),
        ops, created,
    };
}

/** Dragging a card from one group to another (or out of all groups). */
export function moveMember(m: AcModel, it: { kind: AcKind; id: string; name: string }, fromAttr: string | undefined, toAttr: string | null, copy: boolean): IntentResult {
    const cur = entitiesOf(m, it.kind).find(x => x.id === it.id);
    if (!cur) return { error: 'That item no longer exists.' };
    const ops: AcOp[] = [];
    if (toAttr && !cur.attrs.includes(toAttr)) ops.push({ op: 'addAttr', kind: it.kind, id: it.id, attr: toAttr });
    if (!copy && fromAttr && fromAttr !== toAttr) ops.push({ op: 'removeAttr', kind: it.kind, id: it.id, attr: fromAttr });
    if (!ops.length) return { error: toAttr ? `${it.name} is already in #${toAttr}.` : 'Nothing to change.' };
    if (!toAttr) return {
        title: `Remove ${it.name} from #${fromAttr}`,
        summary: `${it.name} loses #${fromAttr} and any access that came with it.`, ops,
    };
    return {
        title: `${copy || !fromAttr ? 'Add' : 'Move'} ${it.name} ${copy || !fromAttr ? 'to' : `from #${fromAttr} to`} #${toAttr}`,
        summary: copy || !fromAttr ? `${it.name} gains #${toAttr} and keeps its other groups.` : `${it.name} leaves #${fromAttr} and joins #${toAttr}; access changes with it.`,
        ops,
    };
}

/** Delete key: take the selected cards out of their groups. Never deletes the entity itself. */
export function removeFromGroups(m: AcModel, items: { kind: AcKind; id: string; name: string; attr: string }[]): IntentResult {
    const ops: AcOp[] = items.filter(i => entitiesOf(m, i.kind).find(x => x.id === i.id)?.attrs.includes(i.attr))
        .map(i => ({ op: 'removeAttr', kind: i.kind, id: i.id, attr: i.attr }));
    if (!ops.length) return { error: 'Select cards inside a group to take them out of it. Delete never removes the identity or service itself.' };
    return {
        title: items.length === 1 ? `Remove ${items[0].name} from #${items[0].attr}` : `Remove ${items.length} items from their groups`,
        summary: 'They lose those attributes and any access that came with them. The identities and services themselves stay.',
        ops,
    };
}

/** Marks for pending changes, so the board can highlight them. */
export function marksFor(opsList: AcOp[][]): BoardMarks {
    const k: BoardMarks = { attrs: new Set(), policies: new Set(), roles: new Set(), created: new Set() };
    for (const ops of opsList) for (const op of ops) {
        if (op.op === 'addAttr' || op.op === 'removeAttr') k.attrs.add(`${op.kind}:${op.id}:${op.attr}`);
        else if (op.op === 'addIdentityRole') k.roles.add(`${op.policy}:${op.role}`);
        else if (op.op === 'createPolicy' || op.op === 'createErPolicy') k.policies.add(op.policy.id);
        else if (op.op === 'createIdentity') k.created.add(op.identity.id);
        else if (op.op === 'createService') k.created.add(op.service.id);
    }
    return k;
}

/** Layout keys that refer to an entity or policy id, rewritten after creation gives real ids. */
export function remapLayout(layout: AcLayout, ids: Map<string, string>): AcLayout {
    if (!ids.size) return layout;
    const nodes: AcLayout['nodes'] = {};
    for (const [k, v] of Object.entries(layout.nodes)) {
        const parts = k.split(':');
        const last = parts[parts.length - 1];
        nodes[ids.has(last) ? [...parts.slice(0, -1), ids.get(last)].join(':') : k] = v;
    }
    return { ...layout, nodes };
}

export const emptyLayout = (): AcLayout => ({ v: 1, nodes: {}, groups: [] });

export function sameLayout(a: AcLayout, b: AcLayout): boolean {
    const ka = Object.keys(a.nodes), kb = Object.keys(b.nodes);
    if (ka.length !== kb.length) return false;
    if (ka.some(k => !b.nodes[k] || b.nodes[k].x !== a.nodes[k].x || b.nodes[k].y !== a.nodes[k].y)) return false;
    return JSON.stringify([...(a.groups || [])].sort()) === JSON.stringify([...(b.groups || [])].sort());
}
