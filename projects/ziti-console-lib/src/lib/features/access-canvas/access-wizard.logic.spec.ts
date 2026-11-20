import {AcModel, applyOps, clone, dialFor, hostsFor} from './access-canvas.logic';
import {blankInput, plan, slugify, suggest, validate} from './access-wizard.logic';

function model(withRouterPolicies = true): AcModel {
    return {
        identities: [
            {id: 'i1', name: 'cjm-macbook-air', attrs: ['ssh-users'], enrolled: true, online: true, isAdmin: false},
            {id: 'i2', name: 'cjm-macbook-pro', attrs: [], enrolled: false, online: false, isAdmin: false},
            {id: 'adm', name: 'admin', attrs: [], enrolled: true, online: false, isAdmin: true},
        ],
        services: [{id: 's1', name: 'loft-50-ssh', attrs: ['ssh'], configs: []}],
        routers: [{id: 'r1', name: 'router-instance-1', attrs: [], online: true}],
        servicePolicies: [],
        erPolicies: withRouterPolicies ? [{id: 'e1', name: 'all-endpoints-all-routers', semantic: 'AnyOf', identityRoles: ['#all'], routerRoles: ['#all']}] : [],
        serps: withRouterPolicies ? [{id: 'sp1', name: 'all-services-all-routers', semantic: 'AnyOf', serviceRoles: ['#all'], routerRoles: ['#all']}] : [],
    } as AcModel;
}

const ids = () => { let n = 0; return () => `new-${++n}`; };

describe('access-wizard.logic', () => {
    it('suggests idiomatic names from the system and service type', () => {
        const s = suggest('postgres', 'Billing DB');
        expect(s.serviceName).toBe('billing-db-postgres');
        expect(s.interceptHost).toBe('billing-db.ziti');
        expect(s.interceptPort).toBe(5432);
        expect(s.hostAddress).toBe('127.0.0.1');
        expect(s.hostName).toBe('billing-db');
        expect(s.hostsAttr).toBe('billing-db-postgres-hosts');
        expect(s.usersAttr).toBe('dbas');
    });

    it('slugifies names the OpenZiti way', () => {
        expect(slugify('  #My Team ')).toBe('my-team');
        expect(slugify('crm.prod')).toBe('crm.prod');
    });

    it('rejects names that already exist and bad ports', () => {
        const w = blankInput('ssh', 'loft-50');
        w.interceptPort = 70000;
        const fields = validate(model(), w).map(c => c.field);
        expect(fields).toContain('serviceName');   // loft-50-ssh exists
        expect(fields).toContain('interceptPort');
        w.serviceName = 'loft-50-ssh2'; w.interceptPort = 22;
        expect(validate(model(), w).map(c => c.field)).toEqual(['newUserName']);   // a user device is required by default
        w.newUserName = 'jdoe-laptop';
        expect(validate(model(), w)).toEqual([]);
    });

    it('refuses a service nobody could use', () => {
        const w = blankInput('postgres', 'billing-db');
        w.userMode = 'existing';
        w.usersAttr = 'dbas';   // nobody has it
        expect(validate(model(), w).map(c => c.field)).toEqual(['userIds']);
        w.userIds = ['i2'];
        expect(validate(model(), w)).toEqual([]);
        w.userIds = []; w.usersAttr = 'ssh-users';   // cjm-macbook-air already has it
        expect(validate(model(), w)).toEqual([]);
    });

    it('creates two identities by default: the host and the user device', () => {
        const w = blankInput('postgres', 'billing-db');
        w.newUserName = 'jdoe-laptop';
        const p = plan(model(), w, ids());
        expect(p.created).toEqual(['billing-db', 'jdoe-laptop']);
        expect(p.updated).toEqual([]);
    });

    it('builds configs, service, hosting identity, users and policies that give access end to end', () => {
        const m = model();
        const w = blankInput('https', 'crm');
        w.usersAttr = 'employees';
        w.newUserName = 'jdoe-laptop';
        const p = plan(m, w, ids());
        const kinds = p.ops.map(o => o.op);
        expect(kinds).toEqual(['createConfig', 'createConfig', 'createService', 'createIdentity', 'createIdentity', 'createPolicy', 'createPolicy']);
        // The same group, with an existing identity instead of a new device.
        const w2 = {...w, serviceName: 'crm-https-2', userMode: 'existing' as const, userIds: ['i2']};
        const p2 = plan(m, w2, ids());
        expect(p2.updated).toEqual(['cjm-macbook-pro']);
        const after2 = applyOps(clone(m), p2.ops);
        const svc2 = after2.services.find(s => s.name === 'crm-https-2')!;
        expect(dialFor(after2, after2.identities.find(i => i.name === 'cjm-macbook-pro')!, svc2).length).toBe(1);
        const after = applyOps(clone(m), p.ops);
        const svc = after.services.find(s => s.name === 'crm-https')!;
        expect(svc.attrs).toEqual(['crm-https', 'https']);
        const host = after.identities.find(i => i.name === 'crm')!;
        expect(hostsFor(after, svc).map(h => h.name)).toEqual(['crm']);
        expect(host.attrs).toEqual(['crm-https-hosts']);
        for (const name of ['jdoe-laptop']) {
            const u = after.identities.find(i => i.name === name)!;
            expect(dialFor(after, u, svc).map(x => x.name)).toEqual(['crm-https-dial']);
        }
        const cfg = p.ops.find(o => o.op === 'createConfig' && o.config.type === 'intercept.v1') as any;
        expect(cfg.config.data).toEqual({protocols: ['tcp'], addresses: ['crm.ziti'], portRanges: [{low: 443, high: 443}]});
        expect(p.next.length).toBe(3);
    });

    it('adds router policies only when nothing covers the new pieces', () => {
        const p = plan(model(false), blankInput('ssh', 'web-01'), ids());
        const names = p.ops.filter(o => o.op === 'createSerp' || o.op === 'createErPolicy').map((o: any) => o.policy.name);
        expect(names).toEqual(['web-01-ssh-routers', 'web-01-ssh-identities-routers']);
        const covered = plan(model(true), blankInput('ssh', 'web-01'), ids());
        expect(covered.ops.some(o => o.op === 'createSerp' || o.op === 'createErPolicy')).toBeFalse();
    });

    it('reuses an existing hosting identity by giving it the hosts attribute', () => {
        const w = blankInput('rdp', 'desk-7');
        w.hostMode = 'existing'; w.hostId = 'i2';
        const p = plan(model(), w, ids());
        expect(p.ops.some(o => o.op === 'createIdentity')).toBeFalse();
        expect(p.ops).toContain({op: 'addAttr', kind: 'identity', id: 'i2', attr: 'desk-7-rdp-hosts'});
    });
});
