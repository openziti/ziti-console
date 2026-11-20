import {AcModel, applyOps} from './access-canvas.logic';
import {
    BoardFilters, Clip, buildBoard, emptyLayout, freeKey, groupKey, hubKey, marksFor, moveMember, pasteAsNew,
    pasteIntoGroup, pasteOntoEntities, remapLayout, removeFromGroups, sameLayout, uniqueName,
} from './canvas-board.logic';

const allTypes = (): BoardFilters => ({types: {identity: true, service: true, router: true}, attrs: [], search: '', problemsOnly: false});

function model(): AcModel {
    return {
        identities: [
            {id: 'i1', name: 'alice', attrs: ['sales'], enrolled: true, online: true, isAdmin: false},
            {id: 'i2', name: 'bob', attrs: ['sales', 'ops'], enrolled: true, online: true, isAdmin: false},
            {id: 'i3', name: 'web-host', attrs: ['web-hosts'], enrolled: true, online: true, isAdmin: false},
            {id: 'i4', name: 'loner', attrs: [], enrolled: false, online: false, isAdmin: false},
            {id: 'admin', name: 'Default Admin', attrs: [], enrolled: true, online: false, isAdmin: true},
        ],
        services: [
            {id: 's1', name: 'crm', attrs: ['web'], configs: ['c1'], encryptionRequired: true, terminatorStrategy: 'smartrouting'},
            {id: 's2', name: 'orphan', attrs: [], configs: [], encryptionRequired: true, terminatorStrategy: 'smartrouting'},
        ],
        routers: [{id: 'r1', name: 'edge-1', attrs: ['public'], online: true}],
        servicePolicies: [
            {id: 'p1', name: 'sales-dial-web', type: 'Dial', semantic: 'AnyOf', identityRoles: ['#sales'], serviceRoles: ['#web'], posture: []},
            {id: 'p2', name: 'web-bind', type: 'Bind', semantic: 'AnyOf', identityRoles: ['#web-hosts'], serviceRoles: ['#web'], posture: []},
        ],
        erPolicies: [{id: 'e1', name: 'all-on-all', semantic: 'AnyOf', identityRoles: ['#all'], routerRoles: ['#all']}],
        serps: [{id: 'sp1', name: 'all-services', semantic: 'AnyOf', serviceRoles: ['#all'], routerRoles: ['#all']}],
    } as AcModel;
}

const build = (m: AcModel, filters = allTypes(), layout = emptyLayout()) =>
    buildBoard(m, {layout, filters, marks: marksFor([]), expanded: new Set()});

