/* eslint prefer-const: 1 */
import {
  Component,
  ViewChild,
  Inject,
  OnInit,
  ViewEncapsulation,
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
import { IdentityServicePathHelper } from './identity-service-path.helper';
import { MapDataService } from '../../../pages/geolocate/services/map-data.service';
import * as d3 from 'd3';
import _ from 'lodash';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { take, tap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-identity-visualizer',
    templateUrl: './identity-service-path.component.html',
    styleUrls: ['./identity-service-path.component.scss'],
    standalone: false
})
export class IdentityServicePathComponent implements OnInit {
  public d3;
  isDarkMode = false;
  refreshRotate = false;
  closeRotate = true;
  private lastRenderContext: {
    bindIdnetities: any[];
    serviceOb: any;
    serviceConfigs: any[];
    hostEdgeRouters: any[];
  } | null = null;
  private zoomBehavior: any = null;
  private hasInitialFit = false;
  private readonly viewBoxWidth = 1050;
  private readonly viewBoxHeight = 500;
  filterText = 'fetching services..';
  noSearchResults = false;
  autocompleteOptions = [];
  fullScreen = false;
  legendCollapsed = false;
  serviceOptions: any;
  endpointData;
  networkGraph;
  graphJsonObj;
  services;
  edgerouters;
  endpoints = [];
  selectedService = '';
  serviceSelectError;
  doEndpointHasAppwans = false;
  doEndpointHasPublicRouters = false;
  doEndpointHasServicesInPrivateNw = false;
  isLoading = false;
  countGrp2Nds = 0;
  countGrp3Nds = 0;

  // Fabric topology data
  allRouters: any[] = [];
  routerTypesMap: Map<string, string> = new Map();
  allLinks: any[] = [];
  allCircuits: any[] = [];
  allTerminators: any[] = [];
  fabricApiAvailable = true;

  constructor(
    private identityServicePathHelper: IdentityServicePathHelper,
    private mapDataService: MapDataService,
    @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
    @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
    private router: Router,
    private dialogRef: MatDialogRef<IdentityServicePathComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.endpointData = data.identity;
  }

  ngOnInit(): void {
    this.getEndpointNetworkAsCode();
    this.autocompleteOptions = [];
    this.isLoading = true;
    const bgCol = d3.color(d3.select('body').style("background-color")).formatHex();
    this.isDarkMode = bgCol =='#18191d' ? true: false;
  }

