import {Injectable} from "@angular/core";
import {includes, isEmpty, isNil, isNumber} from "lodash";

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
        if (!portRanges) {
            return parsedPortRanges;
        }
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
        return includes(address, '.');
    }

    isValidPEM(cert) {
        const header = '-----BEGIN CERTIFICATE-----';
        const footer = '-----END CERTIFICATE-----';

        if (!cert.startsWith(header) || !cert.endsWith(footer)) {
            return false;
        }

        const base64Content = cert.slice(header.length, -footer.length).trim();

        const isBase64 = (str) => {
            const base64Pattern = /^(?:[A-Z0-9+/=]+\n)*[A-Z0-9+/=]+$/i;
            return base64Pattern.test(str);
        };

        return isBase64(base64Content);
    }

    isValidURI(uri) {
        try {
            new URL(uri);
            return true;
        } catch (e) {
            return false;
        }
    }

    redefineObject(obj) {
        for (let prop in obj) {
            if (Array.isArray(obj[prop]) && obj[prop].length==0) {
                delete obj[prop];
            } else {
                if (typeof obj[prop] === "string" && obj[prop].trim().length==0) {
                    delete obj[prop];
                } else if (isNil(obj[prop])) {
                    delete obj[prop];
                } else {
                    if (typeof obj[prop] === "object") {
                        obj[prop] = this.redefineObject(obj[prop]);
                        if (Object.keys(obj[prop]).length==0) {
                            delete obj[prop];
                        }
                    }
                }
            }
        }
        return obj;
    }
}