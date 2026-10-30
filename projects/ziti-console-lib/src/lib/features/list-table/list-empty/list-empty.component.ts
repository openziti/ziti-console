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

import {Component, EventEmitter, Input, Output} from '@angular/core';

/** Which situation the table is in when it has nothing to show. */
export type EmptyVariant = 'empty' | 'no-results' | 'access-denied' | 'error';

/** Line glyph drawn in the empty-state figure. */
export type EmptyGlyph = 'generic' | 'service' | 'identity' | 'router' | 'policy' | 'search' | 'lock' | 'alert';

interface EmptyCopy {
    noun: string;
    glyph: EmptyGlyph;
    title: string;
    message: string;
    cta: string;
}

/**
 * Modern, themeable placeholder shown inside {@link ListTableComponent} when a list has
 * no rows. Four variants (first-use empty, no search results, access denied, load error),
 * per-entity default copy keyed by tableId, and a `[empty-state]` projection slot for a
 * fully custom placeholder. All copy/glyph/actions can be overridden per table.
 */
@Component({
    selector: 'lib-list-empty',
    templateUrl: './list-empty.component.html',
    styleUrls: ['./list-empty.component.scss'],
    standalone: false,
})
export class ListEmptyComponent {
    @Input() variant: EmptyVariant = 'empty';
    /** tableId used to look up the default copy (e.g. 'services', 'identities'). */
    @Input() entityKey = '';
    /** Human label used to derive a noun when the key has no tailored copy. */
    @Input() entityLabel = '';

    /** Overrides for the generated content; unset falls back to the per-entity defaults. */
    @Input() title?: string;
    @Input() message?: string;
    @Input() icon?: EmptyGlyph;
    /** Label for the primary create action (first-use empty only). */
    @Input() createLabel = '';

    /** Whether the create action is offered (false hides it, e.g. read-only tables). */
    @Input() hasAdd = true;
    @Input() readonly = false;

    @Output() create = new EventEmitter<void>();
    @Output() clearFilters = new EventEmitter<void>();
    @Output() retry = new EventEmitter<void>();

    // ---- per-entity default copy (first-use "empty" variant) ---------------------
    // Keyed by tableId. Anything not listed falls back to a generic noun-based template.
    private static readonly COPY: Record<string, EmptyCopy> = {
        services: {
            noun: 'services', glyph: 'service', cta: 'Create service',
            title: 'No services yet',
            message: 'Services define what your identities can reach on the network. Create your first one to get started.',
        },
        identities: {
            noun: 'identities', glyph: 'identity', cta: 'Create identity',
            title: 'No identities yet',
            message: 'Identities are the people, devices, and servers on your network. Add one to begin.',
        },
        'edge-routers': {
            noun: 'edge routers', glyph: 'router', cta: 'Create edge router',
            title: 'No edge routers yet',
            message: 'Edge routers carry traffic across your network fabric. Register your first router to start routing.',
        },
        'service-policies': {
            noun: 'service policies', glyph: 'policy', cta: 'Create service policy',
            title: 'No service policies yet',
            message: 'Service policies decide which identities can dial or host each service. Create one to connect them.',
        },
        'edge-router-policies': {
            noun: 'edge router policies', glyph: 'policy', cta: 'Create edge router policy',
            title: 'No edge router policies yet',
            message: 'Edge router policies control which identities use which edge routers. Create one to get started.',
        },
        'service-edge-router-policies': {
            noun: 'service edge router policies', glyph: 'policy', cta: 'Create policy',
            title: 'No service edge router policies yet',
            message: 'These policies pair services with the edge routers that can carry them. Create one to get started.',
        },
        'posture-checks': {
            noun: 'posture checks', glyph: 'policy', cta: 'Create posture check',
            title: 'No posture checks yet',
            message: 'Posture checks require identities to meet conditions before they connect. Create your first check.',
        },
        configurations: {
            noun: 'configs', glyph: 'service', cta: 'Create config',
            title: 'No configs yet',
            message: 'Configs describe how a service is reached. Create one to use it in your services.',
        },
        'config-types': {
            noun: 'config types', glyph: 'service', cta: 'Create config type',
            title: 'No config types yet',
            message: 'Config types describe the shape of a config. Create one to define your own.',
        },
        'auth-policies': {
            noun: 'auth policies', glyph: 'policy', cta: 'Create auth policy',
            title: 'No auth policies yet',
            message: 'Auth policies set how identities are allowed to authenticate. Create one to get started.',
        },
        'certificate-authorities': {
            noun: 'certificate authorities', glyph: 'policy', cta: 'Create authority',
            title: 'No certificate authorities yet',
            message: 'Certificate authorities verify the certs your identities present. Add one to begin.',
        },
        'ext-jwt-signers': {
            noun: 'external JWT signers', glyph: 'policy', cta: 'Create signer',
            title: 'No external JWT signers yet',
            message: 'External JWT signers let an outside provider vouch for your identities. Add one to begin.',
        },
        terminators: {
            noun: 'terminators', glyph: 'router', cta: 'Create terminator',
            title: 'No terminators yet',
            message: 'Terminators are where a service is hosted on the fabric. They usually appear as identities bind a service.',
        },
        'transit-routers': {
            noun: 'transit routers', glyph: 'router', cta: 'Create transit router',
            title: 'No transit routers yet',
            message: 'Transit routers move traffic between edge routers inside the fabric. Register one to extend it.',
        },
    };

