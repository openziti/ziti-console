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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ConfigBuilderComponent} from './config-builder.component';

/**
 * The config builder on its own. It needs no controller session, services or extension tokens, so the standalone
 * `app-config-builder` app imports this module directly instead of the whole library module.
 */
@NgModule({
    declarations: [ConfigBuilderComponent],
    imports: [CommonModule, FormsModule, MatTooltipModule],
    exports: [ConfigBuilderComponent],
})
export class ConfigBuilderModule {
}
