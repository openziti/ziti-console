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

import {Inject, Injectable} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from '../../services/ziti-data.service';
import {ManagementPermissionsService} from '../../services/management-permissions.service';
import {SETTINGS_SERVICE, SettingsService} from '../../services/settings.service';
import {
    AcErPolicy, AcIdentity, AcKind, AcModel, AcOp, AcRouter, AcSerp, AcService, AcServicePolicy,
    KIND_API, entitiesOf, erPolicyBody, identityBody, policyBody, serpBody, serviceBody,
} from './access-canvas.logic';
import {BrowserLayoutStore, LayoutStore, layoutStorageKey} from './canvas-layout.store';

/** One request that undoes one applied op. */
export interface AcRevert { label: string; run: () => Promise<any>; }

const PAGE = 500;
const isEmptyObj = (o: any) => !o || (typeof o === 'object' && Object.keys(o).length === 0);

@Injectable({providedIn: 'root'})
export class AccessCanvasService {

    constructor(
        @Inject(ZITI_DATA_SERVICE) private data: ZitiDataService,
        private permissions: ManagementPermissionsService,
        @Inject(SETTINGS_SERVICE) private settings: SettingsService,
    ) {}

    /** The controller this console is signed in to; layouts are kept per controller. */
    controllerName(): string {
        return this.settings?.settings?.selectedEdgeController || '';
    }

    /** Where the canvas layout is kept: this browser, per controller. */
    layoutStore(): LayoutStore {
        return new BrowserLayoutStore(layoutStorageKey(this.controllerName()));
    }

    /** True when the signed-in admin may change identities and both policy types. */
    canEdit(): boolean {
        const p = this.permissions;
        return p.canUpdate('identities') && p.canCreate('service-policies') && p.canUpdate('service-policies') && p.canCreate('edge-router-policies');
    }

    private async all(type: string): Promise<any[]> {
        const out: any[] = [];
        for (let page = 1; page < 1000; page++) {
            const paging = {filter: '', noSearch: true, order: 'asc', page, searchOn: 'name', sort: 'name', total: PAGE};
            const res = await this.data.get(type, paging, []);
            const rows = res?.data || [];
            out.push(...rows);
            const total = res?.meta?.pagination?.totalCount ?? out.length;
            if (!rows.length || out.length >= total) break;
        }
        return out;
    }

    async load(): Promise<AcModel> {
        const [ids, svcs, ers, sps, erps, serps] = await Promise.all([
            this.all('identities'), this.all('services'), this.all('edge-routers'),
            this.all('service-policies'), this.all('edge-router-policies'), this.all('service-edge-router-policies'),
        ]);
        // Policies the controller creates for itself (a router's own "-system" policy) aren't the admin's to change.
        const own = (p: any) => !p.isSystem;
        // Router identities are shown as routers, not as identities.
        const identities: AcIdentity[] = ids.filter(i => (i.typeId || i.type?.name || i.type?.id) !== 'Router').map(i => ({
            id: i.id, name: i.name, attrs: i.roleAttributes || [],
            // Pending enrollments are listed under `enrollment`; an enrolled identity has an authenticator.
            enrolled: !isEmptyObj(i.authenticators) || isEmptyObj(i.enrollment),
            online: !!i.hasEdgeRouterConnection,
            isAdmin: !!i.isAdmin,
        }));
        const services: AcService[] = svcs.map(s => ({
            id: s.id, name: s.name, attrs: s.roleAttributes || [],
            configs: s.configs || [], encryptionRequired: s.encryptionRequired !== false, terminatorStrategy: s.terminatorStrategy || 'smartrouting',
        }));
        const routers: AcRouter[] = ers.map(r => ({id: r.id, name: r.name, attrs: r.roleAttributes || [], online: !!r.isOnline}));
        const servicePolicies: AcServicePolicy[] = sps.filter(own).map(p => ({
            id: p.id, name: p.name, type: p.type, semantic: p.semantic || 'AnyOf',
            identityRoles: p.identityRoles || [], serviceRoles: p.serviceRoles || [],
            posture: p.postureCheckRolesDisplay?.length
                ? p.postureCheckRolesDisplay.map((x: any) => x.name || x.role)
                : (p.postureCheckRoles || []),
        }));
        const erPolicies: AcErPolicy[] = erps.filter(own).map(p => ({
            id: p.id, name: p.name, semantic: p.semantic || 'AnyOf',
            identityRoles: p.identityRoles || [], routerRoles: p.edgeRouterRoles || [],
        }));
        const serpsOut: AcSerp[] = serps.filter(own).map(p => ({
            id: p.id, name: p.name, semantic: p.semantic || 'AnyOf',
            serviceRoles: p.serviceRoles || [], routerRoles: p.edgeRouterRoles || [],
        }));
        return {identities, services, routers, servicePolicies, erPolicies, serps: serpsOut};
    }

