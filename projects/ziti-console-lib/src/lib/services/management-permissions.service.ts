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
import {BehaviorSubject} from 'rxjs';
import {debounceTime, distinctUntilChanged, map} from 'rxjs/operators';
import {isEmpty} from 'lodash';
import {SETTINGS_SERVICE} from './settings.service';
import {SettingsServiceClass} from './settings-service.class';
import {ZITI_DATA_SERVICE, ZitiDataService} from './ziti-data.service';

export const SAVE_DENIED_BY_PERMISSION_TOOLTIP = 'You do not have permission to save changes.';


/** Maps ZAC entityType strings to controller permission entity keys. */
export const API_RESOURCE_TO_ENTITY_PERMISSION: Record<string, string> = {
    identities: 'identity',
    services: 'service',
    'edge-routers': 'router',
    'transit-routers': 'router',
    'edge-router-policies': 'edge-router-policy',
    'service-policies': 'service-policy',
    'service-edge-router-policies': 'service-edge-router-policy',
    terminators: 'terminator',
    'posture-checks': 'posture-check',
    'external-jwt-signers': 'external-jwt-signer',
    'auth-policies': 'auth-policy',
    configs: 'config',
    'config-types': 'config-type',
    cas: 'ca',
    'api-sessions': 'ops',
    sessions: 'ops',
    enrollments: 'enrollment',
};

/** Session + controller URL — permissions only depend on these, not on version() metadata updates. */
interface SessionFingerprint {
    sessionId: string;
    edgeController: string;
}

@Injectable({
    providedIn: 'root',
})
export class ManagementPermissionsService {
    readonly saveDeniedTooltip = SAVE_DENIED_BY_PERMISSION_TOOLTIP;

    private readonly permissionSet = new Set<string>();
    private identityIsAdmin = false;
    /** Legacy controller, failed refresh, or empty permissions — keep prior UX (no gating). */
    private unrestricted = true;

    private readonly versionSubject = new BehaviorSubject<number>(0);

    readonly stateVersion$ = this.versionSubject.asObservable();

    /** Coalesce overlapping current-identity HTTP calls (debounce + rapid settings churn). */
    private identityLoadPromise: Promise<void> | null = null;

    constructor(
        @Inject(SETTINGS_SERVICE) private readonly settings: SettingsServiceClass,
        @Inject(ZITI_DATA_SERVICE) private readonly zitiData: ZitiDataService,
    ) {
        this.settings.settingsChange
            .pipe(
                map((): SessionFingerprint => ({
                    sessionId: this.settings.settings?.session?.id ?? '',
                    edgeController: this.settings.settings?.selectedEdgeController ?? '',
                })),
                distinctUntilChanged(
                    (a, b) => a.sessionId === b.sessionId && a.edgeController === b.edgeController,
                ),
                debounceTime(200),
            )
            .subscribe(() => {
                if (!this.settings.hasSession() || isEmpty(this.settings.settings?.selectedEdgeController)) {
                    this.clear();
                    return;
                }
                void this.loadCurrentIdentity();
            });
    }

    private bumpVersion(): void {
        this.versionSubject.next(this.versionSubject.value + 1);
    }

    clear(): void {
        this.permissionSet.clear();
        this.identityIsAdmin = false;
        this.unrestricted = true;
        this.bumpVersion();
    }

    async refresh(): Promise<void> {
        await this.loadCurrentIdentity();
    }

    private async loadCurrentIdentity(): Promise<void> {
        if (this.identityLoadPromise) {
            return this.identityLoadPromise;
        }
        this.identityLoadPromise = this.fetchCurrentIdentity().finally(() => {
            this.identityLoadPromise = null;
        });
        return this.identityLoadPromise;
    }

    private async fetchCurrentIdentity(): Promise<void> {
        try {
            const result: any = await this.zitiData.call('current-identity');
            const data = result?.data;
            if (!data) {
                this.applyLegacyMode();
                this.bumpVersion();
                return;
            }
            const rawPerms = Array.isArray(data.permissions) ? data.permissions : [];
            this.identityIsAdmin = !!data.isAdmin;
            if (rawPerms.length === 0 && !this.identityIsAdmin) {
                this.applyLegacyMode();
                this.identityIsAdmin = false;
                this.bumpVersion();
                return;
            }
            this.unrestricted = false;
            this.permissionSet.clear();
            rawPerms.forEach((p: string) => {
                if (typeof p === 'string' && p.length > 0) {
                    this.permissionSet.add(p);
                }
            });
        } catch {
            this.applyLegacyMode();
        }
        this.bumpVersion();
    }

