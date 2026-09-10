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
 * Renders a truthy boolean as a green check + domain label (via `trueLabel`);
 * a false value renders nothing, so the column reads as a clean presence marker.
 */
@Component({
    selector: 'lib-boolean-cell',
    templateUrl: './boolean-cell.component.html',
    styleUrls: ['./boolean-cell.component.scss'],
    standalone: false,
})
export class BooleanCellComponent {
    @Input() value: any;
    @Input() trueLabel = 'Yes';

    get isTrue(): boolean {
        return this.value === true || this.value === 'true';
    }
}
