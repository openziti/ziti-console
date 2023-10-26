import {Injectable, Inject} from '@angular/core';
import {BehaviorSubject, Observable, Subscription} from "rxjs";
import {SettingsServiceClass, ZitiDomainControllerService, ZitiSessionData, SETTINGS_SERVICE} from "open-ziti-console-lib";
import {HttpClient} from '@angular/common/http';

import {isEmpty} from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class SimpleZitiDomainControllerService implements ZitiDomainControllerService {

    zitiSessionData: ZitiSessionData = {
        zitiDomain: '',
        zitiSessionId: '',
        expiresAt: ''
    }
    subscription: Subscription = new Subscription();
    zitiSettings = new BehaviorSubject(this.zitiSessionData);
    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass, private http: HttpClient) {

        this.subscription.add(this.settingsService.settingsChange.subscribe((results: any) => {
            if (isEmpty(results)) {
                return;
            }
            this.zitiSessionData.zitiSessionId = results.session.id;
            this.zitiSessionData.zitiDomain = results.session.controllerDomain;
            this.zitiSettings.next({...this.zitiSessionData});
        }));
    }
}
