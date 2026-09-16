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

import {Component, Input} from '@angular/core';

/**
 * Hover card for the identities SDK cell — shows the reported SDK details
 * (app id/version, version, type, branch, revision), the same fields the legacy
 * ag-grid SDK tooltip surfaced. Rendered by ListTableComponent's hover-tooltip
 * mechanism (column `tooltip`).
 */
@Component({
    selector: 'lib-sdk-info-tooltip',
    templateUrl: './sdk-info-tooltip.component.html',
    styleUrls: ['./sdk-info-tooltip.component.scss'],
    standalone: false,
})
export class SdkInfoTooltipComponent {
    @Input() row: any;

    get sdkInfo(): any {
        return this.row?.sdkInfo || {};
    }

    get title(): string {
        const s = this.sdkInfo;
        return s?.appId || s?.type || 'SDK';
    }

    get hasInfo(): boolean {
        const s = this.sdkInfo;
        return !!(s && (s.appId || s.appVersion || s.version || s.type || s.branch || s.revision));
    }
}
