/* eslint prefer-const: 1 */
import {
  Component,
  ViewChild,
  Inject,
  OnInit,
  ViewEncapsulation,
  Injectable,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  SETTINGS_SERVICE,
  SettingsService,
} from '../../../services/settings.service';
import {
  ZITI_DATA_SERVICE,
  ZitiDataService,
} from '../../../services/ziti-data.service';
import {DataTableFilterService, FilterObj} from "../../data-table/data-table-filter.service";
import {catchError} from "rxjs/operators";
import {firstValueFrom, map, Observable} from "rxjs";
import { VisualizerServiceClass  } from '../visualizer-service.class';
import * as d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import {cloneDeep} from "lodash";
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { take, tap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient} from '@angular/common/http';
import { TreeNodeProcessor } from './network-visualizer.treenodeprocessor';
import { NetworkVisualizerHelper } from './network-visualizer.helper';
import {LoggerService} from "../../messaging/logger.service";

@Component({
  selector: 'app-network-visualizer',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './network-visualizer.component.html',
  styleUrls: ['./network-visualizer.component.scss'],
})

export class NetworkVisualizerComponent extends VisualizerServiceClass implements OnInit {
// export class NetworkVisualizerComponent  implements OnInit {
  title = 'Network Visualizer'
  public d3;
  uniqId = 0;
  maxObjectsPerNode = 1001;
  treetooltip;
  fullScreen = false;
  isLoading = true;
  noSearchResults = true;
  services = [];
  services_totalCount = 0;
  all_services_fetched = false;
  identities = [];
  identities_totalCount = 0;
  all_identities_fetched = false;
  edgerouters = [];
  edgerouters_totalCount = 0;
  all_edgerouters_fetched = false;
  service_policies = [];
  service_policies_totalCount = 0;
  all_service_policies_fetched = false;
  edge_router_policies = [];
  edge_router_policies_totalCount = 0;
  all_edge_router_policies_fetched = false;
  service_router_policies = [];
  service_router_policies_totalCount = 0;
  all_service_router_policies_fetched = false;
  configs = [];
  filerResponseMessage = 'search filter..';
  baseNetworkGraph;
  networkGraph;
  currentNetwork;
  searchRootNode;

  servicePoliciesTreeNodes = [];
  servicesTreeNodes = [];
  identitiesTreeNodes = [];
  edgeroutersTreeNodes = [];
  erPoliciesTreeNodes = [];
  serviceEdgeRouterPolicyTreeNodes = [];

  autocompleteOptions;
  resourceTypeError = false;
  filterText = '';
  searchWord = '';
  resourceType = '';
  zoom;
  svg;
  treemap;
  nodes;
  node;
  link;
  links;
  linkExit;
  linkUpdate;
  openNodes = [];
  transform;
  nodeUpdate;
  nodeExit;
  nodeEnter;
  contextmenuNode;
  circles;
  contextmenuNodeType:any = [];
  simulation;
  treeData;
  graphtooltip;
  searchCache;

  constructor(
     @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
     @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
     private httpClient: HttpClient,
     private logger: LoggerService,
     public treeNodeProcessor: TreeNodeProcessor,
     public topologyHelper: NetworkVisualizerHelper,
  ) {
     super();
    // super(settingsService, zitiService);
  }

  override ngOnInit(): void {
     this.getNetworkObjects();
  }

    getPagingObject(pagesize) {
    return cloneDeep({
      filter: "",
      noSearch: true,
      order: "asc",
      page: 1,
      searchOn: "name",
      sort: "name",
      total: pagesize
    })
    }

  async getNetworkObjects() {
    this.isLoading = true;
     await this.readAllObjects();
     this.processFirstNetworkGraph();
  }

   async fetchIdentities (pagesize) {
      const identities_paging = this.getPagingObject(pagesize);
      return await this.zitiService
      .get(`identities`, identities_paging, [])
      .then(async (result) => {
         this.identities = result.data? result.data: [];
         this.identities_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
         if (!this.identities || this.identities.length === 0) {
            this.identities = [];
            this.isLoading = false;
         } else if (this.identities_totalCount < this.maxObjectsPerNode ){
           this.all_identities_fetched = true;
           const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
           const promises = [];
           for (let page = 2; page <= pages; page++) {
             identities_paging.page = page;
             const tmp_promise = await this.zitiService
              .get(
                `identities`,
                 identities_paging,
                []
              ).then((pageResult) => {
                pageResult.data.forEach((serv) => {
                  this.identities.push(serv);
                });
              });
             promises.push(tmp_promise);
           }
           Promise.all(promises).then(() => {
            // this.identities_totalCount = this.identities.length;
           });
        }
    }).catch(error => {
        this.logger.error('Error in fetching Identities', error.message);
     });  // identity promises
  }

  async fetchServices(pagesize) {
   const services_paging = this.getPagingObject(pagesize);
    return await this.zitiService
          .get(`services`, services_paging, [])
          .then( async (result) => {
            this.services = result.data? result.data: [];
            this.services_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
            if (!this.services || this.services.length === 0) {
              this.services = [];
              this.isLoading = false;
            } else if (this.services_totalCount < this.maxObjectsPerNode) {
              this.all_services_fetched = true;
              const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
              const s_promises = [];
              for (let page = 2; page <= pages; page++) {
                services_paging.page = page;
                const tmp_promise = await this.zitiService
                  .get(
                    `services`,
                     services_paging,
                    []
                  )
                  .then((pageResult) => {
                    pageResult.data.forEach((serv) => {
                      this.services.push(serv);
                    });
                  });
                s_promises.push(tmp_promise);
              }
              Promise.all(s_promises).then(() => {
               // this.services_totalCount = this.services.length;
              });
            }
        }).catch(error => {
           this.logger.error('Error in fetching services', error.message);
        });
  }

  async fetchServicePolicies(pagesize) {
       const servicesPolicies_paging = this.getPagingObject(pagesize);
      return await this.zitiService
          .get(`service-policies`, servicesPolicies_paging, [])
          .then( async (result) => {
            this.service_policies = result.data? result.data: [];
             this.service_policies_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
            if (!this.service_policies || this.service_policies.length === 0) {
              this.service_policies = [];
              this.isLoading = false;
            } else if (this.service_policies_totalCount < this.maxObjectsPerNode) {
              this.all_service_policies_fetched = true;
              const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
              const sp_promises = [];
              for (let page = 2; page <= pages; page++) {
                servicesPolicies_paging.page = page;
                const tmp_promise = await this.zitiService
                  .get(
                    `service-policies`,
                     servicesPolicies_paging,
                    []
                  )
                  .then((pageResult) => {
                    pageResult.data && pageResult.data.forEach((serv) => {
                      this.service_policies.push(serv);
                    });
                  });
                sp_promises.push(tmp_promise);
              }

              Promise.all(sp_promises).then(() => {
               // this.service_policies_totalCount = this.service_policies.length;
              });
            }
       }).catch(error => {
          this.logger.error('Error in fetching service-policies', error.message);
        });
  }

  async fetchEdgeRouters(pagesize) {
       const routers_paging = this.getPagingObject(pagesize);
       return await this.zitiService
          .get(`edge-routers`, routers_paging, [])
          .then( async (result) => {
            this.edgerouters = result.data? result.data: [];
            this.edgerouters_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
            if (!this.edgerouters || this.edgerouters.length === 0) {
              this.edgerouters = [];
              this.isLoading = false;
            } else if (this.edgerouters_totalCount < this.maxObjectsPerNode) {
              this.all_edgerouters_fetched = true;
              const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
              const r_promises = [];
              for (let page = 2; page <= pages; page++) {
                routers_paging.page = page;
                const tmp_promise = await this.zitiService
                  .get(
                    `edge-routers`,
                     routers_paging,
                    []
                  )
                  .then((pageResult) => {
                    pageResult.data.forEach((serv) => {
                      this.edgerouters.push(serv);
                    });
                  });
                r_promises.push(tmp_promise);
              }
              Promise.all(r_promises).then(() => {
                 // this.edgerouters_totalCount = this.edgerouters.length;
               });
            }
       }).catch(error => {
         this.logger.error('Error in fetching edge-routers', error.message);
       });
  }

