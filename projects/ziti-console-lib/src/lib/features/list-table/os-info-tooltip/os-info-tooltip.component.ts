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
 * Modern hover card for the identities O/S cell — shows the environment info
 * (OS, version, release, arch) in a clean key/value layout. Rendered by
 * ListTableComponent's hover-tooltip mechanism (column `tooltip`).
 */
@Component({
    selector: 'lib-os-info-tooltip',
    templateUrl: './os-info-tooltip.component.html',
    styleUrls: ['./os-info-tooltip.component.scss'],
    standalone: false,
})
export class OsInfoTooltipComponent {
    @Input() row: any;

    get envInfo(): any {
        return this.row?.envInfo || this.row?.versionInfo || {};
    }

    get osClass(): string {
        const os = `${this.envInfo?.os || ''}`.toLowerCase();
        const ver = `${this.envInfo?.osVersion || ''}`.toLowerCase();
        if (ver.includes('windows') || os.includes('mingw') || os.includes('windows')) {
            return 'windows';
        }
        if (os.includes('darwin')) {
            return 'apple';
        }
        if (os.includes('linux')) {
            return 'linux';
        }
        if (os.includes('android')) {
            return 'android';
        }
        return 'other';
    }

    get osTitle(): string {
        switch (this.osClass) {
            case 'apple': return 'macOS';
            case 'windows': return 'Windows';
            case 'linux': return 'Linux';
            case 'android': return 'Android';
            default: return this.envInfo?.os || 'Unknown OS';
        }
    }

    /** Whether there is any environment info worth showing. */
    get hasInfo(): boolean {
        const e = this.envInfo;
        return !!(e && (e.os || e.osVersion || e.osRelease || e.arch));
    }
}
