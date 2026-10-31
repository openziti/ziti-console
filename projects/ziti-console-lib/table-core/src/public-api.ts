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

/*
 * Secondary entry point: `@openziti/ziti-console-lib/table-core`.
 *
 * The standalone list-table and the self-contained set of pieces it is built from. This entry's
 * compiled bundle and type declarations never include the library's main NgModule, so none of
 * that module's heavy, optional peers (ag-grid, primeng, lottie, oauth, json-editor, qrcode, csv,
 * yaml, json-ref-resolver) are reachable - not even as a build-time import edge. A consumer that
 * imports the table from this subpath builds with only the lean peers it genuinely needs
 * (@angular/*, @angular/cdk, @angular/material, rxjs, lodash, moment).
 */

export * from './lib/features/data-table/data-table-filter.service';
export * from './lib/features/list-table/list-column';
export * from './lib/features/list-table/list-table.service';
export * from './lib/features/list-table/click-outside.directive';
export * from './lib/features/list-table/list-table.component';
export * from './lib/features/list-table/list-menu/list-menu.component';
export * from './lib/features/list-table/select-cell/select-cell.component';
export * from './lib/features/list-table/list-header-cell/list-header-cell.component';
export * from './lib/features/list-table/list-filter-cell/list-filter-cell.component';
export * from './lib/features/list-table/list-table-auto-refresh/list-table-auto-refresh.component';
export * from './lib/features/no-items/no-items.component';