describe('canvas-board.logic', () => {
    describe('buildBoard', () => {
        it('makes one box per role attribute and a free card for entities without attributes', () => {
            const b = build(model());
            const keys = b.nodes.map(n => n.key);
            expect(keys).toContain(groupKey('identity', 'sales'));
            expect(keys).toContain(groupKey('identity', 'ops'));
            expect(keys).toContain(groupKey('service', 'web'));
            expect(keys).toContain(groupKey('router', 'public'));
            expect(keys).toContain(freeKey('identity', 'i4'));
            expect(keys).toContain(freeKey('service', 's2'));
            expect(keys).not.toContain(freeKey('identity', 'admin'));
            const sales = b.nodes.find(n => n.key === groupKey('identity', 'sales'))!;
            expect(sales.members.map(x => x.name)).toEqual(['alice', 'bob']);
        });

        it('connects groups through policy hubs', () => {
            const b = build(model());
            const dial = hubKey('dial', 'p1');
            expect(b.nodes.some(n => n.key === dial)).toBeTrue();
            const ends = b.edges.filter(e => e.policy === 'p1').map(e => e.from.node === dial ? e.to.node : e.from.node);
            expect(ends.sort()).toEqual([groupKey('identity', 'sales'), groupKey('service', 'web')].sort());
        });

        it('uses saved positions and places the rest automatically', () => {
            const layout = emptyLayout();
            layout.nodes[groupKey('identity', 'sales')] = {x: 900, y: 700};
            const b = build(model(), allTypes(), layout);
            const sales = b.nodes.find(n => n.key === groupKey('identity', 'sales'))!;
            expect([sales.x, sales.y]).toEqual([900, 700]);
            const web = b.nodes.find(n => n.key === groupKey('service', 'web'))!;
            expect(web.x).toBeGreaterThan(0);
        });

        it('shows empty groups created on the canvas', () => {
            const layout = {...emptyLayout(), groups: ['identity:new-team']};
            const b = build(model(), allTypes(), layout);
            const g = b.nodes.find(n => n.key === groupKey('identity', 'new-team'))!;
            expect(g.members.length).toBe(0);
            expect(g.pending).toBeTrue();
        });

        it('places an empty group that only hosts on the host side', () => {
            const m = model();
            m.servicePolicies.push({id: 'p3', name: 'ssh-bind', type: 'Bind', semantic: 'AnyOf', identityRoles: ['#ssh-servers'], serviceRoles: ['#web'], posture: []} as any);
            const b = build(m);
            const hosts = b.nodes.find(n => n.key === groupKey('identity', 'ssh-servers'))!;
            const svc = b.nodes.find(n => n.key === groupKey('service', 'web'))!;
            expect(hosts.members.length).toBe(0);
            expect(hosts.x).toBeGreaterThan(svc.x);
        });

        it('flags problems on entities', () => {
            const b = build(model());
            const orphan = b.nodes.find(n => n.key === freeKey('service', 's2'))!;
            expect(orphan.problems).toContain('Not hosted');
            const loner = b.nodes.find(n => n.key === freeKey('identity', 'i4'))!;
            expect(loner.problems).toContain('Not enrolled');
        });
    });

    describe('filters', () => {
        it('hides a type and the policies that need it', () => {
            const f = allTypes();
            f.types.service = false;
            const b = build(model(), f);
            expect(b.nodes.some(n => n.kind === 'service')).toBeFalse();
            expect(b.nodes.some(n => n.key === hubKey('dial', 'p1'))).toBeFalse();
            expect(b.nodes.some(n => n.key === groupKey('identity', 'sales'))).toBeTrue();
        });

        it('keeps what an attribute is connected to, dimmed', () => {
            const f = allTypes();
            f.attrs = ['sales'];
            const b = build(model(), f);
            const keys = b.nodes.map(n => n.key);
            expect(keys).toContain(groupKey('identity', 'sales'));
            expect(keys).toContain(groupKey('service', 'web'));
            expect(keys).not.toContain(groupKey('identity', 'ops'));
            expect(b.nodes.find(n => n.key === groupKey('service', 'web'))!.dim).toBeTrue();
            expect(b.nodes.find(n => n.key === groupKey('identity', 'sales'))!.dim).toBeFalse();
        });

        it('name filter keeps matches and what they connect to, and narrows groups to matching members', () => {
            const f = allTypes();
            f.search = 'ali';
            const b = build(model(), f);
            const sales = b.nodes.find(n => n.key === groupKey('identity', 'sales'))!;
            expect(sales.hit).toBeTrue();
            expect(sales.dim).toBeFalse();
            expect(sales.shown.map(x => x.name)).toEqual(['alice']);
            expect(sales.more).toBe(1);
            expect(b.nodes.find(n => n.key === groupKey('service', 'web'))!.dim).toBeTrue();
            expect(b.nodes.some(n => n.key === groupKey('identity', 'ops'))).toBeFalse();
            expect(b.nodes.some(n => n.key === freeKey('service', 's2'))).toBeFalse();
        });

        it('problems only keeps nodes with problems', () => {
            const f = allTypes();
            f.problemsOnly = true;
            const b = build(model(), f);
            expect(b.nodes.some(n => n.key === freeKey('service', 's2'))).toBeTrue();
            expect(b.nodes.some(n => n.key === groupKey('identity', 'ops'))).toBeFalse();
        });
    });

    describe('drag and drop', () => {
        it('moves a card between groups', () => {
            const r = moveMember(model(), {kind: 'identity', id: 'i1', name: 'alice'}, 'sales', 'ops', false);
            expect('ops' in r).toBeTrue();
            const m = applyOps(model(), (r as any).ops);
            expect(m.identities.find(i => i.id === 'i1')!.attrs).toEqual(['ops']);
        });

        it('copies with Alt and keeps the old group', () => {
            const r = moveMember(model(), {kind: 'identity', id: 'i1', name: 'alice'}, 'sales', 'ops', true) as any;
            const m = applyOps(model(), r.ops);
            expect(m.identities.find(i => i.id === 'i1')!.attrs.sort()).toEqual(['ops', 'sales']);
        });

        it('dropping on empty canvas removes it from the group', () => {
            const r = moveMember(model(), {kind: 'identity', id: 'i2', name: 'bob'}, 'ops', null, false) as any;
            expect(r.ops).toEqual([{op: 'removeAttr', kind: 'identity', id: 'i2', attr: 'ops'}]);
        });

        it('refuses a no-op move', () => {
            const r = moveMember(model(), {kind: 'identity', id: 'i2', name: 'bob'}, 'sales', 'ops', true);
            expect('error' in r).toBeTrue();
        });

        it('delete takes cards out of groups only', () => {
            const r = removeFromGroups(model(), [{kind: 'identity', id: 'i1', name: 'alice', attr: 'sales'}]) as any;
            expect(r.ops).toEqual([{op: 'removeAttr', kind: 'identity', id: 'i1', attr: 'sales'}]);
            expect('error' in removeFromGroups(model(), [{kind: 'identity', id: 'i1', name: 'alice', attr: 'nope'}])).toBeTrue();
        });
    });

    describe('clipboard', () => {
        const copyAlice: Clip = {mode: 'copy', items: [{kind: 'identity', id: 'i1', name: 'alice', attrs: ['sales']}]};

        it('paste into a group adds the attribute', () => {
            const r = pasteIntoGroup(model(), copyAlice, 'identity', 'ops') as any;
            expect(r.ops).toEqual([{op: 'addAttr', kind: 'identity', id: 'i1', attr: 'ops'}]);
        });

        it('cut + paste into a group moves it out of where it was cut from', () => {
            const clip: Clip = {mode: 'cut', items: [{kind: 'identity', id: 'i2', name: 'bob', attrs: ['sales', 'ops'], fromAttr: 'ops'}]};
            const r = pasteIntoGroup(model(), clip, 'identity', 'web-hosts') as any;
            const m = applyOps(model(), r.ops);
            expect(m.identities.find(i => i.id === 'i2')!.attrs.sort()).toEqual(['sales', 'web-hosts']);
        });

        it('rejects pasting the wrong kind into a group', () => {
            expect('error' in pasteIntoGroup(model(), copyAlice, 'service', 'web')).toBeTrue();
        });

        it('paste onto an entity copies access (attributes)', () => {
            const r = pasteOntoEntities(model(), copyAlice, [{kind: 'identity', id: 'i4'}]) as any;
            expect(r.ops).toEqual([{op: 'addAttr', kind: 'identity', id: 'i4', attr: 'sales'}]);
        });

        it('paste as new creates a copy with the same attributes and configs', () => {
            let n = 0;
            const m = model();
            const clip: Clip = {mode: 'copy', items: [
                {kind: 'identity', id: 'i1', name: 'alice', attrs: ['sales']},
                {kind: 'service', id: 's1', name: 'crm', attrs: ['web']},
            ]};
            const r = pasteAsNew(m, clip, () => `new-${++n}`) as any;
            expect(r.created.length).toBe(2);
            const ci = r.ops.find((o: any) => o.op === 'createIdentity');
            expect(ci.identity).toEqual({id: 'new-1', name: 'alice-copy', attrs: ['sales']});
            const cs = r.ops.find((o: any) => o.op === 'createService');
            expect(cs.service.configs).toEqual(['c1']);
            const after = applyOps(m, r.ops);
            expect(after.identities.some(i => i.name === 'alice-copy')).toBeTrue();
        });

        it('paste as new is refused for cut and for routers', () => {
            expect('error' in pasteAsNew(model(), {...copyAlice, mode: 'cut'}, () => 'x')).toBeTrue();
            expect('error' in pasteAsNew(model(), {mode: 'copy', items: [{kind: 'router', id: 'r1', name: 'edge-1', attrs: []}]}, () => 'x')).toBeTrue();
        });

        it('makes unique copy names', () => {
            expect(uniqueName('a', ['a', 'a-copy'])).toBe('a-copy-2');
        });
    });

    describe('layout', () => {
        it('remaps temporary ids to created ones', () => {
            const l = {...emptyLayout(), nodes: {[freeKey('identity', 'new-1')]: {x: 1, y: 2}, [groupKey('identity', 'sales')]: {x: 3, y: 4}}};
            const r = remapLayout(l, new Map([['new-1', 'abc']]));
            expect(Object.keys(r.nodes).sort()).toEqual([freeKey('identity', 'abc'), groupKey('identity', 'sales')].sort());
        });

        it('compares layouts by positions and groups', () => {
            const a = {...emptyLayout(), nodes: {k: {x: 1, y: 1}}, groups: ['identity:a', 'identity:b']};
            const b = {...emptyLayout(), nodes: {k: {x: 1, y: 1}}, groups: ['identity:b', 'identity:a']};
            expect(sameLayout(a, b)).toBeTrue();
            expect(sameLayout(a, {...b, nodes: {k: {x: 2, y: 1}}})).toBeFalse();
        });

        it('marks pending changes for the board', () => {
            const k = marksFor([[{op: 'addAttr', kind: 'identity', id: 'i1', attr: 'ops'}]]);
            expect(k.attrs.has('identity:i1:ops')).toBeTrue();
        });
    });
});
