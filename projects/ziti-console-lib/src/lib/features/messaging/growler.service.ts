import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {GrowlerModel} from "./growler.model";
import {LoggerService} from "./logger.service";

const errorString = 'error';

const sessionStorageString = 'growlerErrors';

@Injectable({providedIn: 'root'})
export class GrowlerService {

    constructor(private logger: LoggerService) {}

    updateGrowlerEmitter = false;
    private data = new Subject<GrowlerModel>();
    data$ = this.data.asObservable();

    private updateGrowlerSource = new Subject<boolean>();
    updateGrowler = this.updateGrowlerSource.asObservable();

    private sessionGrowlerObject = {
        growlerMessages: [],
    };
    private loginGrowlerPaths = ['/signup', '/app-login', '/app-invitation', '/page-not-found', '/callback'];

    show(data: GrowlerModel) {
        // if the messaging message is an error message
        if (data.level !== null && data.level !== undefined && data.level.toLowerCase() === errorString) {
            // if the user is on the login page, use a special location in session storage to hold onto any messaging errors
            if (this.loginGrowlerPaths.indexOf(window.location.pathname) === -1) {
                // otherwise, using the normal location to store the messaging errors
                const growlerErrorsString = sessionStorage.getItem(sessionStorageString);

                let growlerErrors;

                if (growlerErrorsString === undefined || growlerErrorsString === null || growlerErrorsString === '') {
                    growlerErrors = this.sessionGrowlerObject;
                } else {
                    growlerErrors = JSON.parse(growlerErrorsString);
                }
                const growlerMessage = {
                    level: data.level,
                    title: data.title,
                    subtitle: data.subtitle,
                    content: data.content,
                    timestamp: Date.now(),
                };
                growlerErrors.growlerMessages.push(growlerMessage);
                sessionStorage.setItem(sessionStorageString, JSON.stringify(growlerErrors));
            }
        }
        this.data.next(data);
        this.logger.info(`Growler Msg: ${data.level} ${data.title} ${data.subtitle} ${data.content} `);
        this.updateGrowlerSource.next(!this.updateGrowlerEmitter);
    }
}