    /**
     * Sends ops in order against the latest committed model. Returns revert actions for the
     * ops that succeeded; on failure the error is thrown with `reverts` attached so the caller
     * can roll back what already went through.
     */
    async apply(committed: AcModel, ops: AcOp[], idMap: Map<string, string> = new Map()): Promise<AcRevert[]> {
        const reverts: AcRevert[] = [];
        // Attributes and roles accumulate across ops on the same entity.
        const attrs = new Map<string, string[]>();
        for (const kind of ['identity', 'service', 'router'] as AcKind[]) {
            for (const e of entitiesOf(committed, kind)) attrs.set(`${kind}:${e.id}`, [...e.attrs]);
        }
        const roles = new Map(committed.servicePolicies.map(p => [p.id, [...p.identityRoles]]));
        try {
            for (const op of ops) {
                if (op.op === 'addAttr' || op.op === 'removeAttr') {
                    const id = idMap.get(op.id) || op.id, key = `${op.kind}:${id}`, api = KIND_API[op.kind];
                    const before = attrs.get(key) || [];
                    const after = op.op === 'addAttr'
                        ? (before.includes(op.attr) ? before : [...before, op.attr])
                        : before.filter(a => a !== op.attr);
                    await this.data.patch(api, {roleAttributes: after}, id);
                    attrs.set(key, after);
                    reverts.unshift({label: `restore attributes on ${op.kind} ${id}`, run: () => this.data.patch(api, {roleAttributes: before}, id)});
                } else if (op.op === 'createIdentity') {
                    const res = await this.data.post('identities', identityBody(op.identity));
                    const id = res?.data?.id;
                    if (id) {
                        idMap.set(op.identity.id, id);
                        attrs.set(`identity:${id}`, [...op.identity.attrs]);
                        reverts.unshift({label: `delete identity ${op.identity.name}`, run: () => this.data.delete('identities', id)});
                    }
                } else if (op.op === 'createConfig') {
                    const type = await this.byName('config-types', op.config.type);
                    if (!type) throw new Error(`Config type ${op.config.type} not found on the controller`);
                    const res = await this.data.post('configs', {name: op.config.name, configTypeId: type.id, data: op.config.data});
                    const id = res?.data?.id;
                    if (id) {
                        idMap.set(op.config.id, id);
                        reverts.unshift({label: `delete config ${op.config.name}`, run: () => this.data.delete('configs', id)});
                    }
                } else if (op.op === 'createSerp') {
                    const res = await this.data.post('service-edge-router-policies', serpBody(op.policy));
                    const id = res?.data?.id;
                    if (id) {
                        idMap.set(op.policy.id, id);
                        reverts.unshift({label: `delete service router policy ${op.policy.name}`, run: () => this.data.delete('service-edge-router-policies', id)});
                    }
                } else if (op.op === 'createService') {
                    // Configs created earlier in this apply have real ids by now.
                    const body = {...serviceBody(op.service), configs: op.service.configs.map(c => idMap.get(c) || c)};
                    const res = await this.data.post('services', body);
                    const id = res?.data?.id;
                    if (id) {
                        idMap.set(op.service.id, id);
                        attrs.set(`service:${id}`, [...op.service.attrs]);
                        reverts.unshift({label: `delete service ${op.service.name}`, run: () => this.data.delete('services', id)});
                    }
                } else if (op.op === 'addIdentityRole') {
                    const before = roles.get(op.policy) || [];
                    const after = before.includes(op.role) ? before : [...before, op.role];
                    await this.data.patch('service-policies', {identityRoles: after}, op.policy);
                    roles.set(op.policy, after);
                    reverts.unshift({label: `restore identity roles on policy ${op.policy}`, run: () => this.data.patch('service-policies', {identityRoles: before}, op.policy)});
                } else if (op.op === 'createPolicy') {
                    const res = await this.data.post('service-policies', policyBody(op.policy));
                    const id = res?.data?.id;
                    if (id) {
                        idMap.set(op.policy.id, id);
                        reverts.unshift({label: `delete service policy ${op.policy.name}`, run: () => this.data.delete('service-policies', id)});
                    }
                } else if (op.op === 'createErPolicy') {
                    const res = await this.data.post('edge-router-policies', erPolicyBody(op.policy));
                    const id = res?.data?.id;
                    if (id) {
                        idMap.set(op.policy.id, id);
                        reverts.unshift({label: `delete edge router policy ${op.policy.name}`, run: () => this.data.delete('edge-router-policies', id)});
                    }
                }
            }
        } catch (err: any) {
            err.reverts = reverts;
            throw err;
        }
        return reverts;
    }

    // ------------------------------------------------------------------ lookups
    private async byName(type: string, name: string): Promise<any | undefined> {
        const paging = {filter: '', noSearch: false, order: 'asc', page: 1, searchOn: 'name', sort: 'name', total: 10};
        const res = await this.data.get(type, paging, [{columnId: 'name', type: 'TEXTINPUT', verb: '=', value: name} as any]);
        return (res?.data || []).find((x: any) => x.name === name);
    }

    async revert(reverts: AcRevert[]): Promise<void> {
        for (const r of reverts) await r.run();
    }

    errorText(err: any): string {
        if (err instanceof Error) return err.message;
        const e = err?.error?.error || err?.error || err;
        const text = e?.cause?.reason || e?.message || e?.code || (typeof e === 'string' ? e : '');
        if (text) return text;
        if (err?.status) return `HTTP ${err.status} ${err.statusText || ''}`.trim();
        try { return 'Unexpected error: ' + JSON.stringify(err).slice(0, 200); } catch { return 'Unexpected error'; }
    }
}
