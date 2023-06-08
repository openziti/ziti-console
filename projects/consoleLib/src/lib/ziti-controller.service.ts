import {Inject, Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import { delay, isEmpty, debounce } from 'lodash';
import moment from 'moment';


@Injectable({providedIn: 'root'})
export class ZitiControllerService {

  currentNetwork: any = {};
  _currentZitiControllerSession: any = {};
  zitiControllerSession = new BehaviorSubject<any>(this._currentZitiControllerSession);
  tokenExpirationDate: any = {};
  tokenRequests = 0;

  getZitiControllerSessionDebounced = debounce(this.getZitiControllerSession.bind(this), 10000, {leading: true});

  constructor(

  ) {
    this.initSubscriptions();
  }

  initSubscriptions() {
    // this.apiService.currentNetwork.subscribe(async (network: any) => {
    //   if (isEmpty(network?.id)) {
    //     return;
    //   }
    //   this.currentNetwork = network;
    //   this.getZitiControllerSessionDebounced();
    // });
  }

  getZitiControllerSession() {
    if (isEmpty(this.currentNetwork?.networkController?.id)) {
      return;
    }
    // this.networkServiceV2.getNetworkControllerInfo(this.currentNetwork?.networkController?.id).toPromise().then(async (result: any) => {
    //   const zitiControllerDomain = result.domainName;
    //   this.networkServiceV2
    //     .getNetworkControllerSession(this.currentNetwork?.networkController?.id).toPromise().then((result:any) => {
    //     const zitiControllerSession = {
    //       sessionToken: result.sessionToken,
    //       domain: zitiControllerDomain,
    //       expiresAt: result.expiresAt
    //     };
    //     this.tokenExpirationDate = moment(result.expiresAt);
    //     const expTime = this.tokenExpirationDate.diff(moment());
    //     let buffer = expTime - (1000 * 30);
    //     if (buffer < 10000) {
    //       buffer = 10000;
    //     }
      //   delay(() => {
      //     this.getZitiControllerSessionDebounced();
      //   }, buffer);
      //   this.setCurrentZitiControllerSession(zitiControllerSession)
      // });
    // });
  }

  setCurrentZitiControllerSession(zitiControllerSession: any) {
    this.zitiControllerSession.next(zitiControllerSession);
    this._currentZitiControllerSession = zitiControllerSession;
  }


}