  getEndpointNetworkAsCode() {
    console.log('[Visualizer] Endpoint identity data:', {
      id: this.endpointData.id,
      name: this.endpointData.name,
      hasApiSession: this.endpointData.hasApiSession,
      hasEdgeRouterConnection: this.endpointData.hasEdgeRouterConnection,
      edgeRouterConnectionStatus: this.endpointData.edgeRouterConnectionStatus,
      envInfo: this.endpointData.envInfo,
    });
    const pagesize = 500;
    const services_paging = {
      searchOn: 'name',
      filter: '',
      total: pagesize,
      page: 1,
      sort: 'name',
      order: 'asc',
    };

    this.zitiService
      .get(`identities/${this.endpointData.id}/services`, services_paging, [])
      .then((result) => {
        this.services = result.data;
        this.closeRotate = false;

        if (!this.services || this.services.length === 0) {
          this.services = [];
          this.serviceOptions = [];
          this.serviceOptions.push(noServices());
          this.selectedService = 'No services found for the selected identity';
          this.isLoading = false;
        } else {
          const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
          const promises = [];
          for (let page = 2; page <= pages; page++) {
            services_paging.page = page;
            const tmp_promise = this.zitiService
              .get(
                `identities/${this.endpointData.id}/services`,
                services_paging,
                []
              )
              .then((pageResult) => {
                pageResult.data.forEach((serv) => {
                  this.services.push(serv);
                });
              });
            promises.push(tmp_promise);
          }
          Promise.all(promises).then(() => {
            const edgeRouterPromise = this.zitiService
              .get(`identities/${this.endpointData.id}/edge-routers`, {}, [])
              .then((result) => {
                this.edgerouters = [];
                result.data.forEach((rec) => {
                  this.edgerouters.push(rec);
                });
              });

            const fabricPromise = Promise.allSettled([
              this.mapDataService.fetchRouters(),
              this.mapDataService.fetchLinks(),
              this.mapDataService.fetchCircuits(),
              this.mapDataService.fetchTerminators(),
            ]).then((results) => {
              const [routersResult, linksResult, circuitsResult, terminatorsResult] = results;
              const allFailed = results.every(r => r.status === 'rejected');
              this.fabricApiAvailable = !allFailed;

              if (routersResult.status === 'fulfilled') {
                this.allRouters = routersResult.value.routers || [];
                this.routerTypesMap = routersResult.value.routerTypes || new Map();
              }
              if (linksResult.status === 'fulfilled') {
                this.allLinks = linksResult.value || [];
              }
              if (circuitsResult.status === 'fulfilled') {
                this.allCircuits = circuitsResult.value || [];
              }
              if (terminatorsResult.status === 'fulfilled') {
                this.allTerminators = terminatorsResult.value || [];
              }
            });

            Promise.all([edgeRouterPromise, fabricPromise]).then(() => {
              this.serviceOptions = createServiceOptions(this.services);
              this.filterText =
                this.serviceOptions.length === 0
                  ? ''
                  : this.serviceOptions[0].name;
              this.selectedService =
                this.serviceOptions.length === 0
                  ? 'No services found for the selected identity'
                  : this.serviceOptions[0].name;
              this.autocompleteOptions = this.serviceOptions;
              this.serviceChanged();
            });
          });
        }
      });

    function createServiceOptions(_services) {
      const options = [];
      const serviceNames = [];
      _services?.find((srvice) => {
        if (!serviceNames.includes(srvice.name)) {
          serviceNames.push(srvice.name);
          const sd = new ServiceData();
          sd.id = srvice.id;
          sd.name = srvice.name;
          options.push(sd);
        }
      });
      return options;
    }

    function noServices() {
      const sd = new ServiceData();
      sd.id = '';
      sd.name = 'NO SERVICES';
      return sd;
    }
  } // end of getEndpointNetworkAsCode

  filterSearchArray() {
    this.autocompleteOptions = [];
    this.autocompleteOptions = this.serviceOptions.filter((option) =>
      option.name.toLowerCase().includes(this.selectedService.toLowerCase())
    );
  }

  clearSearchFilter() {
    this.filterText = 'You can filter services by typing here';
    this.autocompleteOptions = this.serviceOptions;
    this.selectedService = '';
  }

  autocompleteSearch(event) {
    this.serviceChanged();
  }

