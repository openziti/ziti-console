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
 * Enrollment-token cell for the identities list. Shows a status chip (Available /
 * Expired / —) that doubles as a dropdown of enrollment actions (Download JWT, Show
 * QR, Re-issue). Actions are emitted via the cell context's `emitAction`, so they run
 * through the same page handlers as the row ⋯ menu.
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
        return this.status === 'expired' ? 'Expired' : 'Available';
    }

    get actions(): TokenAction[] {
        if (this.status === 'available') {
            return [
                {label: 'Download JWT', action: 'download-enrollment', icon: 'icon-download-jwt'},
                {label: 'Show QR code', action: 'qr-code', icon: 'icon-qr'},
                {label: 'Re-issue enrollment', action: 'reissue-enrollment', icon: 'icon-refresh'},
            ];
        }
        if (this.status === 'expired') {
            return [{label: 'Re-issue enrollment', action: 'reissue-enrollment', icon: 'icon-refresh'}];
        }
        return [];
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
