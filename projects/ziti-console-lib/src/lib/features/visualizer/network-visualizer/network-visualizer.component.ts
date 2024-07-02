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
import {catchError} from "rxjs/operators";
import {firstValueFrom, map, Observable} from "rxjs";
import { VisualizerServiceClass  } from '../visualizer-service.class';
import * as d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { take, tap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient} from '@angular/common/http';
import { TreeNodeProcessor } from './network-visualizer.treenodeprocessor';
import { NetworkVisualizerHelper } from './network-visualizer.helper';
// import { ServicePolicy } from '../models/service-policy';
// import { EdgeRouterPolicyV2 }  from '../models/edge-router-policy';
// import { EdgeRouterV2 }  from '../models/edge-router';
// import { Identity }  from '../models/identity';
// import { PlatformService}  from '../models/platform-service';
// import { ServiceEdgeRouterPolicy}  from '../models/service-edge-router-policy';

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
  treetooltip;
  fullScreen = false;
  isLoading = false;
  services;
  identities;
  edgerouters;
  service_policies;
  router_policies;
  service_router_policies;
  configs;
  networkGraph;
  currentNetwork;

  appwanstreeNodes = [];
  servicesTreeNodes = [];
  endpointsTreeNodes = [];
  edgeroutersTreeNodes = [];
  erPoliciesTreeNodes = [];
  serviceEdgeRouterPolicyTreeNodes = [];

  autocompleteOptions;
  resourceTypeError = false;
  filterText = '';
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

  constructor(
     @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
     @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
     private httpClient: HttpClient,
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
      const paging = {
        searchOn: 'name',
        noSearch: false,
        filter: '',
        total: pagesize,
        page: 1,
        sort: 'name',
        order: 'asc',
      };
      return  paging;
    }

  async getNetworkObjects() {
     await this.readAllObjects();
     this.processFirstNetworkGraph();
  }

   async fetchIdentities (pagesize) {
      const identities_paging = this.getPagingObject(pagesize);
      return await this.zitiService
      .get(`identities`, identities_paging, [])
      .then(async (result) => {
         this.identities = result.data;
         if (!this.identities || this.identities.length === 0) {
            this.identities = [];
            this.isLoading = false;
         } else {
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
           Promise.all(promises).then(() => {});
        }
    });  // identity promises
  }

  async fetchServices(pagesize) {
   const services_paging = this.getPagingObject(pagesize);
    return await this.zitiService
          .get(`services`, services_paging, [])
          .then( async (result) => {
            this.services = result.data;

            if (!this.services || this.services.length === 0) {
              this.services = [];
              this.isLoading = false;
            } else {
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
              Promise.all(s_promises).then(() => { });
            }
        });
  }

  async fetchServicePolicies(pagesize) {
       const servicesPolicies_paging = this.getPagingObject(pagesize);
      return await this.zitiService
          .get(`service-policies`, servicesPolicies_paging, [])
          .then( async (result) => {
            this.service_policies = result.data;

            if (!this.service_policies || this.service_policies.length === 0) {
              this.service_policies = [];
              this.isLoading = false;
            } else {
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
                    pageResult.data.forEach((serv) => {
                      this.service_policies.push(serv);
                    });
                  });
                sp_promises.push(tmp_promise);
              }

              Promise.all(sp_promises).then(() => { });
            }
       });
  }

  async fetchEdgeRouters(pagesize) {
       const routers_paging = this.getPagingObject(pagesize);
       return await this.zitiService
          .get(`edge-routers`, routers_paging, [])
          .then( async (result) => {
            this.edgerouters = result.data;
            if (!this.edgerouters || this.edgerouters.length === 0) {
              this.edgerouters = [];
              this.isLoading = false;
            } else {
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
              Promise.all(r_promises).then(() => { });
            }
       });
  }

 async findEdgeRouterPolicies(pagesize) {
      const erpolicies_paging = this.getPagingObject(pagesize);
      return await this.zitiService
          .get(`edge-router-policies`, erpolicies_paging, [])
          .then(async (result) => {
            this.router_policies = result.data;
            if (!this.router_policies || this.router_policies.length === 0) {
              this.router_policies = [];
              this.isLoading = false;
            } else {
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
                      this.router_policies.push(serv);
                    });
                  });
                r_promises.push(tmp_promise);
              }

              Promise.all(r_promises).then(() => { });
            }
       });
 }
 async fetchServiceEdgeRouterPolicies(pagesize) {
     const serp_paging = this.getPagingObject(pagesize);
     return await this.zitiService
          .get(`service-edge-router-policies`, serp_paging, [])
          .then(async (result) => {
            this.service_router_policies = result.data;

            if (!this.service_router_policies || this.service_router_policies.length === 0) {
              this.service_router_policies = [];
              this.isLoading = false;
            } else {
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
              Promise.all(r_promises).then(() => { });
            }
      });
 }
 async fetchConfigs(pagesize) {
    const configs_paging = this.getPagingObject(pagesize);
    return await this.zitiService
          .get(`configs`, configs_paging, [])
          .then(async (result) => {
            this.configs = result.data;

            if (!this.configs || this.configs.length === 0) {
              this.configs = [];
            } else {
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
              Promise.all(r_promises).then(() => { });
            }
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
                this.router_policies,
                this.service_router_policies,
                this.uniqId
            );

            this.uniqId = treeObj.lastId;
            this.networkGraph = d3.hierarchy(treeObj, function (d) {
                return d.children;
            });

            this.appwanstreeNodes = [];
            this.servicesTreeNodes = [];
            this.endpointsTreeNodes = [];
            this.edgeroutersTreeNodes = [];
            this.erPoliciesTreeNodes = [];
            this.serviceEdgeRouterPolicyTreeNodes = [];

            this.appwanstreeNodes = this.fillAutoCompleteTreeNodes(
                this.networkGraph.children[0],
                this.appwanstreeNodes,
                'Service Policy'
            );
            this.servicesTreeNodes = this.fillAutoCompleteTreeNodes(
                this.networkGraph.children[1],
                this.servicesTreeNodes,
                'Service'
            );
            this.endpointsTreeNodes = this.fillAutoCompleteTreeNodes(
                this.networkGraph.children[2],
                this.endpointsTreeNodes,
                'Identity'
            );
            this.edgeroutersTreeNodes = this.fillAutoCompleteTreeNodes(
                this.networkGraph.children[3],
                this.edgeroutersTreeNodes,
                'Edge Router'
            );
            this.erPoliciesTreeNodes = this.fillAutoCompleteTreeNodes(
                this.networkGraph.children[4],
                this.erPoliciesTreeNodes,
                'Router Policy'
            );

            this.serviceEdgeRouterPolicyTreeNodes = this.fillAutoCompleteTreeNodes(
                this.networkGraph.children[5],
                this.serviceEdgeRouterPolicyTreeNodes,
                'Service Router Policy'
            );

            this.initTopoView();
        } catch (err) {
            console.log('error',err);
        }

        this.isLoading = false;
  }
    fillAutoCompleteTreeNodes(nodeObj, arr, typeName) {
        const name = nodeObj.data.name;
        // const id = nodeObj.data.id;
        if (!name) {
            return;
        }
        if (typeof nodeObj.data.type === 'undefined') {
            //      //
        } else {
            if (arr.indexOf(name) < 0 && nodeObj.data.type === typeName) {
                arr.push(name);
            }
        }

        const childNodes = nodeObj.children ? nodeObj.children : nodeObj._children;
        for (let i = 0; childNodes && i < childNodes.length; i++) {
            this.fillAutoCompleteTreeNodes(childNodes[i], arr, typeName);
        }

        return arr;
    }

  initTopoView() {
        this.autocompleteOptions = [];
        // const duration = 750;
        const margin = { top: 20, right: 90, bottom: 30, left: 0 };
        const width = 1600 - margin.left - margin.right;
        const height = 1600 - margin.top - margin.bottom;
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
            .attr('viewBox', '0 ' + (-1 * (height - margin.top - margin.bottom)) / 3 + ' ' + width + ' ' + height)
            .append('g')
            .attr('transform', 'translate(' + -300 + ',' + 225 + ')');

        d3.select('body').on('click', function () {
            d3.select('#topocontextmenu').style('display', 'none');
        });

        d3.selectAll('g > *').remove();

        // this.treemap = d3.tree().nodeSize([140, 40]);
        this.treemap = d3.tree().nodeSize([100, 20]);

        this.networkGraph.x = height / 4;
        this.networkGraph.y = 100;
        this.networkGraph.children.forEach(collapse);
        this.updateTree(this.networkGraph);

        _.delay(() => {
            this.transform = d3.zoomIdentity;
            this.transform.x = -300;
            this.transform.y = 225;
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

    updateTree(source) {
        d3.selectAll('g > *').remove();
        const duration = 750;
        try {
            this.treeData = this.treemap(this.networkGraph);
            this.nodes = this.treeData.descendants();
            this.links = this.treeData.descendants().slice(1);
        } catch (e) {
          console.log('Error:', e);
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
                if (_.includes(d.data.name, 'Identities') || _.includes(d.data.type, 'Identity')) {
                    className = 'endpoint';
                }
                if (_.startsWith(d.data.name, 'Services') || _.startsWith(d.data.type, 'Service')) {
                    className = 'service';
                }
                if (_.startsWith(d.data.name, 'Bind-Services') || _.startsWith(d.data.name, 'Dial-Services')) {
                    className = 'service';
                }
                if (_.startsWith(d.data.name, 'BindPolicies') || _.startsWith(d.data.name, 'DialPolicies') || _.startsWith(d.data.name, 'BindPolicy') ) {
                     className = 'service-policy';
                }
                if (_.includes(d.data.name, 'Service Policies') || _.includes(d.data.type, 'ServicePolicy')) {
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
            const edgeRouterPolicies = this.router_policies;

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
            if (d && d.data && d.data.type === 'Identity') {
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
                /*
                obj = new Identity();
                for (let i = 0; i < rawEndpoints.length; i++) {
                    if (rawEndpoints[i].id === d.data.uuid) {
                        obj = rawEndpoints[i];
                    }
                }
                */
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
                /*
                obj = new EdgeRouterV2();
                for (let i = 0; i < rawEdgerouters.length; i++) {
                    if (rawEdgerouters[i].id === d.data.uuid) {
                        obj = rawEdgerouters[i];
                    }
                }
                */
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
                /*
                obj = new PlatformService();
                for (let i = 0; i < this.services.length; i++) {
                    if (this.services[i].id === d.data.uuid) {
                        obj = this.services[i];
                    }
                }
                */
            } else if (d && d.data && d.data.type === 'AppWAN') {
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
                /*
                obj = new ServicePolicy();
                for (let i = 0; i < rawAppwans.length; i++) {
                    if (rawAppwans[i].id === d.data.uuid) {
                        obj = rawAppwans[i];
                    }
                }
                */
                this.contextmenuNodeType = 'appwan';
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
             /*
              obj = new EdgeRouterPolicyV2();
                for (let i = 0; i < edgeRouterPolicies.length; i++) {
                    if (edgeRouterPolicies[i].id === d.data.uuid) {
                        obj = edgeRouterPolicies[i];
                    }
                }
              */
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
               /*
                obj = new ServiceEdgeRouterPolicy();
                for (let i = 0; i < this.service_router_policies.length; i++) {
                    if (this.service_router_policies[i].id === d.data.uuid) {
                        obj = this.service_router_policies[i];
                    }
                }
                */
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
            .on('mousemove', (event, source) => {
                this.drawTreeTooltip(event, source);
            })
            .on('mouseout', this.removeTreeTooltip)
            .on('contextmenu', (event) => {
                event.preventDefault();
            })
            .on('click', async (event, d) => {
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
                            d.data.type === 'Identity' &&
                            !d.children &&
                            !d._children
                        ) {
                            const arr =  await this.treeNodeProcessor.processIdentitiesForNodeClick(
                                d,
                                this.networkGraph,
                                this.identities,
                                this.services,
                                this.edgerouters,
                                this.router_policies,
                                this.service_policies,
                                this.uniqId,
                                this.zitiService,
                                this.configs
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];

                            d.data.clickProcess = 'Completed';
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
                            const arr = await this.treeNodeProcessor.processServicesForNodeClick(
                                d,
                                this.networkGraph,
                                this.services,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            d.data.clickProcess = 'Completed';
                            this.networkGraph.children.find((nd) => {
                                collapseFew(nd, this.openNodes);
                            });
                            this.updateTree(d);
                        } else if (
                            d.data &&
                            d.data.rootNode &&
                            d.data.rootNode === 'Yes' &&
                            d.data.type === 'ServicePolicy' &&
                            !d.children &&
                            !d._children
                        ) {
                            const arr = await this.treeNodeProcessor.processServicePoliciesForNodeClick(
                                d,
                                this.networkGraph,
                                this.service_policies,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            d.data.clickProcess = 'Completed';
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
                            const arr = await this.treeNodeProcessor.processEdgeroutersForNodeClick(
                                d,
                                this.networkGraph,
                                this.edgerouters,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            d.data.clickProcess = 'Completed';
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
                            const arr = await this.treeNodeProcessor.processEdgeRouterPoliciesForNodeClick(
                                d,
                                this.networkGraph,
                                this.router_policies,
                                this.uniqId,
                                this.zitiService
                            );
                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            d.data.clickProcess = 'Completed';
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
                            const arr = await this.treeNodeProcessor.processServiceEdgeRouterPoliciesForNodeClick(
                                d,
                                this.networkGraph,
                                this.service_router_policies,
                                this.uniqId,
                                this.zitiService
                            );

                            this.uniqId = arr[1];
                            this.networkGraph = arr[0];
                            d.data.clickProcess = 'Completed';
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
            .attr('width', '330')
            .attr('x', '10')
            .attr('y', '-25')
            .append('xhtml:body')
            .style('background', 'transparent')
            .html(function (d) {
                return `<div class="text-container"<span>${d.data.name}</span>`;
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
                if (o && o.x) {
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

        function collapseDepth(d, id) {
            // unused
            if (d.children) {
                if (d.data.id !== id) {
                    d._children = d.children;
                    d._children.forEach(collapseDepth);
                    d.children = null;
                } else {
                    d.children.forEach(collapseDepth);
                }
            }
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
    removeGraphTooltip() {
        if (this.graphtooltip) {
            this.graphtooltip.style('display', 'none');
        }
    }

    drawGraphTooltip(event, d) {
        document.getElementById('tooltip').innerHTML = this.readGraphKeyValues(d);
        this.graphtooltip.style('display', 'block');
        const x = event.pageX - 400 + 'px';
        const y = event.pageY + 10 + 'px';
        this.graphtooltip.style('left', x);
        this.graphtooltip.style('top', y);
    }

    readGraphKeyValues(d) {
        let info =
            '<span style="font-size:14px;font-family:Open Sans; font-weight: 600; font-color: var(--tableText);">';
        const keys = Object.keys(d.data);
        keys.forEach( (k) => {
            if (
                k === 'value' ||
                k === 'group' ||
                k === 'index' ||
                k === 'parent' ||
                k === 'depth' ||
                k === 'x' ||
                k === 'y' ||
                k === 'id' ||
                k === 'x0' ||
                k === 'y0' ||
                k === 'vy' ||
                k === 'vx'
            ) {
                // continue;
            } else if (k === 'children') {
                const kVal: any = d.data[k];
                info = info + '  ' + k + '  :  ' + kVal.length + '<br>';
            } else {
                if (this.isAnObject(d.data[k])) {
                    const kVal: any = d.data[k];
                    info = info + '   ' + k + '  :  ' + kVal.name + '<br>';
                } else {
                    const vo = d.data[k];
                    info = info + '   ' + k + '  :  ' + (vo !== null || vo !== '' ? d.data[k] : 'N/A') + '<br>';
                }
            }
        });
        return info + '</span>';
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

    nodeshape(d) {
        if (d.group === '3') {
            return 'rect';
        } else {
            return 'circle';
        }
    }

    linkWidth(d) {
        if (d.group === 1) {
            return 10;
        } else {
            return 2;
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
        let info = '<span>';
        const keys = Object.keys(d.data); // mp.keys();
        keys.forEach(function (k) {
            if (
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
            } else {
                info = info + '   ' + k + '  :  ' + d.data[k] + '<br>';
            }
        });
        return info + '</span>';
    }

  hide() {}
  toggleModalSize() {};
}