 async findEdgeRouterPolicies(pagesize) {
      this.edge_router_policies = [];
      const erpolicies_paging = this.getPagingObject(pagesize);
      return await this.zitiService
          .get(`edge-router-policies`, erpolicies_paging, [])
          .then(async (result) => {
            this.edge_router_policies = result.data? result.data: [];
            this.edge_router_policies_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
            if (!this.edge_router_policies || this.edge_router_policies.length === 0) {
              this.isLoading = false;
            } else if (this.edge_router_policies_totalCount < this.maxObjectsPerNode) {
              this.all_edge_router_policies_fetched = true;
              const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
              const r_promises = [];
              for (let page = 2; page <= pages; page++) {
                erpolicies_paging.page = page;
                const tmp_promise = await this.zitiService
                  .get(
                    `edge-router-policies`,
                     erpolicies_paging,
                    []
                  )
                  .then((pageResult) => {
                    pageResult.data.forEach((serv) => {
                      this.edge_router_policies.push(serv);
                    });
                  });
                r_promises.push(tmp_promise);
              }

              Promise.all(r_promises).then(() => {
               // this.edge_router_policies_totalCount = this.edge_router_policies.length;
              });
            }
       }).catch(error => {
           this.logger.error('Error in fetching edge-router-policies', error);
       });
 }
 async fetchServiceEdgeRouterPolicies(pagesize) {
     this.service_router_policies = [];
     const serp_paging = this.getPagingObject(pagesize);
     return await this.zitiService
          .get(`service-edge-router-policies`, serp_paging, [])
          .then(async (result) => {
             this.service_router_policies = result.data? result.data: [];
             this.service_router_policies_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
            if (!this.service_router_policies || this.service_router_policies.length === 0) {
              this.isLoading = false;
            } else if (this.service_router_policies_totalCount < this.maxObjectsPerNode) {
              this.all_service_router_policies_fetched = false;
              const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
              const r_promises = [];
              for (let page = 2; page <= pages; page++) {
                serp_paging.page = page;
                const tmp_promise = await this.zitiService
                  .get(
                    `service-edge-router-policies`,
                     serp_paging,
                    []
                  )
                  .then((pageResult) => {
                    pageResult.data.forEach((serv) => {
                      this.service_router_policies.push(serv);
                    });
                  });
                r_promises.push(tmp_promise);
              }
              Promise.all(r_promises).then(() => {
              // this.service_router_policies_totalCount = this.service_router_policies.length;
              });
            }
       }).catch(error => {
           this.logger.error('Error in fetching service-edge-router-policies', error);
       });
 }
 async fetchConfigs(pagesize) {
    this.configs = [];
    const configs_paging = this.getPagingObject(pagesize);
    return await this.zitiService
          .get(`configs`, configs_paging, [])
          .then(async (result) => {
            this.configs = result.data? result.data: [];
           const configs_totalCount = result.meta && result.meta.pagination? result.meta.pagination.totalCount : 0;
            if (!this.configs || this.configs.length === 0) {
              this.configs = [];
            } else if (configs_totalCount < this.maxObjectsPerNode) {
              const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
              const r_promises = [];
              for (let page = 2; page <= pages; page++) {
                configs_paging.page = page;
                const tmp_promise = await this.zitiService
                  .get(
                    `configs`,
                     configs_paging,
                    []
                  )
                  .then((pageResult) => {
                    pageResult.data.forEach((serv) => {
                      this.configs.push(serv);
                    });
                  });
                r_promises.push(tmp_promise);
              }
              Promise.all(r_promises).then(() => {
               const configs_totalCount = this.configs.length;
              });
            }
         }).catch(error => {
           this.logger.error('Error in fetching configs', error);
          });

 }

 async readAllObjects() {
   const myPromise =  await new Promise(  (resolve, reject) => {
     let networkVisPromises =[];
     const pagesize = 500;
     const eps = this.fetchIdentities(pagesize);
     const ss = this.fetchServices(pagesize);
     const sps = this.fetchServicePolicies(pagesize);
     const ers = this.fetchEdgeRouters(pagesize);
     const erps = this.findEdgeRouterPolicies(pagesize);
     const serps = this.fetchServiceEdgeRouterPolicies(pagesize);
     const cfg = this.fetchConfigs(pagesize);
     Promise.all([eps, ss, sps, ers, erps, erps, serps, cfg]).then(() => {
      resolve('end');
     });
   });

 }

  processFirstNetworkGraph() {
        try {
            const treeObj = this.topologyHelper.getResourceTreeObj(
                'this.currentNetwork.name',
                'this.currentNetwork.status',
                this.services,
                this.identities,
                this.service_policies,
                this.edgerouters,
                this.edge_router_policies,
                this.service_router_policies,
                this.services_totalCount, this.identities_totalCount, this.edgerouters_totalCount,
                this.service_policies_totalCount, this.edge_router_policies_totalCount,
                this.service_router_policies_totalCount,
                this.uniqId,
                this.logger,
                this.all_service_policies_fetched, this.all_services_fetched, this.all_identities_fetched, this.all_edgerouters_fetched,
                this.all_edge_router_policies_fetched, this.all_service_router_policies_fetched
            );

            this.uniqId = treeObj.lastId;
            this.networkGraph = d3.hierarchy(treeObj, function (d) {
                return d.children;
            });
            // this.baseNetworkGraph = _.cloneDeep(this.networkGraph);
            this.servicePoliciesTreeNodes = [];
            this.servicesTreeNodes = [];
            this.identitiesTreeNodes = [];
            this.edgeroutersTreeNodes = [];
            this.erPoliciesTreeNodes = [];
            this.serviceEdgeRouterPolicyTreeNodes = [];

            this.servicePoliciesTreeNodes = this.fillAutoCompleteTreeNodes(
                this.service_policies,
                this.servicePoliciesTreeNodes,
                'ServicePolicy'
            );
            this.servicesTreeNodes = this.fillAutoCompleteTreeNodes(
                this.services,
                this.servicesTreeNodes,
                'Service'
            );
            this.identitiesTreeNodes = this.fillAutoCompleteTreeNodes(
                this.identities,
                this.identitiesTreeNodes,
                'Identity'
            );
            this.edgeroutersTreeNodes = this.fillAutoCompleteTreeNodes(
                this.edgerouters,
                this.edgeroutersTreeNodes,
                'Router'
            );

            this.erPoliciesTreeNodes = this.fillAutoCompleteTreeNodes(
                this.edge_router_policies,
                this.erPoliciesTreeNodes,
                'Router Policy'
            );

            this.serviceEdgeRouterPolicyTreeNodes = this.fillAutoCompleteTreeNodes(
                this.service_router_policies,
                this.serviceEdgeRouterPolicyTreeNodes,
                'Service Router Policy'
            );

            this.initTopoView();
            this.baseNetworkGraph = _.cloneDeep(this.networkGraph);
        } catch (err:any) {
            this.logger.error(err.message);
        }

        this.isLoading = false;
  }

