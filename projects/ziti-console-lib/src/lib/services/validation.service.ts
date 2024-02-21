import {Injectable} from "@angular/core";
import {isNumber} from "lodash";

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

    validatePortRanges(allowedPortRanges) {
        let invalid = false;
        if (!allowedPortRanges) {
            return invalid;
        }
        allowedPortRanges.forEach((val: string) => {
            const vals = val.split('-');
            if (vals.length === 1) {
                const port = parseInt(val);
                if (!this.isValidPort(port)) {
                    invalid = true;
                    return;
                }
            } else if (vals.length === 2) {
                const port1 = parseInt(vals[0]);
                const port2 = parseInt(vals[1]);
                if (!this.isValidPort(port1) || !this.isValidPort(port2)) {
                    invalid = true;
                    return;
                } else if (port1 > port2) {
                    invalid = true;
                    return;
                }
            } else {
                invalid = true;
            }
        });
        return invalid;
    }

    isValidPort(port) {
        return !isNaN(port) && isNumber(port) && port >= 1 && port <= 65535;
    }

}