    private applyLegacyMode(): void {
        this.unrestricted = true;
        this.permissionSet.clear();
        this.identityIsAdmin = false;
    }

    isUnrestricted(): boolean {
        return this.unrestricted;
    }

    private isAdmin(): boolean {
        if (this.permissionSet.has('admin_readonly')) {
            return false;
        }
        return this.identityIsAdmin || this.permissionSet.has('admin');
    }

    isAdminReadonly(): boolean {
        return this.permissionSet.has('admin_readonly');
    }

    private resolveEntityKey(apiResource: string): string | null {
        return API_RESOURCE_TO_ENTITY_PERMISSION[apiResource] ?? null;
    }

    private hasEntityGrant(entityKey: string): boolean {
        return this.permissionSet.has(entityKey);
    }

    private hasActionGrant(entityKey: string, action: 'create' | 'read' | 'update' | 'delete'): boolean {
        return this.permissionSet.has(`${entityKey}.${action}`);
    }

    canRead(apiResource: string): boolean {
        if (this.unrestricted) return true;
        const entityKey = this.resolveEntityKey(apiResource);
        if (!entityKey) return true;
        if (this.isAdmin() || this.isAdminReadonly()) return true;
        return this.hasEntityGrant(entityKey) || this.hasActionGrant(entityKey, 'read');
    }

    canCreate(apiResource: string): boolean {
        if (this.unrestricted) return true;
        const entityKey = this.resolveEntityKey(apiResource);
        if (!entityKey) return true;
        if (this.isAdmin()) return true;
        return this.hasEntityGrant(entityKey) || this.hasActionGrant(entityKey, 'create');
    }

    canUpdate(apiResource: string): boolean {
        if (this.unrestricted) return true;
        const entityKey = this.resolveEntityKey(apiResource);
        if (!entityKey) return true;
        if (this.isAdmin()) return true;
        return this.hasEntityGrant(entityKey) || this.hasActionGrant(entityKey, 'update');
    }

    canDelete(apiResource: string): boolean {
        if (this.unrestricted) return true;
        const entityKey = this.resolveEntityKey(apiResource);
        if (!entityKey) return true;
        if (this.isAdmin()) return true;
        return this.hasEntityGrant(entityKey) || this.hasActionGrant(entityKey, 'delete');
    }

    /** Strict read-only form UI: no write permission for this resource (covers admin_readonly and missing entity grant). */
    useStrictReadonlyFormUi(apiResource: string, isEdit: boolean): boolean {
        if (this.unrestricted || this.isAdmin()) return false;
        return this.isSaveDisabled(apiResource, isEdit);
    }

    isSaveDisabled(apiResource: string, isEdit: boolean): boolean {
        if (this.unrestricted) {
            return false;
        }
        return isEdit ? !this.canUpdate(apiResource) : !this.canCreate(apiResource);
    }

    isMenuActionAllowed(apiResource: string, action: string): boolean {
        if (this.unrestricted) {
            return true;
        }
        switch (action) {
            case 'delete':
                return this.canDelete(apiResource);
            case 'update':
                return this.canUpdate(apiResource);
            case 'reset-enrollment':
            case 'reissue-enrollment':
            case 'reset-mfa':
            case 'override':
                return this.canUpdate(apiResource);
            case 'download-enrollment':
            case 'qr-code':
            case 'identity-service-path':
                return this.canRead(apiResource);
            default:
                return this.canRead(apiResource);
        }
    }

    isTableHeaderActionAllowed(apiResource: string, action: string): boolean {
        if (this.unrestricted || this.isAdmin()) return true;
        switch (action) {
            case 'download-all':
            case 'download-selected':
                return this.canRead(apiResource);
            default:
                return true;
        }
    }
}
