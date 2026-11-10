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

import moment from 'moment';

/** A row's enrollment-token state: a usable token, an expired one, or none. */
export type TokenStatus = 'available' | 'expired' | 'none';

/** Whether a row carries a pending enrollment token, across the router and identity shapes. */
export function hasEnrollmentToken(row: any): boolean {
    const token = row?.enrollment?.ott?.jwt || row?.enrollment?.ottca?.jwt || row?.enrollment?.updb?.jwt;
    return !!(row?.enrollmentToken || token);
}

/** Whether a row's enrollment token carries an expiry that has already passed. */
function tokenExpired(row: any): boolean {
    const expiration =
        row?.enrollmentExpiresAt ||
        row?.enrollment?.ott?.expiresAt ||
        row?.enrollment?.ottca?.expiresAt ||
        row?.enrollment?.updb?.expiresAt;
    return expiration ? moment(expiration).isBefore() : false;
}

/**
 * The row's enrollment-token state. Shared by the token cell and the Name-cell hover actions so both
 * read expiry the same way: an expired token offers re-enroll, a usable one offers download.
 */
export function enrollmentTokenStatus(row: any): TokenStatus {
    if (!hasEnrollmentToken(row)) {
        return 'none';
    }
    return tokenExpired(row) ? 'expired' : 'available';
}