  serviceChanged() {
     // Service change implies new topology — re-fit on next render.
     this.hasInitialFit = false;
     this.isLoading = true;
     const allPromises = [];
     let serviceOb = null;
     let service_configs = [];

     serviceOb = this.services && this.services.find((rec) => {
      return  (rec.name === this.selectedService);
     });

     if (!serviceOb) {
       this.isLoading = false;
       return;
     }

     const configs_url = this.getLinkForResource(serviceOb, 'configs');

     const configPromise = this.zitiService
      .get(configs_url, {}, [])
      .then((configs) => {
        service_configs = configs && configs.data ? configs.data : [];
      });
     const service_edge_router_policies_url = this.getLinkForResource(
      serviceOb,
      'service-edge-router-policies'
     );
     const service_policies_url = this.getLinkForResource(
      serviceOb,
      'service-policies'
     ).replace('./', ''); // dial, Bind info

    let bindPolicies = [];
    let bindIdnetities = [];
    const promise2 = this.zitiService
      .get(service_policies_url, {}, [])
      .then((policies) => {
        const identityPromises = [];
        _.isArray(policies.data) && policies.data.forEach((policy) => {
          if (policy.type === 'Bind') {
            const bindIdentitiesUrl = this.getLinkForResource(
              policy,
              'identities'
            );
            const promse = this.zitiService
              .get(bindIdentitiesUrl.replace('./', ''), {}, [])
              .then((res) => {
                if (res && res.data.length > 0) {
                  res.data.forEach((rs) => {
                    this.addItemToArray(bindIdnetities, rs);
                  });
                } else {
                  this.addItemToArray(bindIdnetities, res.data);
                }
              });
            identityPromises.push(promse);
          }
        });
        Promise.all(identityPromises).then(() => {
          // Log bind identity data for debugging
          bindIdnetities.forEach((bi) => {
            console.log('[Visualizer] Bind identity:', {
              id: bi.id,
              name: bi.name,
              hasApiSession: bi.hasApiSession,
              hasEdgeRouterConnection: bi.hasEdgeRouterConnection,
              edgeRouterConnectionStatus: bi.edgeRouterConnectionStatus,
              envInfo: bi.envInfo,
            });
          });
          // Fetch host-side edge routers for each bind identity
          const hostRouterPromises = bindIdnetities.map((bindId) =>
            this.zitiService
              .get(`identities/${bindId.id}/edge-routers`, {}, [])
              .then((res) => res?.data || [])
              .catch(() => [])
          );
          Promise.all(hostRouterPromises).then((hostRouterResults) => {
            const hostEdgeRouters = [];
            hostRouterResults.forEach((routers) => {
              routers.forEach((r) => {
                if (!hostEdgeRouters.find((existing) => existing.id === r.id)) {
                  hostEdgeRouters.push(r);
                }
              });
            });

            // Filter fabric data to selected service
            const serviceTerminators = this.allTerminators.filter(
              (t) => (t.serviceId || t.service?.id || t.service) === serviceOb.id
            );
            const serviceCircuits = this.allCircuits.filter(
              (c) => c.service?.id === serviceOb.id
            );

            console.log('[Visualizer] Service:', { id: serviceOb.id, name: serviceOb.name });
            console.log('[Visualizer] Endpoint ID:', this.endpointData.id);
            console.log('[Visualizer] All circuits:', this.allCircuits.length);
            console.log('[Visualizer] Service circuits:', serviceCircuits.length);

            // Log circuits for this specific identity with full path details
            const myCircuits = serviceCircuits.filter(c =>
              (c.tags?.clientId || c.clientId || c.client?.id) === this.endpointData.id
            );
            console.log('[Visualizer] My circuits:', myCircuits.length);
            myCircuits.forEach((c, i) => {
              const pathNodes = c.path?.nodes || c.path || [];
              console.log(`[Visualizer] My circuit ${i}:`, {
                id: c.id,
                clientId: c.tags?.clientId || c.clientId,
                hostId: c.tags?.hostId,
                pathNodeIds: pathNodes.map(n => n.id || n),
                rawPathNodes: pathNodes,
              });
            });
            console.log('[Visualizer] Edge routers:', this.edgerouters?.map(r => ({ id: r.id, name: r.name })));
            if (serviceCircuits.length > 0) {
              serviceCircuits.forEach((c, i) => {
                console.log(`[Visualizer] Circuit ${i}:`, {
                  id: c.id,
                  serviceId: c.service?.id,
                  clientId: c.tags?.clientId || c.clientId,
                  hostId: c.tags?.hostId,
                  pathNodes: c.path?.nodes || c.path,
                });
              });
            } else {
              // Log a sample circuit to see the data shape
              if (this.allCircuits.length > 0) {
                console.log('[Visualizer] Sample circuit (different service):', {
                  id: this.allCircuits[0].id,
                  serviceId: this.allCircuits[0].service?.id,
                  serviceName: this.allCircuits[0].service?.name,
                  tags: this.allCircuits[0].tags,
                });
              }
            }

            this.lastRenderContext = {
              bindIdnetities,
              serviceOb,
              serviceConfigs: service_configs,
              hostEdgeRouters,
            };
            this.startVisProcess(
              bindIdnetities, serviceOb, service_configs,
              hostEdgeRouters, serviceTerminators, serviceCircuits
            );
            this.isLoading = false;
          });
        });
      });
  }

