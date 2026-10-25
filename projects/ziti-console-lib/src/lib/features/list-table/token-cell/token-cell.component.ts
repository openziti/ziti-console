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

import {Component, ElementRef, Input, ViewChild} from '@angular/core';
import moment from 'moment';

type TokenStatus = 'available' | 'expired' | 'none';

interface TokenAction {
    label: string;
    action: string;
    icon: string;
}

/**
 * Enrollment-token cell for list-table pages. Shows a status chip (Token / Expired /
 * —) that doubles as a dropdown of enrollment actions. The actions default to the
 * identity set (Download JWT, Show QR, Re-issue) but each page passes its own via
 * `availableActions`/`expiredActions` (edge routers, for example, drop QR/re-issue).
 * Actions are emitted via the cell context's `emitAction`, so they run through the
 * same page handlers as the row ⋯ menu.
 */
@Component({
    selector: 'lib-token-cell',
    templateUrl: './token-cell.component.html',
    styleUrls: ['./token-cell.component.scss'],
    standalone: false,
})
export class TokenCellComponent {
    @Input() row: any;
    @Input() emitAction?: (action: string, item?: any) => void;

    /** Dropdown actions per token state. Default to the identity enrollment actions;
     *  other pages (e.g. edge routers) pass their own, since Show QR code and Re-issue
     *  enrollment are identity-only concepts. */
    @Input() availableActions: TokenAction[] = [
        {label: 'Download JWT', action: 'download-enrollment', icon: 'icon-download-jwt'},
        {label: 'Show QR code', action: 'qr-code', icon: 'icon-qr'},
        {label: 'Re-issue enrollment', action: 'reissue-enrollment', icon: 'icon-refresh'},
    ];
    @Input() expiredActions: TokenAction[] = [
        {label: 'Re-issue enrollment', action: 'reissue-enrollment', icon: 'icon-refresh'},
    ];

    @ViewChild('trigger') trigger?: ElementRef<HTMLElement>;

    open = false;
    menuLeft = 0;
    menuTop = 0;

    get status(): TokenStatus {
        if (!this.hasEnrolmentToken) {
            return 'none';
        }
        return this.tokenExpired ? 'expired' : 'available';
    }

    get statusLabel(): string {
        return this.status === 'expired' ? 'Expired' : 'Token';
    }

    /** A cert-enrolled identity with no pending token can have its enrollment
     *  re-issued. Reset enrollment acts on the cert authenticator, so this is gated
     *  on cert specifically: password (updb) and external-IdP/JWT-signer identities
     *  have no cert to reset and are left as the empty state. */
    get canReissue(): boolean {
        return this.status === 'none' && !!this.row?.authenticators?.cert?.id;
    }

    get actions(): TokenAction[] {
        if (this.status === 'available') {
            return this.availableActions;
        }
        if (this.status === 'expired') {
            return this.expiredActions;
        }
        return [];
    }

    /** A dropdown only earns its caret when there is a choice to make; a lone action
     *  (e.g. edge routers only ever "Download JWT") runs straight off the chip. */
    get hasMenu(): boolean {
        return this.actions.length > 1;
    }

    onChipClick(event: MouseEvent): void {
        if (!this.hasMenu) {
            const only = this.actions[0];
            if (only) {
                this.runAction(only.action, event);
            } else {
                event.stopPropagation();
            }
            return;
        }
        this.toggleMenu(event);
    }

    toggleMenu(event: MouseEvent): void {
        event.stopPropagation();
        if (this.open) {
            this.open = false;
            return;
        }
        const rect = this.trigger?.nativeElement.getBoundingClientRect();
        if (rect) {
            this.menuLeft = rect.left;
            this.menuTop = rect.bottom + 4;
        }
        this.open = true;
    }

    closeMenu(): void {
        this.open = false;
    }

    runAction(action: string, event: MouseEvent): void {
        event.stopPropagation();
        this.open = false;
        this.emitAction?.(action, this.row);
    }

    private get hasEnrolmentToken(): boolean {
        const token =
            this.row?.enrollment?.ott?.jwt ||
            this.row?.enrollment?.ottca?.jwt ||
            this.row?.enrollment?.updb?.jwt;
        return !!(this.row?.enrollmentToken || token);
    }

    private get tokenExpired(): boolean {
        const expiration =
            this.row?.enrollmentExpiresAt ||
            this.row?.enrollment?.ott?.expiresAt ||
            this.row?.enrollment?.ottca?.expiresAt ||
            this.row?.enrollment?.updb?.expiresAt;
        return expiration ? moment(expiration).isBefore() : false;
    }
}
