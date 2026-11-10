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

/**
 * A router's verified and online dots, as markup for the hover cell's leading status slot. Mirrors the
 * name cell's dots (green when true, grey when not). Only the row's own booleans go in, so nothing to escape.
 */
export function routerStatusDots(row: any): string {
    const verified = !!row?.isVerified;
    const online = !!row?.isOnline;
    return (
        `<span class="circle ${verified}" title="${verified ? 'Verified' : 'Unverified'}"></span>` +
        `<span class="circle ${online}" title="${online ? 'Online' : 'Offline'}"></span>`
    );
}
