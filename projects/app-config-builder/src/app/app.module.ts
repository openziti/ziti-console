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
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ConfigBuilderModule} from 'ziti-console-lib';

import {AppComponent} from './app.component';

/**
 * Standalone config builder. No login, router, interceptors or controller services: it only edits files in the
 * browser, so it can be hosted anywhere (for example the documentation site).
 */
@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, BrowserAnimationsModule, ConfigBuilderModule],
    bootstrap: [AppComponent],
})
export class AppModule {
}
