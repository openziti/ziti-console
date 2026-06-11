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

export class InsecureContextError extends Error {
    constructor() {
        super('crypto.subtle is unavailable - PKCE requires a secure context (https or localhost)');
        this.name = 'InsecureContextError';
    }
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomUrlSafeString(byteLen = 32): string {
    const bytes = new Uint8Array(byteLen);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}

export async function pkceChallengeS256(verifier: string): Promise<string> {
    if (!crypto?.subtle) {
        throw new InsecureContextError();
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64UrlEncode(new Uint8Array(digest));
}

export function decodeJwtPayload(token: string): any | null {
    if (!token) {
        return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }
    try {
        const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
}

// Returns the JWT exp claim in epoch milliseconds, or undefined for opaque/clamless tokens
export function jwtExpMs(token: string): number | undefined {
    const exp = decodeJwtPayload(token)?.exp;
    return typeof exp === 'number' ? exp * 1000 : undefined;
}

export function jwtIatMs(token: string): number | undefined {
    const iat = decodeJwtPayload(token)?.iat;
    return typeof iat === 'number' ? iat * 1000 : undefined;
}
