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
import {RouterModule} from '@angular/router';
import {OpenZitiConsoleLibModule, SETTINGS_SERVICE, ZAC_LOGIN_SERVICE} from 'ziti-console-lib';

import {AppComponent} from './app.component';

/**
 * Standalone demo app for `lib-list-table`. It reuses the full library module for the component and
 * its styles, but stubs the settings/login services the library's app-initializer expects so it boots
 * with no controller session. RouterModule is present only because some library components reference it.
 */
@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, BrowserAnimationsModule, RouterModule.forRoot([]), OpenZitiConsoleLibModule],
    providers: [
        {provide: SETTINGS_SERVICE, useValue: {init: () => {}, settings: {}}},
        {provide: ZAC_LOGIN_SERVICE, useValue: {init: () => Promise.resolve()}},
    ],
    bootstrap: [AppComponent],
})
export class AppModule {
}