  async refreshFabricData(): Promise<void> {
    if (this.refreshRotate) {
      return;
    }
    this.refreshRotate = true;
    try {
      const results = await Promise.allSettled([
        this.mapDataService.fetchRouters(),
        this.mapDataService.fetchLinks(),
        this.mapDataService.fetchCircuits(),
        this.mapDataService.fetchTerminators(),
      ]);
      const [routersResult, linksResult, circuitsResult, terminatorsResult] = results;
      const allFailed = results.every((r) => r.status === 'rejected');
      this.fabricApiAvailable = !allFailed;

      if (routersResult.status === 'fulfilled') {
        this.allRouters = routersResult.value.routers || [];
        this.routerTypesMap = routersResult.value.routerTypes || new Map();
      }
      if (linksResult.status === 'fulfilled') {
        this.allLinks = linksResult.value || [];
      }
      if (circuitsResult.status === 'fulfilled') {
        this.allCircuits = circuitsResult.value || [];
      }
      if (terminatorsResult.status === 'fulfilled') {
        this.allTerminators = terminatorsResult.value || [];
      }

      if (this.lastRenderContext) {
        const { bindIdnetities, serviceOb, serviceConfigs, hostEdgeRouters } = this.lastRenderContext;
        const serviceTerminators = this.allTerminators.filter(
          (t) => (t.serviceId || t.service?.id || t.service) === serviceOb.id
        );
        const serviceCircuits = this.allCircuits.filter(
          (c) => c.service?.id === serviceOb.id
        );
        this.startVisProcess(
          bindIdnetities, serviceOb, serviceConfigs,
          hostEdgeRouters, serviceTerminators, serviceCircuits
        );
      }
    } finally {
      this.refreshRotate = false;
    }
  }

  addItemToArray(bindIdnetities, ob) {
    if (!bindIdnetities.find((item) => item.id === ob.id)) {
      bindIdnetities.push(ob);
    }
    return bindIdnetities;
  }

  getLinkForResource(ob, resource) {
    return ob['_links'][resource]['href'];
  }

  startVisProcess(
    bindIdnetities, selectedServiceOb, serviceConfigs,
    hostEdgeRouters = [], serviceTerminators = [], serviceCircuits = []
  ) {
    this.countGrp2Nds = 0;
    this.countGrp3Nds = 0;
    if (_.isEmpty(this.selectedService)) {
      this.serviceSelectError = !_.isEmpty(this.selectedService);
      return;
    }
    try {
      // Use viewBox width for column positioning (matches SVG coordinate space)
      const containerWidth = 1050;

      this.graphJsonObj = this.identityServicePathHelper.getEndpointGraphObj(
        this.endpointData,
        bindIdnetities,
        this.edgerouters,
        selectedServiceOb,
        serviceConfigs,
        '',
        hostEdgeRouters,
        this.allRouters,
        this.routerTypesMap,
        this.allLinks,
        serviceCircuits,
        serviceTerminators,
        this.fabricApiAvailable,
        containerWidth
      );
    } catch (err) {
      return;
    }

    let countGrp1Nds = 0;
    this.doEndpointHasServicesInPrivateNw = false;
    this.doEndpointHasPublicRouters = false;
    this.doEndpointHasAppwans = false;
    this.graphJsonObj.nodes.forEach((nd) => {
      if (nd.group === '3') {
        this.countGrp3Nds++;
      }
      if (nd.group.includes('2')) {
        this.countGrp2Nds++;
      }
      if (nd.group === '1') {
        countGrp1Nds++;
      }
    });

    if (this.countGrp3Nds > 0) {
      this.doEndpointHasServicesInPrivateNw = true; // show private/customer network box, will be decided with this variable.
    }
    if (this.countGrp2Nds > 0) {
      this.doEndpointHasPublicRouters = true; // show public network box, will be decided with this variable.
    }

    if (countGrp1Nds > 0) {
      this.doEndpointHasAppwans = true; // show private network box, will be decided with this variable.
    }
    this.initTopoView();
  }

  toggleModalSize() {
    this.fullScreen = !this.fullScreen;
  }

  hide() {
    this.dialogRef.close();
  }

  initTopoView() {
    const vbWidth = this.viewBoxWidth;
    const vbHeight = this.viewBoxHeight;
    const colors = d3.scaleOrdinal(d3.schemeCategory10);
    const tooltip = d3.select('#epTooltip');
    // Hide is deferred so the cursor can travel from the node into the popover (to read/select
    // its content); entering the popover cancels the hide, leaving it dismisses it.
    let tooltipHideTimer: any = null;
    tooltip.on('mouseenter', () => clearTimeout(tooltipHideTimer));
    tooltip.on('mouseleave', () => tooltip.style('display', 'none'));

    const svg = d3.select('#IdentityTopology');
    const svgEl: any = svg.node();
    let node, link;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '-20 -20 ' + (vbWidth + 40) + ' ' + vbHeight)
      .attr('preserveAspectRatio', 'xMidYMin meet');