   fillAutoCompleteTreeNodes(resourcesArray, arr, typeName) {
     resourcesArray && resourcesArray.forEach( (ob) => {
      arr.push(ob.name);
     });
    return arr;
   }

  debounce(func, timeout = 150){
    let timer;
    return (...args) => {
      this.autocompleteOptions = [];
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  nwSearchChange(event){
   if (this.filterText.length > 1 && event.key !=='Escape' && event.key !== 'ArrowRight' && event.key !=='ArrowLeft' && event.key !=='Enter') {
     this.filerResponseMessage = 'search filter..';
     this.debounce(this.filterSearchArray());
   }
  }

    autocompleteSearch(event) {
        const str = event ? event.option.value : '';
        this.searchResourceConditionCheck(str);
    }

    resourceTypeChanged() {
        this.filerResponseMessage = 'search filter..';
        this.searchCache = [];
        this.resetSearchNode();
        this.clearSearchLinkColors();
        if (_.isEmpty(this.resourceType)) {
            this.autocompleteOptions = [];
            this.clearSearchFilter();
            this.resourceTypeError = !_.isEmpty(this.filterText);
            return;
        }
        this.filterText = '';
        this.resourceTypeError = false;
        this.autocompleteOptions =[];
        if (this.resourceType === 'service-policies' && this.all_service_policies_fetched) {
            this.autocompleteOptions = this.servicePoliciesTreeNodes;
        } else if (this.resourceType === 'services' && this.all_services_fetched) {
            this.autocompleteOptions = this.servicesTreeNodes;
        } else if (this.resourceType === 'identities' && this.all_identities_fetched) {
            this.autocompleteOptions = this.identitiesTreeNodes;
        } else if (this.resourceType === 'edge-routers' && this.all_edgerouters_fetched) {
            this.autocompleteOptions = this.edgeroutersTreeNodes;
        } else if (this.resourceType === 'edge-router-policies' && this.all_edge_router_policies_fetched) {
            this.autocompleteOptions = this.erPoliciesTreeNodes;
        } else if (this.resourceType === 'service-edge-router-policies' && this.all_service_router_policies_fetched) {
            this.autocompleteOptions = this.serviceEdgeRouterPolicyTreeNodes;
        }

        if (!_.isEmpty(this.filterText)) {
            this.searchResourceConditionCheck(this.filterText);
        }
    }

    searchResourceConditionCheck(searchTxt) {
      if (this.resourceType === '' && searchTxt !== '') {
               this.resourceTypeError = true;
              return;
      } else {
           this.searchResourceInTree(searchTxt);
      }
    }

    searchResourceInTree(searchTxt) {
        this.noSearchResults = false;
        this.resourceTypeError = false;
        this.resetTree(null);
        if (searchTxt === '') {
            this.clearSearchLinkColors();
        } else {
            this.resetSearchNode();
            this.clearSearchLinkColors();

            let paths = [];
            let targetNodes = [];
            const nodeIds = [];
            if (this.resourceType === 'service-policies' && !this.all_service_policies_fetched) {
                const rawOb = this.searchCache.find((item) => item.name === searchTxt);
                const id:any = this.topologyHelper.createServicePolicyNode(rawOb);
               // id.clickProcess = "Not Yet";
                if(!this.isNodeExists(this.nodes[1], id)) {
                   this.nodes[1].data.children.push(id);
                 }

                this.networkGraph = d3.hierarchy(this.networkGraph.data, function (nd) {
                     return nd.children;
                });
                this.networkGraph.children.forEach((nd,i) => {
                   if (i !==0) {
                      this.graphCollapse(nd);
                   }
                } );
                this.service_policies = [];
                this.service_policies[0] = rawOb;
                this.updateTree(this.nodes[1]);
                targetNodes = this.processSearchInPreorder(this.nodes[1], searchTxt, targetNodes);
            } else if (this.resourceType === 'service-policies' && this.all_service_policies_fetched) {
                targetNodes = this.processSearchInPreorder(this.nodes[1], searchTxt, targetNodes);
            } else if (this.resourceType === 'edge-routers' && !this.all_edgerouters_fetched) {
                const rawOb = this.searchCache.find((item) => item.name === searchTxt);
                const id:any = this.topologyHelper.createEdgeRouterNode(rawOb);
               // id.clickProcess = "Not Yet";
                if(!this.isNodeExists(this.nodes[4], id)) {
                   this.nodes[4].data.children.push(id);
                 }
                this.networkGraph = d3.hierarchy(this.networkGraph.data, function (nd) {
                     return nd.children;
                });
                this.networkGraph.children.forEach((nd,i) => {
                   if (i !== 3) {
                     this.graphCollapse(nd);
                   }
                } );
                this.edgerouters = [];
                this.edgerouters[0] = rawOb;
                this.updateTree(this.nodes[4]);

                targetNodes = this.processSearchInPreorder(this.nodes[4], searchTxt, targetNodes);
            } else if (this.resourceType === 'edge-routers' && this.all_edgerouters_fetched) {
                targetNodes = this.processSearchInPreorder(this.nodes[4], searchTxt, targetNodes);
            } else if (this.resourceType === 'services' && !this.all_services_fetched) {
                const rawOb = this.searchCache.find((item) => item.name === searchTxt);
                const id:any = this.topologyHelper.createServiceNode(rawOb);
                id.clickProcess = "Not Yet";
                if(!this.isNodeExists(this.nodes[2], id)) {
                  this.nodes[2].data.children.push(id);
                 }
                this.networkGraph = d3.hierarchy(this.networkGraph.data, function (nd) {
                     return nd.children;
                });
                this.services = [];
                this.services[0] = rawOb;
                this.updateTree(this.nodes[2]);
                targetNodes = this.processSearchInPreorder(this.nodes[2], searchTxt, targetNodes);
                this.networkGraph.children.forEach((nd,i) => {
                  if ( i !== 1) {
                    this.graphCollapse(nd);
                  }
                } );

            } else if (this.resourceType === 'services' && this.all_services_fetched) {
                targetNodes = this.processSearchInPreorder(this.nodes[2], searchTxt, targetNodes);
            } else if (this.resourceType === 'identities' && !this.all_identities_fetched) {
                const rawOb = this.searchCache.find((item) => item.name === searchTxt);
                const id:any = this.topologyHelper.createIdentityNode(rawOb);
                id.clickProcess = "Not Yet";
                if(!this.isNodeExists(this.nodes[3], id)) {
                 this.nodes[3].data.children.push(id);
                }
                this.networkGraph = d3.hierarchy(this.networkGraph.data, function (nd) {
                     return nd.children;
                });

                this.identities[0] = [];
                this.identities[0] = rawOb;
                this.updateTree(this.nodes[3]);
                targetNodes = this.processSearchInPreorder(this.nodes[3], searchTxt, targetNodes);
                this.networkGraph.children.forEach((nd,i) => {
                  if (i !== 2) {
                    this.graphCollapse(nd);
                  }
                } );
            } else if (this.resourceType === 'identities' && this.all_identities_fetched) {
                targetNodes = this.processSearchInPreorder(this.nodes[3], searchTxt, targetNodes);
            } else if (this.resourceType === 'edge-router-policies' && !this.all_edge_router_policies_fetched) {
               const rawOb = this.searchCache.find((item) => item.name === searchTxt);
                const id:any = this.topologyHelper.createEdgeRouterPolicyNode(rawOb);
                id.clickProcess = "Not Yet";

                if(!this.isNodeExists(this.nodes[5], id)) {
                 this.nodes[5].data.children.push(id);
                 }
                this.networkGraph = d3.hierarchy(this.networkGraph.data, function (nd) {
                     return nd.children;
                });
                this.networkGraph.children.forEach((nd,i) => {
                  if (i !== 4) {
                    this.graphCollapse(nd);
                  }
                } );
                this.networkGraph.children.forEach(nd => this.graphCollapse(nd));
                this.edge_router_policies = [];
                this.edge_router_policies[0] = rawOb;
                this.updateTree(this.nodes[5]);
                targetNodes = this.processSearchInPreorder(this.nodes[5], searchTxt, targetNodes);
            } else if (this.resourceType === 'edge-router-policies' && this.all_edge_router_policies_fetched) {
                 targetNodes = this.processSearchInPreorder(this.nodes[5], searchTxt, targetNodes);
            } else if (this.resourceType === 'service-edge-router-policies' && !this.all_service_router_policies_fetched) {
                const rawOb = this.searchCache.find((item) => item.name === searchTxt);
                const id:any = this.topologyHelper.createServiceEdgeRouterPolicyNode(rawOb);
                id.clickProcess = "Not Yet";
                if(!this.isNodeExists(this.nodes[6], id)) {
                  this.nodes[6].data.children.push(id);
                }
                this.networkGraph = d3.hierarchy(this.networkGraph.data, function (nd) {
                     return nd.children;
                });
                this.networkGraph.children.forEach((nd,i) => {
                  if (i !== 5) {
                    this.graphCollapse(nd);
                  }
                } );
                this.service_router_policies = [];
                this.service_router_policies[0] = rawOb;
                this.updateTree(this.nodes[6]);
                targetNodes = this.processSearchInPreorder(this.nodes[6], searchTxt, targetNodes);
            } else if (this.resourceType === 'service-edge-router-policies' && this.all_service_router_policies_fetched) {
                 targetNodes = this.processSearchInPreorder(this.nodes[6], searchTxt, targetNodes);
            }
            // this.networkGraph.children.forEach(nd => this.graphCollapse(nd));
            paths = this.explorePathsForSearchedNodes(targetNodes, paths, nodeIds);
            if (targetNodes && targetNodes.length <= 0) {
                this.noSearchResults = true;
                this.clearSearchLinkColors();
            } else {
                this.openPaths(paths, true);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                d3.selectAll('circle').filter(function (d: any) {
                    const dataName = _.get(d, 'data.name', '');
                    // const dataId = _.get(d, 'data.id', '');
                    const nodeName = _.get(targetNodes[0], 'data.name', '');
                    if (dataName.toLowerCase() === searchTxt.toLowerCase() && nodeName === dataName) {
                        d3.select(this).style('fill', '#a60303'); //#004447, 470000
                    }
                });
            }

        }
    }

    isNodeExists(rootNode:any, id) {
     return rootNode.data.children.find( (nd) => nd.uuid ===id.uuid );
    }

    explorePathsForSearchedNodes(targetNodes, paths, nodeIds) {
      for (let i = 0; targetNodes && i < targetNodes.length; i++) {
         let nd = targetNodes[i];
           paths.push(nd);
         while (nd.parent) {
            const nodeId = _.get(nd.parent, 'data.id');
            if (nodeIds.indexOf(nodeId) < 0) {
               nodeIds.push(nodeId);
               paths.push(nd.parent);
            }
            nd = nd.parent;
         }
      }
        return paths;
    }

    processSearchInPreorder(nodeObj, searchTxt, targetNodes) {
        const name = _.get(nodeObj, 'data.name');
        // const nodeId = _.get(nodeObj, 'data.id');
        const isRootNode = _.get(nodeObj, 'data.rootNode');
        if (!name) {
            return;
        }
        if (isRootNode && isRootNode === 'Yes' && name.toLowerCase() === searchTxt.toLowerCase()) {
            targetNodes.push(nodeObj);
        }
        const childNodes = nodeObj.children ? nodeObj.children : nodeObj._children;
        for (let i = 0; childNodes && i < childNodes.length; i++) {
            this.processSearchInPreorder(childNodes[i], searchTxt, targetNodes);
        }
        return targetNodes;
    }
    clearSearchLinkColors() {
        this.svg.selectAll('path.link').each( function (this: any,  d:any) {
            d3.select(this).style('stroke', 'white');
        });
        this.svg.selectAll('circle').style('fill', function (d:any) {
            return d._children ? 'var(--tableText)' : '#fff';
        });
    }

    openPaths(paths, doReset = false) {
        const pathIds = [];
        for (let i = paths.length - 1; i >= 0; i--) {
            const l = paths[i];
            if (this.openNodes.indexOf(l.data.id) < 0) {
                this.openNodes.push(l.data.id);
            }
            this.expand(paths[i]);
            if (i > 0) {
                this.updateTree(l, doReset);
            }
            pathIds.push(l.data.id);
        }
        pathIds.push(paths[1].data.id);
        pathIds.push(paths[0].data.id);

        let childreng = null; // get 2nd level data nodes.
        if (this.resourceType === 'service-policies') {
            childreng = this.networkGraph.children[0];
        } else if (this.resourceType === 'services') {
            childreng = this.networkGraph.children[1];
        } else if (this.resourceType === 'identities') {
            childreng = this.networkGraph.children[2];
        } else if (this.resourceType === 'edge-routers') {
            childreng = this.networkGraph.children[3];
        } else if (this.resourceType === 'edge-router-policies') {
            childreng = this.networkGraph.children[4];
        } else if (this.resourceType === 'service-edge-router-policies') {
            childreng = this.networkGraph.children[5];
        }
        const ndd_childs = childreng.children ? childreng.children : childreng._children; // 2nd level chailds. groups/childrens
        for (let i = 0; i < ndd_childs.length; i++) {
            // 2st level
            //  if (this.resourceType === 'endpoints' || this.resourceType === 'services') {
            if (ndd_childs[i].data.type === 'Group') {
                // process groups
                const d1 = ndd_childs[i]; //get group
                if (d1 && paths[1].data.id === d1.data.id) {
                    const children0 = d1.children ? d1.children : d1._children; // 3rd level childs
                    const arr = children0.filter(function (replOb) {
                        return replOb.data.id === paths[0].data.id;
                    });
                    d1.children = arr;
                    d1._children = null;
                    const arrgrp = ndd_childs.filter(function (replObj) {
                        return replObj.data.id === d1.data.id;
                    });
                    childreng.children = arrgrp;
                    this.updateTree(this.networkGraph, doReset);
                    break;
                }
            } else {
                if (childreng.data.id === paths[1].data.id) {
                    const arr = ndd_childs.filter(function (replOb) {
                        return replOb.data.id === paths[0].data.id;
                    });
                    childreng.children = arr;
                    childreng._children = null;
                    this.updateTree(this.networkGraph, doReset);
                    break;
                }
            }
        }
        let datanodes = null; // get 2nd level data nodes.
        if (this.resourceType === 'service-policies') {
            datanodes = this.networkGraph.data.children[0];
        } else if (this.resourceType === 'services') {
            datanodes = this.networkGraph.data.children[1];
        } else if (this.resourceType === 'identities') {
            datanodes = this.networkGraph.data.children[2];
        } else if (this.resourceType === 'edge-routers') {
            datanodes = this.networkGraph.data.children[3];
        } else if (this.resourceType === 'edge-router-policies') {
            datanodes = this.networkGraph.data.children[4];
        } else if (this.resourceType === 'service-edge-router-policies') {
            datanodes = this.networkGraph.data.children[5];
        }
        if (datanodes.id === paths[1].data.id) {
            const arr = datanodes.children.filter(function (replOb) {
                return replOb.id === paths[0].data.id;
            });
            datanodes.children = arr;
            this.updateTree(this.networkGraph, doReset);
        } else {
            const groupNodes = datanodes.children;
            for (let k = 0; k < groupNodes.length; k++) {
                if (groupNodes[k].id === paths[1].data.id) {
                    // check searched group node
                    const arr = groupNodes[k].children.filter(function (replOb) {
                        return replOb.id === paths[0].data.id;
                    });
                    groupNodes[k].children = arr;
                    const arrgrp = groupNodes.filter(function (replObj) {
                        return replObj.id === paths[1].data.id;
                    });
                    datanodes.children = arrgrp;
                    this.updateTree(this.networkGraph, doReset);
                    break;
                }
            }
        }

        this.updateTree(this.networkGraph, doReset);
        this.searchRootNode = paths[1];

        this.svg.selectAll('.link').each(function (this:any, d:any) {
            if (pathIds.indexOf(d.data.id) >= 0) {
                d3.select(this).style('stroke', 'red');
            } else {
                d3.select(this).style('stroke', 'white');
            }
        });
    }

    resetSearchNode() {
        if (this.searchRootNode) {
            this.networkGraph = _.cloneDeep(this.baseNetworkGraph);
            this.updateTree(this.networkGraph, true);
        }
    }

    resetTree(clearSearch) {
        this.resetSearchNode();
        if (clearSearch) {
            this.clearSearchFilter();
            this.clearSearchType();
        }
        for (let i = this.openNodes.length - 1; i > 0; i--) {
            const d = this.openNodes[i];
            if (d && d.children) {
                d._children = d.children;
                d.children = null;
                this.updateTree(d);
            }
        }
        for (let i = this.nodes.length - 1; i > 0; i--) {
            const d = this.nodes[i];
            if (d && d.children) {
                d._children = d.children;
                d.children = null;
                this.updateTree(d);
            }
        }

        this.clearSearchLinkColors();
        this.openNodes = [];
        this.sizeToFit();
        this.resetZoom();
    }
    expand(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
    }

    collapse() {
        for (let i = this.openNodes.length - 1; i > 0; i--) {
            const d = this.nodes[i];
            if (d.children) {
                d._children = d.children;
                d.children = null;
                this.updateTree(d);
            }
        }
    }
   findModelName() {
    return this.resourceType;
   }
   async searchObjectsUsingApi() {
          this.isLoading = true;
          const model_name = this.findModelName();
          this.searchWord = _.clone(this.filterText);
          const str = `${this.resourceType}?filter=%20name%20contains%20%22${this.searchWord}%22&limit=5&offset=0&sort=name%20%20asc`;
          return await this.zitiService
          .call(str)
          .then((result:any) => {
            this.isLoading = false;
            this.autocompleteOptions = [];
            this.searchCache = result.data;
           result.data.forEach( (res) => {
            /* const obj: { [key: string]: string } = {
               id: res.id,
               name: res.name,
             }; */
             this.autocompleteOptions.push(res.name);
           } );
           this.noSearchResults = true;
           const countA =  result.data?.length > 0? result.data.length : 0;
           this.filerResponseMessage = "search word:'"+ this.searchWord +"',  result: top "+ countA +" of  "+result.meta.pagination.totalCount +" records";
          }).catch( (error) => {
           this.isLoading = false;
           this.logger.error(error.message);
           });

   }

   filterSearchArray() {
        if (_.isEmpty(this.resourceType)) {
            this.autocompleteOptions = [];
            this.resourceTypeError = !_.isEmpty(this.filterText);
            return;
        }
        this.autocompleteOptions = [];

        if (this.resourceType === 'service-policies' && this.all_service_policies_fetched) {
            this.autocompleteOptions = this.servicePoliciesTreeNodes.filter((option) =>
                option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'service-policies' && !this.all_service_policies_fetched) {
           this.searchObjectsUsingApi();
        } else if (this.resourceType === 'services'  && this.all_services_fetched) {
            this.autocompleteOptions = this.servicesTreeNodes.filter((option) =>
                option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'services'  && !this.all_services_fetched) {
           this.searchObjectsUsingApi();
        } else if (this.resourceType === 'identities' && this.all_identities_fetched) {
            this.autocompleteOptions = this.identitiesTreeNodes.filter((option) =>
                option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'identities' && !this.all_identities_fetched) {
           this.searchObjectsUsingApi();
        } else if (this.resourceType === 'edge-routers' && this.all_edgerouters_fetched) {
            this.autocompleteOptions = this.edgeroutersTreeNodes.filter((option) =>
                option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'edge-routers' && !this.all_edgerouters_fetched) {
           this.searchObjectsUsingApi();
        } else if (this.resourceType === 'edge-router-policies' && this.all_edge_router_policies_fetched) {
            this.autocompleteOptions = this.erPoliciesTreeNodes.filter((option) =>
                option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'edge-router-policies' && !this.all_edge_router_policies_fetched) {
           this.searchObjectsUsingApi();
        } else if (this.resourceType === 'service-edge-router-policies' && this.all_service_router_policies_fetched) {
            this.autocompleteOptions = this.serviceEdgeRouterPolicyTreeNodes.filter((option) =>
                option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'service-edge-router-policies' && !this.all_service_router_policies_fetched) {
           this.searchObjectsUsingApi();
        }
   }
   zoomIn() {

   }
   zoomOut() {

   }
   clearSearchFilter() {
      this.filterText = '';
      this.resetAutoCompleteOptions();
      this.resourceTypeError = false;
      // this.filterSearchArray();
      this.resetSearchNode();
      this.collapse();
      this.clearSearchLinkColors();
   }

   resetAutoCompleteOptions(){
      this.searchCache = [];
      this.filerResponseMessage = 'search filter..';
        if (this.resourceType === 'service-policies' && this.all_service_policies_fetched) {
            this.autocompleteOptions = this.servicePoliciesTreeNodes.filter((option) =>
                this.filterText==='' || option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'service-policies' && !this.all_service_policies_fetched) {
           this.autocompleteOptions = [];
        } else if (this.resourceType === 'services'  && this.all_services_fetched) {
            this.autocompleteOptions = this.servicesTreeNodes.filter((option) =>
                this.filterText==='' || option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'services'  && !this.all_services_fetched) {
           this.autocompleteOptions = [];
        } else if (this.resourceType === 'identities' && this.all_identities_fetched) {
            this.autocompleteOptions = this.identitiesTreeNodes.filter((option) =>
                this.filterText==='' || option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'identities' && !this.all_identities_fetched) {
           this.autocompleteOptions = [];
        } else if (this.resourceType === 'edge-routers' && this.all_edgerouters_fetched) {
            this.autocompleteOptions = this.edgeroutersTreeNodes.filter((option) =>
                this.filterText==='' || option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'edge-routers' && !this.all_edgerouters_fetched) {
           this.autocompleteOptions = [];
        } else if (this.resourceType === 'edge-router-policies' && this.all_edge_router_policies_fetched) {
            this.autocompleteOptions = this.erPoliciesTreeNodes.filter((option) =>
                this.filterText==='' || option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'edge-router-policies' && !this.all_edge_router_policies_fetched) {
           this.autocompleteOptions = [];
        } else if (this.resourceType === 'service-edge-router-policies' && this.all_service_router_policies_fetched) {
            this.autocompleteOptions = this.serviceEdgeRouterPolicyTreeNodes.filter((option) =>
                this.filterText==='' || option.toLowerCase().includes(this.filterText.toLowerCase())
            );
        } else if (this.resourceType === 'service-edge-router-policies' && !this.all_service_router_policies_fetched) {
           this.autocompleteOptions = [];
        }
   }

   clearSearchType() {
        this.resourceType = '';
        this.autocompleteOptions = [];
   }

   resetZoom() {
       // const currentZoom = this.getZoomScale();
       const transform: any = this.transform || _.cloneDeep(d3.zoomIdentity);
       transform.k = 1;
       this.svg.attr('transform', transform);
   }

  graphCollapse(d) {
       if (d.data.rootNode === 'Yes') {
           d.data.clickProcess = 'Not Yet';
           d._children = null;
       }
       if (d.children) {
           d._children = d.children;
           d._children && d._children?.find(nd => this.graphCollapse);
           d.children = null;
       }
  }

  initTopoView() {
        this.autocompleteOptions = [];
        const margin = { top: 20, right: 190, bottom: 30, left: 0 };
        const width = window.innerWidth -  margin.right;
        const height = window.innerHeight - margin.bottom;

        this.treetooltip = d3.select('#tooltip');

        this.resourceTypeError = false;
        this.filterText = '';
        this.resourceType = '';

        const handleZoom = (e) => {
            this.svg.attr('transform', e.transform);
        };
        this.zoom = d3.zoom().on('zoom', handleZoom);

        this.svg = d3
            .select('#NetworkVisualizerSVG')
            .attr('width', '100%')
            .attr('height', '100%')
            .call(this.zoom)
            .attr('viewBox', '-20 -450 ' + (width - margin.top*2 - margin.bottom) + ' ' + +(height*2 -margin.bottom))
            .append('g')
            .attr('transform', 'translate(' + -20 + ',' + 200 + ')');

        d3.select('body').on('click', function () {
            d3.select('#topocontextmenu').style('display', 'none');
        });

        d3.selectAll('g > *').remove();
        this.treemap = d3.tree().nodeSize([85, 5]);
        this.networkGraph.x = 100; // height / 4;
        this.networkGraph.y = 100;
        this.networkGraph.children.forEach(collapse);
       // this.networkGraph.children.forEach( (nd:any) =>  this.graphCollapse(nd) );
        this.updateTree(this.networkGraph);

        _.delay(() => {
            this.transform = d3.zoomIdentity;
            this.transform.x = -200;
            this.transform.y = 205;
            this.transform.k = 1;
            this.svg.transition().duration(750).attr('transform', this.transform);
        }, 600);

        function collapse(d) {
            if (d.data.rootNode === 'Yes') {
                d.data.clickProcess = 'Not Yet';
                d._children = null;
            }
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }
  }

    updateTree(source, doReset = false) {
        if (doReset) {
            d3.selectAll('g > *').remove();
        }
        const duration = 750;
        try {
            this.treeData = this.treemap(this.networkGraph);
            this.nodes = this.treeData.descendants();
            this.links = this.treeData.descendants().slice(1);
        } catch (e:any) {
          this.logger.error('Error in building tree object: '+ e.message);
        }
        const svgDefs = this.svg.append('defs');
        const linearGradient = svgDefs.append('linearGradient').attr('id', 'NodeGradient');
        linearGradient.append('stop').attr('class', 'stop1').attr('offset', '0%');
        linearGradient.append('stop').attr('class', 'stop2').attr('offset', '50%');
        linearGradient.append('stop').attr('class', 'stop3').attr('offset', '100%');

        const linearGradient2 = svgDefs.append('linearGradient').attr('id', 'NodeHoverGradient');
        linearGradient2.append('stop').attr('class', 'stop1a').attr('offset', '0%');
        linearGradient2.append('stop').attr('class', 'stop2a').attr('offset', '50%');
        linearGradient2.append('stop').attr('class', 'stop3a').attr('offset', '100%');

        this.nodes.forEach(function (d) {
            d.y = d.depth * 400;
        });
        this.node = this.svg.selectAll('g.node').data(this.nodes, function (d) {
            return d.data.id;
        });

        this.nodeEnter = this.node
            .enter()
            .append('g')
            .attr('class', (d) => {
                let className = '';

                if (_.startsWith(d.data.name, 'Edge Routers') || _.includes(d.data.type, 'Edge Router')) {
                    className = 'edge-router';
                }
                if (_.includes(d.data.name, 'Identities') || _.includes(d.data.name, 'Associated Identities') || _.includes(d.data.type, 'Identity') || _.includes(d.data.type, 'BrowZer Identity')) {
                    className = 'endpoint';
                }
                if (_.startsWith(d.data.name, 'Services') || _.startsWith(d.data.type, 'Service')) {
                    className = 'service';
                }
                if (_.startsWith(d.data.name, 'Bind-Services') || _.startsWith(d.data.name, 'Dial-Services')) {
                    className = 'service';
                }
                if (_.startsWith(d.data.name, 'Bind-Policies') || _.startsWith(d.data.name, 'Dial-Policies') || _.startsWith(d.data.name, 'Bind Policy') ) {
                     className = 'service-policy';
                }
                if (_.includes(d.data.name, 'Service Policies') || _.includes(d.data.type, 'Service Policy')) {
                    className = 'service-policy';
                }
                if (_.startsWith(d.data.name, 'Edge Router Policies') || _.startsWith(d.data.type, 'Router Policy')) {
                    className = 'edge-router-policy';
                }
                if (
                    _.startsWith(d.data.name, 'Service Edge Router Policies') ||
                    _.startsWith(d.data.type, 'Service Router Policy')
                ) {
                    className = 'service-edge-router-policy';
                }

                className = d._children ? 'node ' + className : 'node terminate ' + className;

                return className;
            })
            .attr('transform', function (d) {
                if (source && source.x) {
                    return 'translate(' + source.y + ',' + source.x + ')';
                } else {
                    return 'translate(' + d.y + ',' + d.x + ')';
                }
            });

        this.nodeEnter.on('contextmenu', (event, d) => {
            event.preventDefault();
            d3.select('#tooltip').style('display', 'none');
            const nw = this.currentNetwork;
            const rawEdgerouters = this.edgerouters;
            const rawEndpoints = this.identities;
            const rawAppwans = this.service_policies;
            const edgeRouterPolicies = this.edge_router_policies;

            if (d && d.data && d.data.contextMenu === 'Yes') {
                d3.select('#topocontextmenu')
                    .style('position', 'absolute')
                    .style('left', event.offsetX + 'px')
                    .style('top', event.offsetY + 'px')
                    .style('display', 'block');
            } else {
                return;
            }
            let obj = null;
            if (d && d.data && (d.data.type === 'Identity' || d.data.type === 'BrowZer Identity' ) ) {
               if(d.data.status === "Registered") {
                  enableLi('#liSingleUT');
                  enableLi('#liFLSingleRouter');
                  enableLi('#liSingleLT');
               } else {
                  disableLi('#liSingleUT');
                  disableLi('#liFLSingleRouter');
                  disableLi('#liSingleLT');
               }
                enableLi('#liMet');
                enableLi('#liVC');
                enableLi('#liEV');
                disableLi('#liIns');
                disableLi('#liAL');
                disableLi('#liEPs');
                disableLi('#liFLAll');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                disableLi('#liCL');
                disableLi('#liLT');

                this.contextmenuNodeType = 'identity';
            } else if (d && d.data && d.data.type === 'Edge Router') {
              if(d.data.status === "PROVISIONED") {
                enableLi('#liSingleUT');
                enableLi('#liFLSingleRouter');
                enableLi('#liSingleLT');
              } else {
                disableLi('#liSingleUT');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                }
                enableLi('#liMet');
                enableLi('#liVC');
                disableLi('#liIns');
                disableLi('#liEV');
                enableLi('#liAL');
                disableLi('#liEPs');
                disableLi('#liFLAll');

                disableLi('#liCL');
                disableLi('#liLT');
                this.contextmenuNodeType = 'edge-router';

            } else if (d && d.data && d.data.type === 'Service') {
                enableLi('#liMet');
                enableLi('#liVC');
                disableLi('#liIns');
                disableLi('#liEV');
                disableLi('#liAL');
                enableLi('#liEPs');
                disableLi('#liFLAll');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                disableLi('#liCL');
                disableLi('#liLT');
                enableLi('#liSingleUT');
                this.contextmenuNodeType = 'service';

            } else if (d && d.data && d.data.type === 'Service Policy') {
                disableLi('#liMet');
                enableLi('#liVC');
                disableLi('#liIns');
                disableLi('#liEV');
                disableLi('#liAL');
                disableLi('#liEPs');
                disableLi('#liFLAll');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                disableLi('#liCL');
                disableLi('#liLT');
                disableLi('#liSingleUT');

                this.contextmenuNodeType = 'service-policy';
            } else if (d && d.data && d.data.type === 'Router Policy') {
                disableLi('#liMet');
                disableLi('#liIns');
                enableLi('#liVC');
                disableLi('#liEV');
                disableLi('#liAL');
                disableLi('#liEPs');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                disableLi('#liFLAll');
                disableLi('#liCL');
                disableLi('#liLT');
                disableLi('#liSingleUT');
                this.contextmenuNodeType = 'router-policy';

            } else if (d && d.data && d.data.type === 'Network') {
                enableLi('#liMet');
                disableLi('#liIns');
                enableLi('#liVC');
                disableLi('#liEV');
                enableLi('#liAL');
                disableLi('#liEPs');
                enableLi('#liFLAll');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                enableLi('#liCL');
                enableLi('#liLT');
                disableLi('#liSingleUT');
                this.contextmenuNodeType = 'network';
                obj = nw;
            } else if (d && d.data && d.data.type === 'Service Router Policy') {
                disableLi('#liMet');
                disableLi('#liIns');
                enableLi('#liVC');
                disableLi('#liEV');
                disableLi('#liAL');
                disableLi('#liEPs');
                disableLi('#liFLAll');
                disableLi('#liFLSingleRouter');
                disableLi('#liSingleLT');
                disableLi('#liCL');
                disableLi('#liLT');
                disableLi('#liSingleUT');
                this.contextmenuNodeType = 'service-router-policy';

            }
            this.contextmenuNode = obj;
            d3.select('#tooltip').style('display', 'none');
        });

        this.circles = this.nodeEnter
            .append('circle')
            .attr('class', 'node')
            .attr('r', 10)
            .style('fill', function (d) {
                return d._children ? 'var(--tableText)' : '#fff';
            })
            .on('mousemove', (event, d) => {
                this.drawTreeTooltip(event, d);
            })
            .on('mouseout', this.removeTreeTooltip)
            .on('contextmenu', (event) => {
                event.preventDefault();
            })
            .on('click', async ( event, d: any) => {
               if (d.data.rootNode && d.data.rootNode === 'Yes' && d.data.clickProcess === 'Not Yet') {
                 d3.select(event.currentTarget).transition()
                       .duration(600)
                      .style("stroke-width", "10")
                      .transition()
                      .duration(600)
                       .style("stroke-width", "6")
                       .transition()
                       .duration(600)
                       .style("stroke-width", "3")
                      .transition()
                      .duration(600)
                      .style("stroke-width", "9")
                      .transition()
                      .duration(600)
                      .style("stroke-width", "12");
               }
                if (d && d.data && d.data.contextMenu === 'Yes') {
                    d3.select('#topocontextmenu').style('display', 'none');
                }
                d3.select('#tooltip').style('display', 'none');
                if (d.children && d.children.length > 0) {
                    const index = this.openNodes.indexOf(d.data.id, 0);
                    if (index > -1) {
                        this.openNodes.splice(index, 1);
                    }
                    d._children = d.children;
                    d.children = null;
                } else {
                    if (this.openNodes.indexOf(d.data.id) < 0) {
                        this.openNodes.push(d.data.id);
                    }
                    if (d.data.clickProcess === 'Not Yet') {
                        d._children = null;
                        if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            (d.data.type === 'Identity' ||
                            d.data.type === 'BrowZer Identity') &&
                            !d.children &&
                            !d._children
                        ) {
                            d.data.clickProcess = 'Completed';
                            const arr =  await this.treeNodeProcessor.processIdentitiesForNodeClick(
                                d,
                                this.networkGraph,
                                this.identities,
                                this.uniqId,
                                this.zitiService,
                                this.configs
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            d.data.type === 'Service' &&
                            !d.children &&
                            !d._children
                        ) {
                            d.data.clickProcess = 'Completed';
                            const arr = await this.treeNodeProcessor.processServicesForNodeClick(
                                d,
                                this.networkGraph,
                                this.services,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            d.data.type === 'Service Policy' &&
                            !d.children &&
                            !d._children
                        ) {
                            d.data.clickProcess = 'Completed';
                            const arr = await this.treeNodeProcessor.processServicePoliciesForNodeClick(
                                d,
                                this.networkGraph,
                                this.service_policies,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            d.data.type === 'Edge Router' &&
                            !d.children &&
                            !d._children
                        ) {
                           d.data.clickProcess = 'Completed';
                            const arr = await this.treeNodeProcessor.processEdgeroutersForNodeClick(
                                d,
                                this.networkGraph,
                                this.edgerouters,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            d.data.type === 'Router Policy' &&
                            !d.children &&
                            !d._children
                        ) {
                           d.data.clickProcess = 'Completed';
                            const arr = await this.treeNodeProcessor.processEdgeRouterPoliciesForNodeClick(
                                d,
                                this.networkGraph,
                                this.edge_router_policies,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            d.data.type === 'Service Router Policy' &&
                            !d.children &&
                            !d._children
                        ) {
                           d.data.clickProcess = 'Completed';
                            const arr = await this.treeNodeProcessor.processServiceEdgeRouterPoliciesForNodeClick(
                                d,
                                this.networkGraph,
                                this.service_router_policies,
                                this.uniqId,
                                this.zitiService
                            );

                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else {
                            d.children = d._children;
                        }
                    } else {
                        d.children = d._children;
                    }
                    if (d._children) {
                        d._children = null;
                    }
                }

                if (d.children || d._children) {
                    this.updateTree(d);
                }

                const rootNode = _.get(d, 'data.children[0].rootNode', '');
                const subrootNode = _.get(d, 'data.rootNode', '');
                if (rootNode === 'Yes' || subrootNode === 'Yes') {
                    rootNodeisYesColorChange();
                }
            });

        this.nodeEnter
            .append('foreignObject')
            .attr('height', '50')
            .attr('width', function (d) {
                return d && d.data && d.data.name.length >= 20? '550': '330';
            })
            .attr('x', '20')
            .attr('y',  function (d) {
                 return d && d.data && d.data.rootNode==='Yes'? '-5': '-40';
             })
            .append('xhtml:body')
            .style('background', 'transparent')
            .html(function (d) {
                return `<div class="node-text-container"><span>${d.data.name}</span></div>`;
            });

        this.nodeUpdate = this.nodeEnter.merge(this.node);

        this.nodeUpdate
            .transition()
            .duration(duration)
            .attr('transform', function (d) {
                return 'translate(' + d.y + ',' + d.x + ')';
            });

        this.nodeUpdate.select('circle.node').attr('r', 18).attr('cursor', 'pointer');

        this.nodeExit = this.node
            .exit()
            .transition()
            .duration(duration)
            .attr('transform', function (d) {
                if (source && source.x) {
                    return 'translate(' + source.y + ',' + source.x + ')';
                } else {
                    return 'translate(' + d.y + ',' + d.x + ')';
                }
            })
            .remove();

        this.nodeExit.select('circle').attr('r', 0);
        this.nodeExit.select('text').style('fill-opacity', 10);
        this.link = this.svg.selectAll('path.link').data(this.links, function (d) {
            return d.data.id;
        });
        this.linkUpdate = this.link
            .enter()
            .insert('path', 'g')
            .attr('class', 'link')
            .attr('d', function (d) {
                let o;
                if (source && source.x) {
                    o = { x: source.x, y: source.y };
                } else {
                    o = { x: d.x, y: d.y };
                }
                return diagonal(o, o, '1');
            })
            .merge(this.link);

        this.linkUpdate
            .transition()
            .duration(duration)
            .attr('d', function (d) {
                return diagonal(d, d.parent, '2');
            });

        this.linkExit = this.link
            .exit()
            .transition()
            .duration(duration)
            .attr('d', function (d) {
                let o;
                if (source && source.x) {
                    o = { x: source.x, y: source.y };
                } else {
                    o = { x: d.x, y: d.y };
                }
                return diagonal(o, o, '3');
            })
            .remove();

        this.nodes.forEach(function (d: any) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        function disableLi(liId) {
            d3.select(liId).style('display', 'none');
        }

        function enableLi(liId) {
            d3.select(liId).style('display', 'block');
        }

        function diagonal(s, d, lg) {
            const path = `M ${s.y} ${s.x}
             C ${(s.y + d.y) / 2} ${s.x},
               ${(s.y + d.y) / 2} ${d.x},
               ${d.y} ${d.x}`;

            return path;
        }

        function rootNodeisYesColorChange() {
            d3.selectAll('circle').each(function (d: any) {
                const rootNode = _.get(d, 'data.rootNode', '');
                const clickProcess = _.get(d, 'data.clickProcess', '');
                if (rootNode === 'Yes' && clickProcess === 'Not Yet') {
                    d3.select(this).style('fill', 'brown');
                } else if (rootNode === 'Yes' && clickProcess !== 'Not Yet') {
                    const color = d._children ? 'var(--tableText)' : '#fff';
                    d3.select(this).style('fill', color);
                }
            });
        }

        function collapseFew(_nd, openNodes) {
            if (_nd.data.id === '#all') {
                return;
            }
            if (_nd.data.rootNode === 'Yes' && _nd.data.clickProcess === 'Not Yet') {
                _nd._children = [];
            }
            if (_nd.children && openNodes.indexOf(_nd.data.id) < 0) {
                _nd._children = _nd.children;
                if (_nd._children)
                    _nd._children.find((_nd) => {
                        collapseFew(_nd, openNodes);
                    });
                _nd.children = null;
            }

            if (_nd.children && openNodes.indexOf(_nd.data.id) >= 0) {
                if (_nd.children)
                    _nd.children.find((_nd) => {
                        collapseFew(_nd, openNodes);
                    });
            }
        }

        if (source.children === null) {
            _.delay(this.sizeToFit.bind(this), 650);
        }
    } // end of updateTree

    sizeToFit() {
        const boundingBox = this.svg._groups[0][0].getBoundingClientRect();
        const bottomDelta = boundingBox.height - 100 - -boundingBox.top;
        const topDelta = boundingBox.height + 500 - boundingBox.bottom;
        const topOutOfView = topDelta < 0;
        const bottomOutOfView = bottomDelta < 0;

        if (bottomOutOfView || topOutOfView) {
            const trans = this.transform;
            trans.y = topOutOfView ? 400 : 0;
            this.svg.transition().duration(750).attr('transform', trans);
        }
    }

    setColor(d) {
        if (d.status === 'Error' && d.group === 3) {
            return 'red';
        } else if (d.status !== 'Error' && d.group === 3) {
            return 'var(--tableText)';
        } else {
            return 'var(--tableText)';
        }
    }

    ticked() {
        this.links
            .attr('x1', function (d) {
                return d.source.x;
            })
            .attr('y1', function (d) {
                return d.source.y;
            })
            .attr('x2', function (d) {
                return d.target.x;
            })
            .attr('y2', function (d) {
                return d.target.y;
            });

        this.nodes.attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    }

    isAnObject(o) {
        return o instanceof Object && o.constructor === Object;
    }

    readObjectValues(linkObject) {
        let info = '<span style="font-size:12px;font-family: sans-serif">';
        const keys = Object.keys(linkObject.data);
        keys.forEach( (k) => {
            if (this.isAnObject(linkObject.data[k])) {
                const kVal: any = linkObject.data[k];
                info = info + '   ' + k + '  :  ' + kVal.id + '<br>';
            } else {
                info = info + '   ' + k + '  :  ' + linkObject.data[k] + '<br>';
            }
        });
        return info + '</span>';
    }

    nodeColor(d) {
        if (d.status === 'Error') {
            return '#FF0000';
        } else {
            return 'blue';
        }
    }

    dragstarted(event, d) {
        if (!event.active) {
            this.simulation.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(d) {
        d.fx = d.x;
        d.fy = d.y;
    }

    dragended(event, d) {
        if (!event.active) {
            this.simulation.alphaTarget(0);
        }

        d.fx = null;
        d.fy = null;
    }
    removeTreeTooltip() {
        this.treetooltip = d3.select('#tooltip');
        if (this.treetooltip) {
            this.treetooltip.style('display', 'none');
        }
    }
    drawTreeTooltip(event, s) {
        this.treetooltip = d3.select('#tooltip');
        this.treetooltip.style('display', 'block');
        const x = event.pageX + 'px';
        const y = event.pageY + 15 + 'px';
        this.treetooltip.style('left', x);
        this.treetooltip.style('top', y);
        document.getElementById('tooltip').innerHTML = this.readTreeKeyValues(event, s);
    }
    readTreeKeyValues(event, d) {
      const startIndex = d.data.name.indexOf('(');
      const finIndex = d.data.name.indexOf(')');
      const countStr:number = startIndex >0? d.data.name.substring(startIndex + 1, finIndex): 0;
        let info = `<div class='tool-tip-container'>`;
        const keys = Object.keys(d.data); // mp.keys();
        keys.forEach(function (k) {
            if (
                k === 'firstChild' ||
                k === 'protocol' ||
                k === 'contextMenu' ||
                k === 'uuid' ||
                k === 'lastId' ||
                k === 'clickProcess' ||
                k === 'rootNode' ||
                k === 'id' ||
                k === 'children' ||
                k === 'parent' ||
                k === 'depth' ||
                k === 'x' ||
                k === 'y' ||
                k === 'rootNode' ||
                k === 'x0' ||
                k === 'y0'
            ) {
                // continue;
            } else if (d[k] instanceof Array) {
                info =
                    info +
                    '<div class="prop-row"><div class="prop-name">' +
                    k +
                    ':</div><div class="prop-val">' +
                    d[k].join('<br> &nbsp;&nbsp; &nbsp;&nbsp;') +
                    '</div></div>';
            } else {
                const propVal = d.data[k] || '';
                info = info + '<div class="prop-row"><div class="prop-name">' + k + ':</div><div class="prop-val">' + propVal + '</div></div>';
            }
        });
        if (d.data.firstChild && d.data.firstChild === 'Yes' && countStr > this.maxObjectsPerNode-1) {
             info = info + '<span class="tooltip-help-text">Note: expand node disabled. Use search filter.</span>';
        } else if (d.data.firstChild && d.data.firstChild === 'Yes' && countStr < this.maxObjectsPerNode){
             info = info + '<span class="tooltip-help-text">Note: click to expand child nodes </span>';
        }
        return info + '</div>';
    }

}

