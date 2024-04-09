import {Injectable} from "@angular/core";
import {isEmpty, isNumber} from "lodash";

@Injectable({
    providedIn: 'root'
})
export class ValidationService {

    getPortRanges(allowedPortRanges) {
        if (!allowedPortRanges) {
            return undefined;
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

    combinePortRanges(allowedPortRanges) {
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

    parsePortRanges(portRanges) {
        const parsedPortRanges = [];
        portRanges.forEach((val: string) => {
            const vals = val.split('-');
            if (vals.length === 1) {
                const port = parseInt(val);
                parsedPortRanges.push({
                    low: port,
                    high: port
                });
            } else if (vals.length === 2) {
                const port1 = parseInt(vals[0]);
                const port2 = parseInt(vals[1]);
                parsedPortRanges.push({
                    low: port1,
                    high: port2
                });
            }
        });
        return parsedPortRanges;
    }

    validatePortRanges(portRanges) {
        let invalid = false;
        if (!portRanges) {
            return invalid;
        }
        portRanges.forEach((range: any) => {
            if (!this.isValidPort(range.low) || !this.isValidPort(range.high)) {
                invalid = true;
                return;
            } else if (range.low > range.high) {
                invalid = true;
                return;
            }
        });
        return invalid;
    }

    isValidPort(port) {
        return !isNaN(port) && isNumber(port) && port >= 1 && port <= 65535;
    }

    isValidInterceptHost(address) {
        return /^(?!\.)(?!.*\.$)([^.]*\.[^.]+)+$/.test(address);
    }
}