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
    /** What this list belongs to, e.g. 'network'. Set: "This network has no services";
     *  blank: "There are no services", for lists not tied to a network. */
    @Input() scope = '';

    /** Overrides for the generated content; unset falls back to the per-entity defaults. */
    @Input() title?: string;
    @Input() message?: string;
    @Input() icon?: EmptyGlyph;
    /** Label for the primary create action (first-use empty only). */
    @Input() createLabel = '';

    /** Whether the create action is offered (false hides it, e.g. read-only tables). */
    @Input() hasAdd = true;
    @Input() readonly = false;
    /** Draw the soft card. On for the full-page state; off inside the table, so a card isn't nested in the grid. */
    @Input() framed = true;

    @Output() create = new EventEmitter<void>();
    @Output() clearFilters = new EventEmitter<void>();
    @Output() retry = new EventEmitter<void>();

    // ---- per-entity default copy (first-use "empty" variant) ---------------------
    // Keyed by tableId. Anything not listed falls back to a generic noun-based template.
    private static readonly COPY: Record<string, EmptyCopy> = {
        services: { noun: 'services', glyph: 'service', cta: 'Create service' },
        identities: { noun: 'identities', glyph: 'identity', cta: 'Create identity' },
        'edge-routers': { noun: 'edge routers', glyph: 'router', cta: 'Create edge router' },
        'service-policies': { noun: 'service policies', glyph: 'policy', cta: 'Create service policy' },
        'edge-router-policies': { noun: 'edge router policies', glyph: 'policy', cta: 'Create edge router policy' },
        'service-edge-router-policies': { noun: 'service edge router policies', glyph: 'policy', cta: 'Create policy' },
        'posture-checks': { noun: 'posture checks', glyph: 'policy', cta: 'Create posture check' },
        configurations: { noun: 'configs', glyph: 'service', cta: 'Create config' },
        'config-types': { noun: 'config types', glyph: 'service', cta: 'Create config type' },
        'auth-policies': { noun: 'auth policies', glyph: 'policy', cta: 'Create auth policy' },
        'certificate-authorities': { noun: 'certificate authorities', glyph: 'policy', cta: 'Create authority' },
        'ext-jwt-signers': { noun: 'external JWT signers', glyph: 'policy', cta: 'Create signer' },
        terminators: { noun: 'terminators', glyph: 'router', cta: 'Create terminator' },
        'transit-routers': { noun: 'transit routers', glyph: 'router', cta: 'Create transit router' },
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
                // one generic icon for the no-data state on every page
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
                // first-use empty: name what the list belongs to when we know it
                return this.scope
                    ? `This ${this.scope} has no ${this.noun}`
                    : `There are no ${this.noun}`;
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
                // first-use empty state keeps just the headline, no explanatory subtext
                return '';
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
