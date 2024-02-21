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
import {ValidationService} from "../../../services/validation.service";

@Injectable({
    providedIn: 'root'
})
export class ForwardingConfigService {

    constructor(private validationService: ValidationService) {}

    getProperties(protocol, address, port, forwardProtocol, forwardAddress, forwardPort, allowedProtocols, allowedAddresses, allowedPortRanges) {
        const props = [
            {key: 'protocol', value: protocol},
            {key: 'address', value: address},
            {key: 'port', value: port},
            {key: 'forwardProtocol', value: forwardProtocol ? forwardProtocol : undefined},
            {key: 'forwardAddress', value: forwardAddress ? forwardAddress : undefined},
            {key: 'forwardPort', value: forwardPort ? forwardPort : undefined},
            {key: 'allowedAddresses', value: allowedAddresses},
            {key: 'allowedPortRanges', value: this.validationService.getPortRanges(allowedPortRanges)},
            {key: 'allowedProtocols', value: allowedProtocols},
        ];
        return props;
    }

    validate(allowedPortRanges) {
        const errors: any = {};
        errors.allowedPortRanges = this.validationService.validatePortRanges(allowedPortRanges);
    }
}