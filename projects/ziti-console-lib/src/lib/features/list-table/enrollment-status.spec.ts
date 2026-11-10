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

import {enrollmentTokenStatus, hasEnrollmentToken} from './enrollment-status';

const future = () => moment().add(1, 'day').toISOString();
const past = () => moment().subtract(1, 'day').toISOString();

describe('enrollment-status', () => {
    describe('hasEnrollmentToken', () => {
        it('reads a top-level token and the nested ott/ottca/updb jwts', () => {
            expect(hasEnrollmentToken({enrollmentToken: 'jwt'})).toBe(true);
            expect(hasEnrollmentToken({enrollment: {ott: {jwt: 'a'}}})).toBe(true);
            expect(hasEnrollmentToken({enrollment: {ottca: {jwt: 'a'}}})).toBe(true);
            expect(hasEnrollmentToken({enrollment: {updb: {jwt: 'a'}}})).toBe(true);
        });

        it('is false with no token anywhere', () => {
            expect(hasEnrollmentToken({})).toBe(false);
            expect(hasEnrollmentToken({enrollment: {}})).toBe(false);
        });
    });

    describe('enrollmentTokenStatus', () => {
        it('is none when the row has no token', () => {
            expect(enrollmentTokenStatus({})).toBe('none');
        });

        it('is available when a token has a future expiry, or no expiry at all', () => {
            expect(enrollmentTokenStatus({enrollmentToken: 'jwt', enrollmentExpiresAt: future()})).toBe('available');
            expect(enrollmentTokenStatus({enrollmentToken: 'jwt'})).toBe('available');
        });

        it('is expired when a token has an expiry in the past', () => {
            expect(enrollmentTokenStatus({enrollmentToken: 'jwt', enrollmentExpiresAt: past()})).toBe('expired');
        });

        it('reads the expiry from the matching nested enrollment shape', () => {
            expect(enrollmentTokenStatus({enrollment: {ott: {jwt: 'a', expiresAt: past()}}})).toBe('expired');
            expect(enrollmentTokenStatus({enrollment: {ott: {jwt: 'a', expiresAt: future()}}})).toBe('available');
        });
    });
});
