import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, Subject, Subscription} from "rxjs";
import {NavigationEnd, Router} from "@angular/router";
import {ZitiControllerService} from "./ziti-controller.service";
import {URLS} from './urls';
import {Resolver} from "@stoplight/json-ref-resolver";
import {get, set, isEmpty} from 'lodash';
import $ from 'jquery';

export const COMPONENTS: any = {
  add:      `<div class="action icon-plus" data-action="add"></div>`,
  line:     `<div class="line"></div>`,
  noitems:  `<div class="noitems"></div>`,
  save:     `<div class="buttons">
                 <div class="linkButton closer" data-i18n="Oops"></div>
                 <div id="SaveButton" class="button" data-defined="save" data-i18n="Save"></div>
             </div>`,
  search:   `<div class="filters">
                 <input id="SearchFilter" data-defined="search" type="text" class="search" data-i18n="EnterFilter" />
                 <div class="clear icon-clear" data-defined="clear"></div>
                 <div class="searchButton icon-search"></div>
                 <div class="counters"><span id="Start">-</span>-<span id="End">-</span> <span data-i18n="Of"></span> <span id="Total">-</span></div>
                 <div class="navigate prev icon-prev disabled"></div>
                 <div class="navigate next icon-next disabled"></div>
            </div>`,
  tabIdentities: `<div class="tabs">
                      <div class="tab" data-go="/identities" data-i18n="Identities"></div>
                      <div class="tab" data-go="/recipes" data-i18n="Recipes"></div>
                      <div class="tab" data-go="/terminators" data-i18n="Terminators"></div>
                      <div class="tab" data-go="/posture-checks" data-i18n="PostureChecks"></div>
                  </div>`,
  tabPolicies: `<div class="tabs">
                    <div class="tab" data-go="/service-policies" data-i18n="ServicePolicies"></div>
                    <div class="tab" data-go="/router-policies" data-i18n="EdgeRouterPolicies"></div>
                    <div class="tab" data-go="/service-router-policies" data-i18n="ServiceRouterPolicies"></div>
                    <div class="tab" data-go="/auth-policies" data-i18n="AuthPolicies"></div>
                    <div class="tab" data-go="/jwt-signers" data-i18n="JwtSigners"></div>
                </div>`,
  tabRouters: `<div class="tabs">
                    <div class="tab" data-go="/routers" data-i18n="EdgeRouters"></div>
                    <div class="tab" data-go="/transit-routers" data-i18n="TransitRouters"></div>
                    <div class="tab" data-go="/router-policies" data-i18n="EdgeRouterPolicies"></div>
                </div>`,
  tabServers: `<div class="tabs">
                  <div class="tab" data-go="/servers" data-i18n="ManageServers">Manage Servers</div>
                  <div class="tab" data-go="/organization" data-i18n="ManageFields">Manage Custom Fields</div>
              </div>`,
  tabServices: `<div class="tabs">
                  <div class="tab" data-go="/services" data-i18n="Services"></div>
                  <div class="tab" data-go="/configs" data-i18n="Configurations"></div>
                  <div class="tab" data-go="/config-types" data-i18n="ConfigTypes"></div>
              </div>`,
  tabSessions: `<div class="tabs">
                    <div class="tab" data-go="/sessions" data-i18n="Sessions"></div>
                    <div class="tab" data-go="/api-sessions" data-i18n="APISessions"></div>
                </div>`,
}


@Injectable({providedIn: 'root'})
export class ZacWrapperService {
  pageChange = new Subject<void>();
  zitiSessionId = '';
  subscription: Subscription = new Subscription();
  controllerSecrets = {
    username: '',
    password: ''
  }
  currentNetwork: any = {};
  zitiControllerDomain = '';
  page = 'index';
  scriptsAdded = false;

  constructor(
    private http: HttpClient,
    private zitiControllerService: ZitiControllerService,
    private router: Router,
  ) {}

  initZac() {
    const appInit = get(window, 'app.init');
    set(window, 'service.call', this.handleServiceCall.bind(this));
    this.initZacListeners();
    this.initSubscriptions();
    this.initRouteListener();
  }

