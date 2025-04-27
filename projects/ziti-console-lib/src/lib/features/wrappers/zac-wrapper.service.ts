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

import {EventEmitter, Inject, Injectable, InjectionToken} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Subject, Subscription} from "rxjs";
import {NavigationEnd, Router} from "@angular/router";
import {Resolver} from "@stoplight/json-ref-resolver";
import {get, isEmpty, set, unset} from 'lodash';
import $ from 'jquery';
import {ZITI_DOMAIN_CONTROLLER, ZitiDomainControllerService} from "../../services/ziti-domain-controller.service";
import {ZITI_URLS} from "../../ziti-console.constants";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {ZacWrapperServiceClass} from "./zac-wrapper-service.class";
import {GrowlerService} from "../messaging/growler.service";
import {GrowlerModel} from "../messaging/growler.model";
import {LoggerService} from "../messaging/logger.service";
import {VERSION} from "../../version";
import {ValidationService} from "../../services/validation.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";

// @ts-ignore
const {modal, growler} = window;

export const COMPONENTS: any = {
    api: `<label data-i18n="APICalls"></label>
          <div class="configBox">
            <div class="related">
                <input id="ApiUrl" type="text" readonly />
                <div class="icon-copy copy" data-copy="ApiUrl"></div>
            </div>
            <div class="related">
                <textarea id="ApiParams" autocapitalize="off" style="height:500px"></textarea>
                <div class="icon-copy copy swap" data-copy="ApiParams"></div>
            </div> 
          </div>`,
    add: `<div class="action icon-plus" data-action="add"></div>`,
    line: `<div class="line"></div>`,
    noitems: `<div class="noitems"></div>`,
    save: `<div class="buttons">
                 <div class="linkButton closer" data-i18n="Oops"></div>
                 <div id="SaveButton" class="button" data-defined="save" data-i18n="Save"></div>
             </div>`,
    search: `<div class="filters">
                 <input id="SearchFilter" data-defined="search" type="text" class="search" data-i18n="EnterFilter" />
                 <div class="clear icon-clear" data-defined="clear"></div>
                 <div class="searchButton icon-search"></div>
                 <div class="counters"><span id="Start">-</span>-<span id="End">-</span> <span data-i18n="Of"></span> <span id="Total">-</span></div>
                 <div class="navigate prev icon-prev disabled"></div>
                 <div class="navigate next icon-next disabled"></div>
            </div>`,
    tabImportExport: `<div class="tabs">
                        <div class="tab" data-go="/import" data-i18n="Import"></div>
                        <div class="tab" data-go="/export" data-i18n="Export"></div>
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
                </div>`,
    tabAuthentication: `<div class="tabs">
                            <div class="tab" data-go="/cas" data-i18n="CAs"></div>
                            <div class="tab" data-go="/auth-policies" data-i18n="AuthPolicies"></div>
                            <div class="tab" data-go="/jwt-signers" data-i18n="JwtSigners"></div>
                        </div>`,
    tabRouters: `<div class="tabs">
                    <div class="tab" data-go="/routers" data-i18n="EdgeRouters"></div>
                    <div class="tab" data-go="/transit-routers" data-i18n="TransitRouters"></div>
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
    customtags: `<label data-i18n="Tags"></label>
                <div class="configBox">
                    <div id="TagExtended"></div>
                </div>`
}


@Injectable({providedIn: 'root'})
export class ZacWrapperService extends ZacWrapperServiceClass {

    modalShow;
    modalClose;

    constructor(
        @Inject(ZITI_DOMAIN_CONTROLLER) override zitiDomainController: ZitiDomainControllerService,
        @Inject(ZITI_URLS) override URLS:any,
        @Inject(SETTINGS_SERVICE) override settingsService: SettingsService,
        override http: HttpClient,
        override router: Router,
        override growlerService: GrowlerService,
        override loggerService: LoggerService,
        override validationService: ValidationService
    ) {
        super(zitiDomainController, URLS, settingsService, http, router, growlerService, loggerService, validationService);
        this.getCurrentPage(this.router.url);
        this.initRouteListener();
    }

    initZac() {
        if (this.zacInit) {
            return;
        }
        const appInit = get(window, 'app.init');
        this.settingsService.settingsChange.subscribe((settings) => {
            set(window, 'service.call', this.handleServiceCall.bind(this));
        });
        this.initZacListeners();
        this.zacInit = true;
    }

    override initZacListeners() {
        set(window, 'header.goto', (event: any) => {
            const url = $(event.currentTarget).data("go");
            let route = this.getCurrentPage(url);
            this.router.navigate([route]);
        });
    }

    private getCurrentPage(url) {
        let route = '';
        switch (url) {
            case '':
                this.page = 'index';
                route = this.URLS.ZITI_DASHBOARD;
                break;
            case '/import':
            case 'import':
                this.page = 'import';
                route = this.URLS.ZITI_IMPORT;
                break;
            case '/export':
            case 'export':
                this.page = 'export';
                route = this.URLS.ZITI_EXPORT;
                break;
            case '/identities':
            case 'identities':
                this.page = 'identities';
                route = this.URLS.ZITI_IDENTITIES;
                break;
            case '/attributes':
            case 'attributes':
                this.page = 'attributes';
                route = this.URLS.ZITI_ATTRIBUTES;
                break;
            case '/jwt-signers':
            case 'jwt-signers':
                this.page = 'jwt-signers';
                route = this.URLS.ZITI_JWT_SIGNERS;
                break;
            case '/services':
            case 'services':
                this.page = 'services';
                route = this.URLS.ZITI_SERVICES;
                break;
            case '/routers':
            case 'routers':
                this.page = 'routers';
                route = this.URLS.ZITI_ROUTERS;
                break;
            case '/transit-routers':
            case 'transit-routers':
                this.page = 'transit-routers';
                route = this.URLS.ZITI_TRANSIT_ROUTERS;
                break;
            case '/configs':
            case 'configs':
                this.page = 'configs';
                route = this.URLS.ZITI_CONFIGS;
                break;
            case '/config-types':
            case 'config-types':
                this.page = 'config-types';
                route = this.URLS.ZITI_CONFIG_TYPES;
                break;
            case '/recipes':
            case 'recipes':
                this.page = 'recipes';
                route = this.URLS.ZITI_RECIPES;
                break;
            case '/terminators':
            case 'terminators':
                this.page = 'terminators';
                route = this.URLS.ZITI_TERMINATORS;
                break;
            case '/config-terminators':
            case 'config-terminators':
                this.page = 'config-terminators';
                route = this.URLS.ZITI_CONFIG_TERMINATORS;
                break;
            case '/auth-policies':
            case 'auth-policies':
                this.page = 'auth-policies';
                route = this.URLS.ZITI_AUTH_POLICIES;
                break;
            case '/service-policies':
            case 'service-policies':
                this.page = 'service-policies';
                route = this.URLS.ZITI_SERVICE_POLICIES;
                break;
            case '/router-policies':
            case 'router-policies':
                this.page = 'router-policies';
                route = this.URLS.ZITI_ROUTER_POLICIES;
                break;
            case '/service-router-policies':
            case 'service-router-policies':
                this.page = 'service-router-policies';
                route = this.URLS.ZITI_SERVICE_ROUTER_POLICIES;
                break;
            case '/posture-checks':
            case 'posture-checks':
                this.page = 'posture-checks';
                route = this.URLS.ZITI_POSTURE_CHECKS;
                break;
            case '/certificate-authorities':
            case 'certificate-authorities':
            case '/cas':
            case 'cas':
                this.page = 'cas';
                route = this.URLS.ZITI_CERT_AUTHORITIES;
                break;
            case '/sessions':
            case 'sessions':
                this.page = 'sessions';
                route = this.URLS.ZITI_SESSIONS;
                break;
            case '/network-visualizer':
            case 'network-visualizer':
                 this.page = 'network-visualizer';
                 route = this.URLS.NETWORK_VISUALIZER;
                 break;
            case '/api-sessions':
            case 'api-sessions':
                this.page = 'api-sessions';
                route = this.URLS.ZITI_API_SESSIONS;
                break;
            case '/servers':
            case 'servers':
                this.page = 'servers';
                route = this.URLS.ZITI_SERVERS;
                break;
            case '/login':
            case 'login':
                this.page = 'login';
                route = this.URLS.ZAC_LOGIN;
                break;
            case '/organization':
            case 'organization':
                this.page = 'organization';
                route = this.URLS.ZITI_CUSTOM_FIELDS;
                break;
            case '/profile':
            case 'profile':
                this.page = 'profile';
                route = this.URLS.ZITI_PROFILE;
                break;
            case '/settings':
            case 'settings':
                this.page = 'settings';
                route = this.URLS.ZITI_SETTINGS;
                break;
            default:
                this.page = 'index';
                route = this.URLS.ZITI_DASHBOARD;
                break;
        }
        return route;
    }

    private initRouteListener() {
        this.router.events.subscribe((event) => {
            if ((event as any)['routerEvent'] instanceof NavigationEnd) {
                const oldPage = this.page;
                const page = (event as any)['routerEvent']['url'].split(';')[0].split('?')[0];
                let doPageLoad = false;
                switch (page) {
                    case this.URLS.ZITI_DASHBOARD:
                        this.page = 'index';
                        doPageLoad = true;
                        break;
                    case this.URLS.ZITI_SERVICES:
                        this.page = 'services';
                        break;
                    case this.URLS.ZITI_IDENTITIES:
                        this.page = 'identities';
                        break;
                    case this.URLS.ZITI_JWT_SIGNERS:
                        this.page = 'jwt-signers';
                        break;
                    case this.URLS.ZITI_CONFIGS:
                        this.page = 'configs';
                        break;
                    case this.URLS.ZITI_CONFIG_TYPES:
                        this.page = 'config-types';
                        break;
                    case this.URLS.ZITI_ROUTERS:
                        this.page = 'routers';
                        break;
                    case this.URLS.ZITI_TRANSIT_ROUTERS:
                        this.page = 'transit-routers';
                        break;
                    case this.URLS.ZITI_RECIPES:
                        this.page = 'recipes';
                        break;
                    case this.URLS.ZITI_TERMINATORS:
                        this.page = 'terminators';
                        break;
                    case this.URLS.ZITI_AUTH_POLICIES:
                        this.page = 'auth-policies';
                        break;
                    case this.URLS.ZITI_SERVICE_POLICIES:
                        this.page = 'service-policies';
                        break;
                    case this.URLS.ZITI_ROUTER_POLICIES:
                        this.page = 'router-policies';
                        break;
                    case this.URLS.ZITI_SERVICE_ROUTER_POLICIES:
                        this.page = 'service-router-policies';
                        break;
                    case this.URLS.ZITI_POSTURE_CHECKS:
                        this.page = 'posture-checks';
                        break;
                    case this.URLS.ZITI_BROWZER_CAS:
                    case this.URLS.ZITI_CERT_AUTHORITIES:
                        this.page = 'cas';
                        break;
                    case this.URLS.ZITI_SESSIONS:
                        this.page = 'sessions';
                        break;
                    case this.URLS.ZITI_API_SESSIONS:
                        this.page = 'api-sessions';
                        break;
                    case this.URLS.ZITI_ATTRIBUTES:
                        this.page = 'attributes';
                        break;
                    case this.URLS.ZAC_LOGIN:
                        this.page = 'login';
                        break;
                    case this.URLS.ZITI_SERVERS:
                        this.page = 'servers';
                        break;
                    case this.URLS.ZITI_CUSTOM_FIELDS:
                        this.page = 'organization';
                        break;
                    case this.URLS.ZITI_PROFILE:
                        this.page = 'profile';
                        break;
                    case this.URLS.ZITI_SETTINGS:
                        this.page = 'settings';
                        break;
                    default:
                        this.page = 'index';
                        doPageLoad = true;
                        break;
                }
                if (oldPage !== this.page || doPageLoad) {
                    this.pageChanged.emit();
                }
            }
        });
    }

    override loadCurrentPage() {
        this.getCurrentPage(this.router.url);
        if (isEmpty(this.page)) {
            this.page = 'index'
        }
        const path = 'assets/html/' + this.page + '.htm';
        return this.http.get(path, {responseType: "text"}).toPromise().then((html: any) => {
            for (const prop in COMPONENTS) {
                html = html.split('{{html.' + prop + '}}').join(COMPONENTS[prop]);
            }
            return html;
        });
    }

    handleServiceCall(name: string, params: any, returnTo: any, type: any) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        switch (name) {
            case 'data':
                this.getZitiEntities(params.type, params.paging).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'subdata':
                this.getZitiEntity(params).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'dataSave':
                this.saveZitiEntity(params, returnTo);
                break;
            case 'identity':
                this.createSimpleIdentity(params).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'service':
                this.createSimpleService(params).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'subSave':
                this.saveZitiSubData(params, returnTo);
                break;
            case 'delete':
                this.deleteZitiEntities(params, returnTo);
                break;
            case 'call':
                this.callZitiEdge(`${controllerDomain}/edge/management/v1/${params.url}`, {}).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'schema':
                this.dereferenceJSONSchema(params.schema).then((schema) => {
                    this.handleServiceResult({data: schema}, returnTo);
                })
                break;
            case 'template':
            case 'language':
                this.getLocaleFile(params.locale).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'settings':
                this.http.get("assets/data/settings.json", {}).toPromise().then((result) => {
                    returnTo(result);
                });
                break;
            case 'version':
                this.callZitiEdge(`${controllerDomain}/edge/management/v1/version`, {}).then((result) => {
                    const versionData = {
                        "data": result.data,
                        "serviceUrl": "/edge/management/v1",
                        "zac": VERSION.version,
                        "baseUrl": this.settingsService?.settings?.selectedEdgeController
                    }
                    returnTo(versionData);
                });
                break;
            case 'controllerSave':
                this.callZitiEdge("/api/controllerSave", {}).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'server':
                this.callZitiEdge("/api/server", {}).then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'verify':
                this.callZitiEdge(`${controllerDomain}/edge/management/v1/cas/${params.id}/verify`, params.cert, 'POST', 'text/plain').then((result) => {
                    this.handleServiceResult(result, returnTo);
                });
                break;
            case 'jwt':
                this.callZitiEdge(`${controllerDomain}/edge/management/v1/${params.type}/${params.id}/jwt`, {}, 'GET', 'application/jwt').then((result) => {
                    const jwt = result?.text || result;
                    const data = {id: params.id, jwt: jwt};
                    this.handleServiceResult(data, returnTo);
                });
                break;
            case 'reset':
                this.resetIdentityPassword(params, returnTo);
                break;
            case 'tags':
                // For no this is a no-op
                break;
        }
    }

    resetIdentityPassword(params: any, returnTo: any) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        this.callZitiEdge(`${controllerDomain}/edge/management/v1/current-identity/authenticators?filter=method="updb"`, { rejectUnauthorized: false }, 'GET', 'application/json').then((identResp) => {
            const ident = identResp.data[0];
            var id = ident.id;
            var body = {
                currentPassword: params.password,
                password: params.newpassword,
                username: ident.username
            };
            this.callZitiEdge(`${controllerDomain}/edge/management/v1/current-identity/authenticators/${id}`, body, 'PATCH', 'application/json').then((authResp) => {
                if (authResp.error) {
                    returnTo({ error: "Failed to update password" });
                } else {
                    returnTo({ success: "Password Updated" });
                }
            });
        });
    }

    handleServiceResult(result, returnTo) {
        if (result?.error) {
            result = this.handleError(result);
        }
        returnTo(result);
    }

    async createSimpleIdentity(params) {
        params = {
            name: params.name,
            roleAttributes: params.roles,
            enrollment: { ott: true },
            isAdmin: false,
            type: "Device"
        }
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const url = `${controllerDomain}/edge/management/v1/identities`;
        const id = await this.callZitiEdge(url, params, 'POST').then((result) => {
            return result?.data?.id;
        });
        const entityParams = {
            name: 'identities',
            type: '',
            url: './identities/' + id
        }
        return this.getZitiEntity(entityParams).then((results: any) => {
            results.cli = [];
            results.services = [];

            let cli = "ziti edge create identity device \'"+params.name+"\'";
            if (params.roleAttributes) cli += " -a \'"+params.roleAttributes.toString()+"\'";
            results.cli.push(cli);

            let serviceCall = {
                url: url,
                params: params
            };
            results.services.push(serviceCall);
            return results;
        })
    }

    async createSimpleService(params) {
        const name = params.name;
        const protocol = params.protocol;
        const host = params.host;
        const port = Number(params.port);
        const useEncrypt = params.encrypt;
        const zitiHost = params.zitiHost;
        const zitiPort = Number(params.zitiPort);
        const hosted = params.hosted;
        const access = params.access;

        const rootName = name.trim().replace(/[^a-z0-9 ]/gi, '').split(' ').join('-');
        const clientName = rootName+"-Client";
        const serverName = rootName+"-Server";
        const dialPolicyName = rootName+"-DialPolicy";
        const bindPolicyName = rootName+"-BindPolicy";

        const serverConfig = {
            hostname: host,
            port: port,
            protocol: protocol
        };
        const clientConfig = {
            hostname: zitiHost,
            port: zitiPort
        };

        const paging = {
            filter: "ziti-tunneler-client.v1",
            noSearch: false,
            order: "asc",
            page: 1,
            searchOn: "name",
            sort: "name",
            total: 50
        }
        let configTypeResult = await this.getZitiEntities('config-types', paging);
        const clientConfigId = configTypeResult.data[0]?.id;
        paging.filter = 'ziti-tunneler-server.v1';
        configTypeResult = await this.getZitiEntities('config-types', paging);
        const serverConfigId = configTypeResult.data[0]?.id;

        const serverData = await this.createConfig(serverConfigId, serverName, serverConfig);
        const clientData = await this.createConfig(clientConfigId, clientName, clientConfig);
        const serverId = serverData.id;
        const clientId = clientData.id;

        const serviceData = await this.createService(name, serverId, clientId, useEncrypt);
        const serviceId = serviceData.id;

        const bindData = await this.createServicePolicy(bindPolicyName, "@"+serviceId, hosted);
        const dialData = await this.createServicePolicy(dialPolicyName, "@"+serviceId, access);

        const bindId = bindData.id;
        const dialId = dialData.id;

        const toReturn = {
            data: [],
            cli: [],
            services: []
        };

        const logs = [];
        logs.push({name: serverName, id: serverId, type: "Config"});
        logs.push({name: clientName, id: clientId, type: "Config"});
        logs.push({name: name, id: serviceId, type: "Service"});
        logs.push({name: bindPolicyName, id: bindId, type: "Policy"});
        logs.push({name: dialPolicyName, id: dialId, type: "Policy"});
        toReturn.data = logs;
        toReturn.cli.push(serverData.cli);
        toReturn.cli.push(clientData.cli);
        toReturn.cli.push(serviceData.cli);
        toReturn.cli.push(bindData.cli);
        toReturn.cli.push(dialData.cli);

        toReturn.services.push(serverData.service);
        toReturn.services.push(clientData.service);
        toReturn.services.push(serviceData.service);
        toReturn.services.push(bindData.service);
        toReturn.services.push(dialData.service);

        return toReturn;
    }

    async createService(name, serverId, clientId, encrypt) {
        const params = {
            name: name,
            configs: [serverId, clientId],
            encryptionRequired: encrypt,
        };
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const url = `${controllerDomain}/edge/management/v1/services`;
        return this.callZitiEdge(url, params, 'POST').then((result) => {
            let cli = "ziti edge create service '"+name+"' --configs '"+serverId+","+clientId+"'";
            let serviceCall = {
                url: url+"/services",
                params: params
            };
            var item = {
                id: result?.data?.id || '',
                cli: cli,
                service: serviceCall
            }
            return item;
        });
    }

    async createServicePolicy(name, serviceId, hosted) {
        const params = {
            name: name,
            type: "Bind",
            semantic: "AnyOf",
            serviceRoles: [serviceId],
            identityRoles: hosted,
        }
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const url = `${controllerDomain}/edge/management/v1/service-policies`;
        return this.callZitiEdge(url, params, 'POST').then((result) => {
            let cli = "ziti edge create service-policy '"+name+"' Bind --semantic AnyOf --service-roles '"+serviceId+"' --identity-roles '"+hosted.toString()+"'";
            let serviceCall = {
                url: url+"/service-policies",
                params: params
            };
            var item = {
                id: result?.data?.id || '',
                cli: cli,
                service: serviceCall
            }
            return item;
        });
    }

    async createConfig(configId, name, data, index = 0) {
        const params = {
            name: name+((index>0)?"-"+index:""),
            configTypeId: configId,
            data: data
        };
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const url = `${controllerDomain}/edge/management/v1/configs`;
        return this.callZitiEdge(url, params, 'POST').then((result) => {
            const cli = "ziti edge create config '"+params.name+"' '"+configId+"' '"+JSON.stringify(data).split('"').join('\\"')+"'";
            const serviceCall = {
                url: url+"/configs",
                params: params
            }
            const item = {
                id: result?.data?.id || '',
                cli: cli,
                service: serviceCall
            }
            return item;
        });
    }

    async dereferenceJSONSchema(data: any) {
        const resolver = new Resolver();
        const schema = await resolver.resolve(data);
        return schema.result;
    }

    async getLocaleFile(locale: string = 'en-us') {
        locale = locale.toLowerCase();
        let path = 'assets/languages/' + locale + '.json';
        let localeFile = await this.http.get(path, {responseType: "text"}).toPromise().then((result: any) => {
            return JSON.parse(result);
        }).catch((error) => {
            this.loggerService.error(error);
            return;
        });
        if (!localeFile) {
            path = 'assets/languages/en-us.json';
            localeFile = await this.http.get(path, {responseType: "text"}).toPromise().then((result: any) => {
                return JSON.parse(result);
            })
        }
        return localeFile;
    }

    getZitiEntities(type: string, paging: any) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const serviceUrl = `${controllerDomain}/edge/management/v1`;
        let urlFilter = "";
        let toSearchOn = "name";
        let noSearch = false;
        if (paging && paging.sort != null) {
            if (paging.searchOn) toSearchOn = paging.searchOn;
            if (paging.noSearch) noSearch = true;
            if (!paging.filter) paging.filter = "";
            paging.filter = paging.filter.split('#').join('');
            if (noSearch) {
                if (paging.page !== -1) urlFilter = "?limit=" + paging.total + "&offset=" + ((paging.page - 1) * paging.total);
            } else {
                if (paging.page !== -1) urlFilter = "?filter=(" + toSearchOn + " contains \"" + paging.filter + "\")&limit=" + paging.total + "&offset=" + ((paging.page - 1) * paging.total) + "&sort=" + paging.sort + " " + paging.order;
                if (paging.params) {
                    for (const key in paging.params) {
                        urlFilter += ((urlFilter.length === 0) ? "?" : "&") + key + "=" + paging.params[key];
                    }
                }
            }
        }
        return this.callZitiEdge(serviceUrl + "/" + type + urlFilter, {});
    }

    getZitiEntity(params: any) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const serviceUrl = `${controllerDomain}/edge/management/v1`;
        const url = params.url.split("./").join("");
        const id = params.id;
        const type = params.type;
        const parentType = params.name;
        return this.callZitiEdge(serviceUrl + "/" + url, {}, 'GET').then((result: any) => {
            return {
                id: id,
                parent: parentType,
                type: type,
                data: result.data
            }
        });
    }

    deleteZitiEntities(params, returnTo) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const serviceUrl = `${controllerDomain}/edge/management/v1`;
        const promises = [];
        params.ids.forEach((id) => {
            const type = params.type;
            const parentType = params.name;
            promises.push(this.callZitiEdge(serviceUrl + "/" + type + "/" + id.trim() + "/", {}, 'DELETE').then((result: any) => {
                return {
                    id: id,
                    parent: parentType,
                    type: type,
                    data: result.data
                }
            }));
        });
        return Promise.all(promises).then(() => {
            this.getZitiEntities(params.type, params.paging).then((result) => {
                returnTo(result);
            });
        });
    }

    saveZitiEntity(params: any, returnTo: any) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const serviceUrl = `${controllerDomain}/edge/management/v1`;
        const saveParams = params.save;
        const additional = params.additional;
        const removal = params.removal;
        const type = params.type;
        const paging = params.paging;
        let method = "POST";
        let id = params.id;
        let url = serviceUrl + "/" + type;
        let chained = false;
        if (params.chained) chained = params.chained;
        if (id && id.trim().length > 0) {
            method = "PATCH";
            url += "/" + id.trim();
            if (removal) {
                let objects = Object.entries(removal);
                if (objects.length > 0) {
                    for (let i = 0; i < objects.length; i++) {
                        const parameters: any = {};
                        parameters.ids = objects[i][1];
                        return this.callZitiEdge(serviceUrl + "/" + type + "/" + id.trim() + "/" + objects[i][0], parameters, 'DELETE');
                    }
                }
            }
        }
        saveParams.data = this.validationService.redefineObject(saveParams.data);
        for (const prop in saveParams.data) {
            if (Array.isArray(saveParams.data[prop]) && saveParams.data[prop].length == 0) {
                delete saveParams.data[prop];
            } else {
                //console.log("Not Array: "+prop+" "+saveParams.data[prop].length);
            }
        }

        return this.callZitiEdge(url, saveParams, method).then((result: any) => {
            if (result?.error) {
                returnTo(this.handleError(result.error));
            } else if (result?.data) {
                if (additional) {
                    let objects = Object.entries(additional);
                    let index = 0;
                    if (objects.length > 0) {
                        if (method === "POST") id = result?.data?.id;
                        for (let i = 0; i < objects.length; i++) {
                            this.callZitiEdge(serviceUrl + "/" + type + "/" + id + "/" + objects[i][0], {ids: objects[i][1]}, 'PUT').then((res: any) => {
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
            } else returnTo({error: "Unable to save data"});
        });
    }

    redefineObject(obj) {
        for (let prop in obj) {
            if (Array.isArray(obj[prop]) && obj[prop].length==0) {
                delete obj[prop];
            } else {
                if (typeof obj[prop] === "string" && obj[prop].trim().length==0) {
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

    saveZitiSubData(params: any, returnTo: any) {
        const controllerDomain = this.settingsService?.settings?.selectedEdgeController || '';
        const serviceUrl = `${controllerDomain}/edge/management/v1`;

        const id = params.id;
        const type = params.type;
        const doing = params.doing || 'POST';
        const parentType = params.parentType;
        const fullType = parentType+"/"+id+"/"+type;
        const url = serviceUrl+"/"+fullType;
        const saveParams = params.save;

        this.callZitiEdge(url, saveParams, doing).then((result) => {
            this.getZitiEntities(fullType, params.paging).then((data) => {
                returnTo(data);
            });
        });
    }

    callZitiEdge(url: string, body: any, method: string = 'GET', contentType?: string) {
        const options = this.getHttpOptions(false, contentType);
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

    override initZACButtonListener() {
        if (this.modalClose && this.modalShow) {
            return;
        }
        this.modalShow = modal.show;
        this.modalClose = modal.close;
        if (!this.modalShow || !this.modalClose) {
            return;
        }
        const modalIds = ['DetailModal', 'AddMessageModal', 'QRModal', 'ResetModal', 'OverrideModal', 'AddModal', 'VerifyModal'];
        modal.show = (id, readOnly) => {
            this.modalShow(id, readOnly);
            if (modalIds.includes(id)) {
                $('body').addClass('updateModalOpen');
            }
        };
        modal.close = (event) => {
            this.modalClose(event);
            $('body').removeClass('updateModalOpen');
        };
        if (!this.settingsService?.supportedFeatures?.recipes) {
            $('.tab[data-go="/recipes"]').hide();
        }
    }

    getHttpOptions(useZitiCreds = false, contentType?:string) {
        const options: any = {
            headers: {
                accept: 'application/json',
            },
            params: {},
            responseType: 'json' as const,
        };
        if (contentType) {
            const headers = new HttpHeaders().set('Content-Type', contentType);
            options.headers = headers;
        }
        return options;
    }

    handleError(result: any) {
        this.loggerService.error(result);
        const error = result.error ? result.error : result;
        let message = '';
        if (error.cause&&error.causeMessage&&error.causeMessage.length>0) message = error.causeMessage;
        else if (error.cause&&error.cause.message&&error.cause.message.length>0) message = error.cause.message;
        else if (error.cause&&error.cause.reason&&error.cause.reason.length>0) message = error.cause.reason;
        else if (error.message&&error.message.length>0) message = error.message;
        else message = error;
        return {error: message, data: []};
    }
}
