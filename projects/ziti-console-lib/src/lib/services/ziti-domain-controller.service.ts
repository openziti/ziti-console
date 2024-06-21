import {InjectionToken} from '@angular/core';
import {BehaviorSubject} from "rxjs";
export const ZITI_DOMAIN_CONTROLLER = new InjectionToken<any>('ZITI_DOMAIN_CONTROLLER');

export type ZitiSessionData = {
    zitiDomain: any,
    zitiSessionId: any,
    expiresAt: any
}
export interface ZitiDomainControllerService {
    zitiSettings: BehaviorSubject<ZitiSessionData>;
    handleUnauthorized();
}