  initZacListeners() {
    set(window, 'header.goto', (event: any) => {
      const url = $(event.currentTarget).data("go");
      let route = '';
      switch (url) {
        case '':
          this.page = 'index';
          route = URLS.ZITI_DASHBOARD;
          break;
        case '/identities':
        case 'identities':
          this.page = 'identities';
          route = URLS.ZITI_IDENTITIES;
          break;
        case '/jwt-signers':
        case 'jwt-signers':
          this.page = 'jwt-signers';
          route = URLS.ZITI_JWT_SIGNERS;
          break;
        case '/services':
        case 'services':
          this.page = 'services';
          route = URLS.ZITI_SERVICES;
          break;
        case '/routers':
        case 'routers':
          this.page = 'routers';
          route = URLS.ZITI_ROUTERS;
          break;
        case '/transit-routers':
        case 'transit-routers':
          this.page = 'transit-routers';
          route = URLS.ZITI_TRANSIT_ROUTERS;
          break;
        case '/configs':
        case 'configs':
          this.page = 'configs';
          route = URLS.ZITI_CONFIGS;
          break;
        case '/config-types':
        case 'config-types':
          this.page = 'config-types';
          route = URLS.ZITI_CONFIG_TYPES;
          break;
        case '/recipes':
        case 'recipes':
          this.page = 'recipes';
          route = URLS.ZITI_RECIPES;
          break;
        case '/terminators':
        case 'terminators':
          this.page = 'terminators';
          route = URLS.ZITI_TERMINATORS;
          break;
        case '/auth-policies':
        case 'auth-policies':
          this.page = 'auth-policies';
          route = URLS.ZITI_AUTH_POLICIES;
          break;
        case '/service-policies':
        case 'service-policies':
          this.page = 'service-policies';
          route = URLS.ZITI_SERVICE_POLICIES;
          break;
        case '/router-policies':
        case 'router-policies':
          this.page = 'router-policies';
          route = URLS.ZITI_ROUTER_POLICIES;
          break;
        case '/service-router-policies':
        case 'service-router-policies':
          this.page = 'service-router-policies';
          route = URLS.ZITI_SERVICE_ROUTER_POLICIES;
          break;
        case '/posture-checks':
        case 'posture-checks':
          this.page = 'posture-checks';
          route = URLS.ZITI_POSTURE_CHECKS;
          break;
        case '/cas':
        case 'cas':
          this.page = 'cas';
          route = URLS.ZITI_CERT_AUTHORITIES;
          break;
        case '/sessions':
        case 'sessions':
          this.page = 'sessions';
          route = URLS.ZITI_SESSIONS;
          break;
        case '/login':
        case 'login':
          this.page = 'login';
          route = URLS.ZAC_LOGIN;
          break;
        default:
          this.page = 'index';
          route = URLS.ZITI_DASHBOARD;
          break;
      }
      this.router.navigate([route]);
    });
  }

  initRouteListener() {
    this.router.events.subscribe(( event) => {
      if ((event as any)['routerEvent'] instanceof NavigationEnd) {
        const page = (event as any)['routerEvent']['url'].split(';')[0].split('?')[0];
        switch (page) {
          case URLS.ZITI_DASHBOARD:
            this.page = 'index';
            break;
          case URLS.ZITI_SERVICES:
            this.page = 'services';
            break;
          case URLS.ZITI_IDENTITIES:
            this.page = 'identities';
            break;
          case URLS.ZITI_JWT_SIGNERS:
            this.page = 'jwt-signers';
            break;
          case URLS.ZITI_CONFIGS:
            this.page = 'configs';
            break;
          case URLS.ZITI_CONFIG_TYPES:
            this.page = 'config-types';
            break;
          case URLS.ZITI_ROUTERS:
            this.page = 'routers';
            break;
          case URLS.ZITI_TRANSIT_ROUTERS:
            this.page = 'transit-routers';
            break;
          case URLS.ZITI_RECIPES:
            this.page = 'recipes';
            break;
          case URLS.ZITI_TERMINATORS:
            this.page = 'terminators';
            break;
          case URLS.ZITI_AUTH_POLICIES:
            this.page = 'service-policies';
            break;
          case URLS.ZITI_SERVICE_POLICIES:
            this.page = 'service-policies';
            break;
          case URLS.ZITI_ROUTER_POLICIES:
            this.page = 'router-policies';
            break;
          case URLS.ZITI_SERVICE_ROUTER_POLICIES:
            this.page = 'service-router-policies';
            break;
          case URLS.ZITI_POSTURE_CHECKS:
            this.page = 'posture-checks';
            break;
          case URLS.ZITI_CERT_AUTHORITIES:
            this.page = 'cas';
            break;
          case URLS.ZITI_SESSIONS:
            this.page = 'sessions';
            break;
          case URLS.ZAC_LOGIN:
            this.page = 'login';
            break;
          default:
            this.page = 'index';
            break;
        }
        this.pageChange.next();
      }
    });
  }

