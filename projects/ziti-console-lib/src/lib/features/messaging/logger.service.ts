import {Injectable} from '@angular/core';
import {NGXLogger, NgxLoggerLevel} from 'ngx-logger';

// base for the json log
const logJsonBase = {
    userId: '',
    authenticated: false,
    orgId: '',
    azureSubscriptionId: '',
    networkId: '',
    route: '',
    message: '',
    data: '',
};

@Injectable({providedIn: 'root'})
export class LoggerService {
    // the logging level for the client side. Keeping a reference as it is requried when updating the config
    private clientLevel = NgxLoggerLevel.DEBUG;
    // the json to log
    private logJson = {...logJsonBase};

    constructor(public logger: NGXLogger) {
    }

    // function for setting the user information
    public setUser(userId: string, authenticated: boolean) {
        this.logJson.userId = userId;
        this.logJson.authenticated = authenticated;
    }

    // function for setting the org id
    public setOrg(orgId: string) {
        this.logJson.orgId = orgId;
    }

    // function for setting the azureSubscription id
    public setAzureSubscriptionId(azureSubscriptionId: string) {
        this.logJson.azureSubscriptionId = azureSubscriptionId;
    }

    // function for setting the network id
    public setNetworkId(networkId: string) {
        this.logJson.networkId = networkId;
    }

    // function for setting the route
    public setRoute(route: string) {
        this.logJson.route = route;
    }

    public setServerLoggingUrl(url: string) {
        this.logger.updateConfig({level: this.clientLevel, serverLoggingUrl: url});
    }

    // function for setting the client level for logging
    setClientLevel(level: string) {
        switch (level.toUpperCase()) {
            case 'DEBUG': {
                this.clientLevel = NgxLoggerLevel.DEBUG;
                break;
            }

            case 'ERROR': {
                this.clientLevel = NgxLoggerLevel.ERROR;
                break;
            }

            case 'INFO': {
                this.clientLevel = NgxLoggerLevel.INFO;
                break;
            }

            case 'OFF': {
                this.clientLevel = NgxLoggerLevel.OFF;
                break;
            }

            case 'WARN': {
                this.clientLevel = NgxLoggerLevel.WARN;
                break;
            }

            case 'LOG': {
                this.clientLevel = NgxLoggerLevel.LOG;
                break;
            }

            case 'TRACE': {
                this.clientLevel = NgxLoggerLevel.TRACE;
                break;
            }
        }

        this.logger.updateConfig({level: this.clientLevel});
    }

    // function for setting the server level for logging
    public setServerLevel(level: string) {
        switch (level.toUpperCase()) {
            case 'DEBUG': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.DEBUG});
                break;
            }

            case 'ERROR': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.ERROR});
                break;
            }

            case 'INFO': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.INFO});
                break;
            }

            case 'OFF': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.OFF});
                break;
            }

            case 'WARN': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.WARN});
                break;
            }

            case 'LOG': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.LOG});
                break;
            }

            case 'TRACE': {
                this.logger.updateConfig({level: this.clientLevel, serverLogLevel: NgxLoggerLevel.TRACE});
                break;
            }
        }
    }

    // wrapper function for ngx-logger debug
    public debug(message: string, data?: any) {
        // creating a copy of the json log
        const json = {...this.logJson};

        this.setMessageAndData(json, message, data);
        this.logger.debug(message, json);
    }

    // wrapper function for ngx-logger error
    public error(message: string, data?: any) {
        // creating a copy of the json log
        const json = {...this.logJson};

        this.setMessageAndData(json, message, data);
        this.logger.error(message, json);
    }

    // wrapper function for ngx-logger warn
    public warn(message: string, data?: any) {
        // creating a copy of the json log
        const json = {...this.logJson};

        this.setMessageAndData(json, message, data);
        this.logger.warn(message, json);
    }

    // wrapper function for ngx-logger debug
    public info(message: string, data?: any) {
        // creating a copy of the json log
        const json = {...this.logJson};

        this.setMessageAndData(json, message, data);
        this.logger.info(message, json);
    }

    // wrapper function for ngx-logger debug
    public log(message: string, data?: any) {
        // creating a copy of the json log
        const json = {...this.logJson};

        this.setMessageAndData(json, message, data);
        this.logger.info(message, json);
    }

    // wrapper function for ngx-logger debug
    public trace(message: string, data?: any) {
        // creating a copy of the json log
        const json = {...this.logJson};

        this.setMessageAndData(json, message, data);
        this.logger.trace(message, json);
    }

    private resetLogJson() {
        this.logJson = logJsonBase;
    }

    // function for setting the message and data. also takes in an object representing the json that will be logged
    private setMessageAndData(json: any, message: string, data?: any) {
        json.message = message;
        if (data) {
            json.data = data;
        }
    }
}
