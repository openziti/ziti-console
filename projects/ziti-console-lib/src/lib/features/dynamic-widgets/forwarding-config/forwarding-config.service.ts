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

import {Injectable} from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class ForwardingConfigService {

    getProperties(protocol, address, port, forwardProtocol, forwardAddress, forwardPort, allowedProtocols, allowedAddresses, allowedPortRanges) {
        const props = [
            {key: 'protocol', value: protocol},
            {key: 'address', value: address},
            {key: 'port', value: port},
            {key: 'forwardProtocol', value: forwardProtocol ? forwardProtocol : undefined},
            {key: 'forwardAddress', value: forwardAddress ? forwardAddress : undefined},
            {key: 'forwardPort', value: forwardPort ? forwardPort : undefined},
            {key: 'allowedAddresses', value: allowedAddresses},
            {key: 'allowedPortRanges', value: this.getPortRanges(allowedPortRanges)},
            {key: 'allowedProtocols', value: allowedProtocols},
        ];
        return props;
    }

    getPortRanges(allowedPortRanges) {
        if (!allowedPortRanges) {
            return [];
        }
        const ranges = [];
        allowedPortRanges.forEach((val: string) => {
            const vals = val.split('-');
            if (vals.length === 1) {
                const port = parseInt(val);
                ranges.push({high: port, low: port});
            } else if (vals.length === 2) {
                const port1 = parseInt(vals[0]);
                const port2 = parseInt(vals[1]);
                ranges.push({low: port1, high: port2});
            } else {
                // do nothing, invalid range
            }
        });
        return ranges;
    }

    parseAllowedPortRanges(allowedPortRanges) {
        const val = [];
        if (!allowedPortRanges) {
            return val;
        }
        allowedPortRanges.forEach((range: any) => {
            if (range.low === range.high) {
                val.push(range.low + '');
            } else {
                val.push(range.low + '-' + range.high);
            }
        });
        return val;
    }

    validate(allowedPortRanges) {
        const errors: any = {};
        errors.allowedPortRanges = this.validatePortRanges(allowedPortRanges);
    }

    validatePortRanges(allowedPortRanges) {
        let invalid = false;
        if (!allowedPortRanges) {
            return invalid;
        }
        allowedPortRanges.forEach((val: string) => {
            const vals = val.split('-');
            if (vals.length === 1) {
                const port = parseInt(val);
                if (isNaN(port)) {
                    invalid = true;
                    return;
                }
            } else if (vals.length === 2) {
                const port1 = parseInt(vals[0]);
                const port2 = parseInt(vals[1]);
                if (isNaN(port1) || isNaN(port2)) {
                    invalid = true;
                    return;
                } else if (port1 > port2) {
                    invalid = true;
                    return;
                }
            } else {
                // do nothing, invalid range
            }
        });
        return invalid;
    }
}