    // Capture any pre-existing zoom transform (from previous render / user gestures)
    // so we can re-apply it after recreating the content group.
    const existingTransform = svgEl
      ? d3.zoomTransform(svgEl)
      : d3.zoomIdentity;

    svg.selectAll('g').remove();

    // Wrap all topology content in a <g> so zoom transforms have something to translate.
    const contentG = svg.append('g').attr('class', 'topology-content');
    contentG.attr('transform', existingTransform.toString());

    const handleZoom = (e: any) => {
      contentG.attr('transform', e.transform);
    };

    if (!this.zoomBehavior) {
      this.zoomBehavior = d3.zoom().scaleExtent([0.1, 5]).on('zoom', handleZoom);
    } else {
      this.zoomBehavior.on('zoom', handleZoom);
    }
    svg.call(this.zoomBehavior);

    const simulation: any = d3
      .forceSimulation()
      .force(
        'link',
        d3
          .forceLink()
          .id(function (d: any) {
            return d.id;
          })
          .distance(100)
          .strength(1)
      )
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(vbWidth / 2, vbHeight / 2));

    const links = this.graphJsonObj.links;
    const nodes = this.graphJsonObj.nodes;

    link = contentG
      .selectAll('g.line.line')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrowhead)');

    // Three link styles, distinguishable by pattern (color-blind-safe) and color. A single
    // "broken" style covers every failure — which END is the problem is read from the node
    // colors (an offline router vs an unreachable/un-enrolled endpoint), so the link needn't
    // re-encode the cause:
    //   active circuit -> green solid
    //   available      -> gray dashed
    //   broken         -> red dotted
    const isBroken = (d) => d.status === 2;
    link
      .append('line')
      .style('stroke-width', function (d) {
        if (d.linkType === 'active-circuit') return 1.5;
        if (isBroken(d)) return 2.25;
        return 1.25;
      })
      .style('stroke-linecap', function (d) {
        // Rounded caps turn the tight broken dash array into actual dots.
        return isBroken(d) ? 'round' : 'butt';
      })
      .style('stroke', function (d) {
        if (d.linkType === 'active-circuit') return '#00cd13';
        if (isBroken(d)) return '#e6432e';
        return '#8a8f9a';
      })
      .style('stroke-dasharray', function (d) {
        if (d.linkType === 'active-circuit') return null; // solid
        if (isBroken(d)) return '0.5,6'; // dotted
        return '5,5'; // available: dashed
      });

    node = contentG
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    node
      .append('image')
      .attr('xlink:href', function (d) {
        const routerImagePath = 'assets/images/visualizer/Routers.png';
        const nonProvisionedRouterImagePath =
          'assets/images/visualizer/ER.png';
        const errRouterImagePath = 'assets/images/visualizer/error_er.png';
        const errEndpointImagePath = 'assets/images/visualizer/host-error.png';
        const unregisteredEndpointImagePath =
          'assets/images/visualizer/host_unregistered.png';
        const endPointPath = 'assets/images/visualizer/host.png';

        if (d.type.includes('Identity')) {
          if (d.status === 'Un-Registered') {
            return unregisteredEndpointImagePath;
          }
          // Enrolled but unreachable / configured-but-not-hosting => broken tunneler.
          if (d.brokenCause === 'tunneler-unreachable' || d.brokenCause === 'misconfigured') {
            return errEndpointImagePath;
          }
          return endPointPath;
        } else if (
          d.type.includes('Router') &&
          (d.status === 'ERROR' || d.online === 'No')
        ) {
          return errRouterImagePath;
        } else if (d.type.includes('Router') && d.status === 'PROVISIONED') {
          return routerImagePath;
        } else if (d.type.includes('Router')) {
          return nonProvisionedRouterImagePath;
        }

        if (d.group === '4') {
          return 'assets/images/visualizer/service.png';
        } else {
          return '';
        }
      })
      .attr('x', -25)
      .attr('y', -25)
      .attr('width', '40')
      .attr('height', '40');

    // Add status circle overlay for identity nodes
    node.filter((d: any) => d.type.includes('Identity'))
      .append('circle')
      .attr('cx', 10)
      .attr('cy', -20)
      .attr('r', 4.5)
      .attr('fill', function (d: any) {
        if (d.brokenCause) return '#e6432e'; // broken — enrolled but unreachable / not hosting
        if (d.routerConnection === 'Yes' || d.apiSession === 'Yes') return '#08dc5a';
        return '#8a8f9a';
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Node labels: for compound pipe-delimited names ("<networkId>|<identityId>|Human Name")
    // show only the last segment so the canvas stays readable; the full name remains in the
    // hover tooltip.
    const getDisplayLabel = (fullName: string | undefined): string => {
      if (!fullName) return '';
      const segments = fullName.split('|').map((s) => s.trim()).filter((s) => s.length > 0);
      const candidate = segments.length > 0 ? segments[segments.length - 1] : fullName;
      const maxLen = 28;
      return candidate.length > maxLen
        ? candidate.substring(0, maxLen) + '…'
        : candidate;
    };

    node.each(function (this: any, d: any) {
      const g = d3.select(this);
      const displayName = getDisplayLabel(d.name);

      const text = g.append('text')
        .attr('x', 0)
        .attr('y', 28)
        .attr('fill', 'var(--tableText)')
        .style('font-size', '9px')
        .style('text-anchor', 'middle')
        .text(displayName);

      const bbox = (text.node() as SVGTextElement).getBBox();
      g.insert('rect', 'text')
        .attr('x', bbox.x - 2)
        .attr('y', bbox.y - 1)
        .attr('width', bbox.width + 4)
        .attr('height', bbox.height + 2)
        .attr('fill', 'var(--background)')
        .attr('opacity', 0.8)
        .attr('rx', 2);
    });

    // Column headers removed — node types are shown in the legend instead

    simulation.nodes(nodes).on('tick', ticked);

    simulation.force('link').links(links);
    node.on('mouseover', (event, d) => {
      const endpointUtlizationJson = {};
      drawTooltip(event, d, endpointUtlizationJson);
    });

    node.on('mouseout', function () {
      removeTooltip();
    });

    function ticked() {
      node.attr('transform', function (d) {
        return 'translate(' + d.posx + ',' + d.posy + ')';
      });

      link
        .select('line')
        .attr('x1', function (d) {
          return d.source.posx;
        })
        .attr('y1', function (d) {
          return d.source.posy;
        })
        .attr('x2', function (d) {
          return d.target.posx;
        })
        .attr('y2', function (d) {
          return d.target.posy;
        });

      link
        .select('image')
        .attr('x', function (d) {
          const x1 = d.source.posx,
            x2 = d.target.posx,
            x = x1 - (x1 - x2) / 2;

          return x - 8;
        })
        .attr('y', function (d) {
          const y1 = d.source.posy,
            y2 = d.target.posy,
            y = y1 - (y1 - y2) / 2;

          return y - 12;
        });

      link
        .select('rect')
        .attr('opacity', 1)
        .attr('x', function (d) {
          return d.source.posx;
        })
        .attr('y', function (d) {
          return d.source.posy;
        })
        .selectAll('animate')
        .each(function (this: any, d: any, i) {
          if (i === 0) {
            d3.select(this)
              .attr('attributeName', function (d) {
                return 'x';
              })
              .attr('from', function (d: any) {
                const n = d.source.posx - 1;
                return n;
              })
              .attr('to', function (d: any) {
                return d.target.posx;
              });
          } else {
            d3.select(this)
              .attr('attributeName', function (d: any) {
                return 'y';
              })
              .attr('from', function (d: any) {
                return d.source.posy;
              })
              .attr('to', function (d: any) {
                return d.target.posy;
              });
          }

          d3.select(this)
            .attr('attributeType', 'XML')
            .attr('begin', '0.5s')
            .attr('dur', function (d) {
              return '1.0s';
            })
            .attr('repeatCount', 'indefinite');
        });
    } // end of ticked

    function removeTooltip() {
      if (tooltip) {
        // Defer the hide so the user can move onto the popover; mouseenter (above) cancels it.
        clearTimeout(tooltipHideTimer);
        tooltipHideTimer = setTimeout(() => tooltip.style('display', 'none'), 220);
      }
    }

    function drawTooltip(event, d, endpointUtlizationJson) {
      clearTimeout(tooltipHideTimer);
      document.getElementById('epTooltip').innerHTML = readKeyValues(
        d,
        endpointUtlizationJson
      );
      tooltip.style('display', 'block');
      tooltip.style('white-space', 'pre-wrap');
      const x = event.pageX + 'px';
      const y = event.pageY + 'px';
      tooltip.style('left', x);
      tooltip.style('top', y);
    }

    // Builds a compact status "card" for a node's hover tooltip: a bold name, a prominent
    // plain-language status line (with cause), and a few key facts. Makes the connectivity of
    // customer-hosted tunnelers and routers immediately legible.
    function readKeyValues(d, endpointUtlizationJson) {
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

      const isRouter = !!(d.type && String(d.type).includes('Router'));
      const isService = d.group === '4' || !!(d.type && String(d.type).includes('Service'));

      // The status band is the single source of truth for connectivity/enrollment — it replaces
      // any separate "Enrolled" row. `caption` is a short fragment, used only where it tells the
      // operator something the label alone doesn't (i.e. what to go check).
      let cls = 'neutral';
      let label = '';
      if (isService) {
        label = 'Service';
      } else if (isRouter) {
        // Routers report a plain online/offline that mirrors the controller's isOnline. The
        // path-level "router-down" link styling conveys the impact; the node stays simple.
        if (d.online === 'No' || d.status === 'ERROR') { cls = 'offline'; label = 'Offline'; }
        else { cls = 'ok'; label = 'Online'; }
      } else if (d.brokenCause === 'misconfigured' || d.status === 'Un-Registered') {
        cls = 'broken'; label = 'Not enrolled';
      } else if (d.brokenCause === 'tunneler-unreachable') {
        cls = 'broken'; label = 'Unreachable';
      } else if (d.routerConnection === 'Yes' || d.apiSession === 'Yes') {
        cls = 'ok'; label = 'Online';
      } else {
        cls = 'offline'; label = 'Offline';
      }

      // No role for the service node — the icon/name already make it obvious, and a "Role: Service"
      // row would just repeat itself.
      // Role is the policy action (Dial/Bind) the identity has for the service — NOT the host
      // mechanism, which we can't know (tunneler vs SDK vs router all look the same here).
      let role = '';
      if (d.group === '1') role = 'Client (Dial)';
      else if (d.group === '3') role = 'Host (Bind)';
      else if (isRouter) role = d.routerType === 'transit-router' ? 'Transit router' : 'Edge router';

      // Facts that add detail beyond the status pill. The pill summarizes overall state; these
      // are the granular signals an operator uses to diagnose it (a host can have an API session
      // yet no router connection). Only the pill's own inputs (Online/Type/Enrolled) are omitted.
      // Rows are [label, value, optional hover-context]. Service rows are purpose-labeled and
      // adapt to how the service is configured (intercept+host, host-only, intercept-only, or
      // SDK-defined with no address config).
      const rows: [string, string, string?][] = [];
      if (isService) {
        if (d.interceptSummary) {
          rows.push(['Intercept', d.interceptSummary]);
        }
        if (d.hostSummary) {
          rows.push(['Host', d.hostSummary]);
        }
        if (!d.interceptSummary && !d.hostSummary) {
          // No intercept/host config. State the facts (the config types present, or none) rather
          // than inferring "SDK-defined" — there's no property that actually tells us the host type.
          rows.push(['Config types',
            (d.configTypeNames && d.configTypeNames.length) ? d.configTypeNames.join(', ') : 'None']);
        }
        if (typeof d.encryptionRequired === 'boolean') {
          rows.push(['Encryption', d.encryptionRequired ? 'Required' : 'Not required']);
        }
        if (d.terminatorStrategy) {
          rows.push(['Terminators', d.terminatorStrategy]);
        }
        if (d.serviceRoleAttributes && d.serviceRoleAttributes.length) {
          rows.push(['Attributes', d.serviceRoleAttributes.join(', ')]);
        }
        if (d.permissions && d.permissions.length) {
          rows.push(['Your access', d.permissions.join(', ')]);
        }
      } else {
        if (role) rows.push(['Role', role]);
        if (isRouter) {
          if (d.tunnelerEnabled === 'Yes' || d.tunnelerEnabled === 'No') {
            rows.push(['Tunneler Enabled', d.tunnelerEnabled]);
          }
        } else {
          if (d.routerConnection === 'Yes' || d.routerConnection === 'No') {
            rows.push(['Router Connection', d.routerConnection]);
          }
          if (d.apiSession === 'Yes' || d.apiSession === 'No') {
            rows.push(['API Session', d.apiSession]);
          }
          if (d.os) rows.push(['OS', d.os]);
          if (d.mfaEnabled === true) rows.push(['MFA', 'Enabled']);
        }
      }

      let info = "<div class='tool-tip-container tooltip-card'>";
      info += '<div class="tooltip-header">' + esc(d.name || '') + '</div>';
      // The service node carries no connectivity state, so it gets no status pill.
      if (!isService) {
        info += '<div class="tt-status-pill tt-' + cls + '">'
          + '<span class="tt-status-dot"></span>'
          + '<span class="tt-status-label">' + esc(label) + '</span>'
          + '</div>';
      }
      rows.forEach(([k, v, t]) => {
        info += '<div class="prop-row"' + (t ? ' title="' + esc(t) + '"' : '') + '>'
          + '<span class="prop-label">' + esc(k) + '</span>'
          + '<span class="prop-value">' + esc(v) + '</span>'
          + '</div>';
      });
      return info + '</div>';
    }

    function isAnObject(o) {
      return o instanceof Object && o.constructor === Object;
    }

    this.refreshRotate = false;

    // After the first render only, fit the graph to the viewBox so big topologies don't
    // overflow off-screen. Subsequent renders (refresh ticks) preserve the user's transform.
    if (!this.hasInitialFit) {
      setTimeout(() => {
        this.fitToContent();
        this.hasInitialFit = true;
      }, 0);
    }
  } // end of initTopoView

  fitToContent(): void {
    if (!this.zoomBehavior) return;
    const nodes = this.graphJsonObj?.nodes || [];
    if (nodes.length === 0) return;

    const xs = nodes
      .map((n: any) => n.posx)
      .filter((v: any) => typeof v === 'number' && !isNaN(v));
    const ys = nodes
      .map((n: any) => n.posy)
      .filter((v: any) => typeof v === 'number' && !isNaN(v));
    if (xs.length === 0 || ys.length === 0) return;

    const padding = 60;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const contentWidth = (maxX - minX) + padding * 2;
    const contentHeight = (maxY - minY) + padding * 2;
    if (contentWidth <= 0 || contentHeight <= 0) return;

    // Reserve room in the bottom-right for the legend so the auto-fit doesn't place nodes
    // underneath it. When the legend is collapsed there's nothing to avoid.
    const reserveRight = this.legendCollapsed ? 0 : 160;
    const reserveBottom = this.legendCollapsed ? 0 : 90;
    const availWidth = this.viewBoxWidth - reserveRight;
    const availHeight = this.viewBoxHeight - reserveBottom;

    const scale = Math.min(
      availWidth / contentWidth,
      availHeight / contentHeight,
      1
    );
    // Center the content within the available (legend-free) area, which sits at the top-left,
    // leaving the reserved margin on the right/bottom for the legend panel.
    const tx = (availWidth - contentWidth * scale) / 2 - (minX - padding) * scale;
    const ty = (availHeight - contentHeight * scale) / 2 - (minY - padding) * scale;

    d3.select('#IdentityTopology')
      .transition()
      .duration(300)
      .call(
        this.zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
  }

  zoomIn(): void {
    if (!this.zoomBehavior) return;
    d3.select('#IdentityTopology')
      .transition()
      .duration(200)
      .call(this.zoomBehavior.scaleBy, 1.4);
  }

  zoomOut(): void {
    if (!this.zoomBehavior) return;
    d3.select('#IdentityTopology')
      .transition()
      .duration(200)
      .call(this.zoomBehavior.scaleBy, 1 / 1.4);
  }

  resetView(): void {
    this.fitToContent();
  }
}

class ServiceData {
  id;
  name;
}