  initSubscriptions() {
    // this.apiService.currentNetwork.subscribe(async (network: any) => {
    //   if (isEmpty(network?.id)) {
    //     return;
    //   }
    //   this.currentNetwork = network;
    // });
    // this.zitiControllerService.zitiControllerSession.subscribe((session: any) => {
    //   this.zitiControllerDomain = session.domain;
    //   this.zitiSessionId = session.sessionToken;
    // });
  }

  initEdgeManagementSession() {
    // const domainPromise = this.networkServiceV2.getNetworkControllerInfo(this.currentNetwork?.networkController?.id).toPromise().then(async (result: any) => {
    //   this.zitiControllerDomain = result.domainName;
    //   this.networkServiceV2
    //     .getNetworkControllerSession(this.currentNetwork?.networkController?.id).toPromise().then((result: any) => {
    //       this.zitiSessionId = result.sessionToken;
    //     });
    // });
  }

  loadCurrentPage() {
    const path = 'assets/pages/' + this.page + '.htm';
    return this.http.get(path, {responseType: "text"}).toPromise().then((html: any) => {
      for (const prop in COMPONENTS) {
        html = html.split('{{html.'+prop+'}}').join(COMPONENTS[prop]);
      }
      return html;
    });
  }

  handleServiceCall(name: string, params: any, returnTo: any, type: any) {
    switch (name) {
      case 'data':
        this.getZitiEntities(params.type, params.paging).then((result) => {
          returnTo(result);
        });
        break;
      case 'subdata':
        this.getZitiEntity(params).then((result) => {
          returnTo(result);
        });
        break;
      case 'dataSave':
        this.saveZitiEntity(params, returnTo);
        break;
      case 'call':
        this.callZitiEdge(`https://${this.zitiControllerDomain}/edge/management/v1/${params.url}`, {}).then((result) => {
          returnTo(result);
        });
        break;
      case 'schema':
        this.dereferenceJSONSchema(params.schema).then((schema) => {
          returnTo({data: schema});
        })
        break;
      case 'template':
      case 'language':
        this.getLocaleFile(params.locale).then((result) => {
          returnTo(result)
        });
        break;
      case 'settings':
        this.callZitiEdge("/api/settings", {}).then((result) => {
          returnTo(result);
        });
        break;
      case 'version':
        this.callZitiEdge("/api/version", {}).then((result) => {
          returnTo(result);
        });
        break;
      case 'controllerSave':
        this.callZitiEdge("/api/controllerSave", {}).then((result) => {
          returnTo(result);
        });
        break;
      case 'server':
        this.callZitiEdge("/api/server", {}).then((result) => {
          returnTo(result);
        });
        break;
    }
  }

  async dereferenceJSONSchema(data: any) {
    const resolver = new Resolver();
    const schema = await resolver.resolve(data);
    return schema.result;
  }

  getLocaleFile(locale: string = 'en-us') {
    locale = locale.toLowerCase();
    const path = 'assets/languages/' + locale + '.json';
    return this.http.get(path, {responseType: "text"}).toPromise().then((result: any) => {
      return JSON.parse(result);
    });
  }

  getZitiEntities(type: string, paging: any) {
    const serviceUrl = `https://${this.zitiControllerDomain}/edge/management/v1`;
    let urlFilter = "";
    let toSearchOn = "name";
    let noSearch = false;
    if (paging && paging.sort!=null) {
      if (paging.searchOn) toSearchOn = paging.searchOn;
      if (paging.noSearch) noSearch = true;
      if (!paging.filter) paging.filter = "";
      paging.filter = paging.filter.split('#').join('');
      if (noSearch) {
        if (paging.page !== -1) urlFilter = "?limit="+paging.total+"&offset="+((paging.page-1)*paging.total);
      } else {
        if (paging.page !== -1) urlFilter = "?filter=("+toSearchOn+" contains \""+paging.filter+"\")&limit="+paging.total+"&offset="+((paging.page-1)*paging.total)+"&sort="+paging.sort+" "+paging.order;
        if (paging.params) {
          for (const key in paging.params) {
            urlFilter += ((urlFilter.length===0)?"?":"&")+key+"="+paging.params[key];
          }
        }
      }
    }
    return this.callZitiEdge(serviceUrl+"/"+type+urlFilter, {});
  }

