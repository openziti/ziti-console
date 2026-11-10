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

import {routerStatusDots} from './router-status';

describe('routerStatusDots', () => {
    it('draws true (green) circles with Verified/Online titles when both flags are set', () => {
        const html = routerStatusDots({isVerified: true, isOnline: true});
        expect(html).toContain('circle true" title="Verified"');
        expect(html).toContain('circle true" title="Online"');
    });

    it('draws false (grey) circles with Unverified/Offline titles when the flags are missing', () => {
        const html = routerStatusDots({});
        expect(html).toContain('circle false" title="Unverified"');
        expect(html).toContain('circle false" title="Offline"');
    });
});
