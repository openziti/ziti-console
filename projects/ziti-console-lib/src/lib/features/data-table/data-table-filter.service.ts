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

// DataTableFilterService now lives in the `table-core` secondary entry point (it is shared by both
// the list-table and the legacy data-table). This re-export keeps the many in-library importers
// working through their existing relative path. The service stays a single `providedIn: 'root'`
// class defined once in table-core, so its singleton identity is preserved.
export { DataTableFilterService } from '@openziti/ziti-console-lib/table-core';
export type { FilterObj } from '@openziti/ziti-console-lib/table-core';