  getZitiEntity(params: any) {
    const serviceUrl = `https://${this.zitiControllerDomain}/edge/management/v1`;
    const url = params.url.split("./").join("");
    const id = params.id;
    const type = params.type;
    const parentType = params.name;
    return this.callZitiEdge(serviceUrl+"/"+url, {}, 'GET').then((result: any) => {
      return {
        id: id,
        parent: parentType,
        type: type,
        data: result.data
      }
    });
  }

  saveZitiEntity(params: any, returnTo: any) {
    const serviceUrl = `https://${this.zitiControllerDomain}/edge/management/v1`;
    const saveParams = params.save;
    const additional = params.additional;
    const removal = params.removal;
    const type = params.type;
    const paging = params.paging;
    let method = "POST";
    let id = params.id;
    let url = serviceUrl+"/"+type;
    let chained = false;
    if (params.chained) chained = params.chained;
    if (id&&id.trim().length>0) {
      method = "PATCH";
      url += "/"+id.trim();
      if (removal) {
        let objects = Object.entries(removal);
        if (objects.length>0) {
          for (let i=0; i<objects.length; i++) {
            const parameters: any = {};
            parameters.ids = objects[i][1];
            this.callZitiEdge(serviceUrl+"/"+type+"/"+id.trim()+"/"+objects[i][0], parameters, 'DELETE');
          }
        }
      }
    }
    for (const prop in saveParams.data) {
      if (Array.isArray(saveParams.data[prop]) && saveParams.data[prop].length==0) {
        delete saveParams.data[prop];
      } else {
        //console.log("Not Array: "+prop+" "+saveParams.data[prop].length);
      }
    }

    this.callZitiEdge(url, saveParams, method).then((result: any) => {
        if (result?.error) this.handleError(result.error);
        else if (result?.data) {
          if (additional) {
            let objects = Object.entries(additional);
            let index = 0;
            if (objects.length>0) {
              if (method === "POST") id = result?.data?.id;
              for (let i=0; i<objects.length; i++) {
                this.callZitiEdge(serviceUrl+"/"+type+"/"+id+"/"+objects[i][0], { ids: objects[i][1] }, 'PUT').then((res: any) => {
                  index++;
                  if (index === objects.length) {
                    if (chained) returnTo(res.data);
                    else this.getZitiEntities(type, paging).then((result) => {
                      returnTo(result)
                    });
                  }
                });
              }
            } else {
              if (chained) returnTo(result.data);
              else this.getZitiEntities(type, paging).then((result) => {
                returnTo(result)
              });
            }
          } else {
            if (chained) returnTo(result.data);
            else this.getZitiEntities(type, paging).then((result) => {
              returnTo(result)
            });
          }
        } else returnTo( {error: "Unable to save data"} );
    });
  }

  callZitiEdge(url: string, body: any, method: string = 'GET') {
    const options = this.getHttpOptions();
    let prom;
    switch (method) {
      case 'GET':
        prom = this.http.get(url, options).toPromise();
        break;
      case 'POST':
        prom = this.http.post(url, body, options).toPromise();
        break;
      case 'PUT':
        prom = this.http.put(url, body, options).toPromise();
        break;
      case 'PATCH':
        prom = this.http.patch(url, body, options).toPromise();
        break;
      case 'DELETE':
        prom = this.http.delete(url, options).toPromise();
        break;
      default:
        prom = this.http.get(url, options).toPromise();
        break;
    }
    return prom.catch((result) => {
      return result?.error;
    });
  }

  getHttpOptions(useZitiCreds = false) {
    const options: any = {
      headers: {
        accept: 'application/json',
        'zt-session': this.zitiSessionId
      },
      params: {},
      responseType: 'json' as const,
    };
    return options;
  }

  handleError(result: any) {
    // this.growlService.show(
    //   new GrowlerData(
    //     'error',
    //     'An Error Occurred',
    //     `Error`,
    //     result?.message
    //   )
    // );
  }
}
