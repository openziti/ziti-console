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
 * Auth transport, resolved at runtime from a server-injected meta tag (present in the
 * DOM before the Angular module evaluates, so this is synchronous).
 *  - 'direct'        : SPA holds its own token in localStorage (controller-hosted /
 *                      static server). The default when no meta tag is present.
 *  - 'proxy-session' : reverse proxy holds the token server-side; the browser stores
 *                      nothing. Opted into by server.js injecting the meta tag.
 */
export type ZacAuthMode = 'direct' | 'proxy-session';

export function getAuthMode(): ZacAuthMode {
    try {
        const meta = document.querySelector('meta[name="zac-auth-mode"]');
        return meta?.getAttribute('content') === 'proxy-session' ? 'proxy-session' : 'direct';
    } catch (e) {
        return 'direct';
    }
}

/** Name of the readable (non-httpOnly) CSRF cookie the proxy sets at login. */
export const CSRF_COOKIE_NAME = 'zac.csrf';

/** Read the CSRF token the proxy issued, to echo back as the X-ZAC-CSRF header. */
export function readCsrfToken(): string | null {
    try {
        const name = CSRF_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
        return null;
    }
}