    // ---- resolved content --------------------------------------------------------
    private get copy(): EmptyCopy {
        const hit = ListEmptyComponent.COPY[this.entityKey];
        if (hit) {
            return hit;
        }
        const noun = (this.entityLabel || 'items').toLowerCase();
        return {
            noun,
            glyph: 'service',
            cta: this.createLabel || 'Create',
            title: `No ${noun} yet`,
            message: `There are no ${noun} to show yet.`,
        };
    }

    get glyph(): EmptyGlyph {
        if (this.icon) {
            return this.icon;
        }
        switch (this.variant) {
            case 'no-results':
                return 'search';
            case 'access-denied':
                return 'lock';
            case 'error':
                return 'alert';
            default:
                // one generic icon for the no-data state on every page for now; the
                // per-entity glyphs in COPY are kept for when we turn them back on
                return 'generic';
        }
    }

    /** Tone drives the glyph colour away from the create-accent for non-create variants. */
    get tone(): '' | 'warn' | 'danger' {
        if (this.variant === 'access-denied') {
            return 'warn';
        }
        if (this.variant === 'error') {
            return 'danger';
        }
        return '';
    }

    private get noun(): string {
        return this.copy.noun;
    }

    get resolvedTitle(): string {
        if (this.title) {
            return this.title;
        }
        switch (this.variant) {
            case 'no-results':
                return `No matching ${this.noun}`;
            case 'access-denied':
                return 'Access restricted';
            case 'error':
                return `Couldn’t load ${this.noun}`;
            default:
                return this.copy.title;
        }
    }

    get resolvedMessage(): string {
        if (this.message) {
            return this.message;
        }
        switch (this.variant) {
            case 'no-results':
                return `No ${this.noun} match your current filters. Try different terms or clear them to see everything.`;
            case 'access-denied':
                return `You don’t have permission to view ${this.noun}. Ask your network administrator to grant access.`;
            case 'error':
                return 'Something interrupted the request. Check the connection to the controller, then try again.';
            default:
                return this.copy.message;
        }
    }

    /** The primary create action shows only on the first-use empty state when allowed. */
    get showCreate(): boolean {
        return this.variant === 'empty' && this.hasAdd && !this.readonly;
    }

    get primaryLabel(): string {
        return this.createLabel || this.copy.cta;
    }

    onCreate(): void {
        this.create.emit();
    }

    onClear(): void {
        this.clearFilters.emit();
    }

    onRetry(): void {
        this.retry.emit();
    }
}
