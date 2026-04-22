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
  filterText = 'fetching services..';
  noSearchResults = false;
  autocompleteOptions = [];
  fullScreen = false;
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

            this.startVisProcess(
              bindIdnetities, serviceOb, service_configs,
              hostEdgeRouters, serviceTerminators, serviceCircuits
            );
            this.isLoading = false;
          });
        });
      });
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
    const vbWidth = 1050;
    const vbHeight = 500;
    const colors = d3.scaleOrdinal(d3.schemeCategory10);
    const tooltip = d3.select('#epTooltip');

    let svg = d3.select('#IdentityTopology'),
      node,
      link;

    const handleZoom = (e) => svg.attr('transform', e.transform);
    const zoom = d3.zoom().on('zoom', handleZoom);

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      // .call(zoom)
      .attr('viewBox', '-20 -20 ' + (vbWidth + 40) + ' ' + vbHeight)
      .attr('preserveAspectRatio', 'xMidYMin meet')
      .append('g');

    svg.selectAll('g').remove();

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

    link = svg
      .selectAll('g.line.line')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrowhead)');

    link
      .append('line')
      .style('stroke-width', function (d) {
        if (d.linkType === 'active-circuit' || d.status === 1) {
          return 1.5;
        }
        return 1.25;
      })
      .style('stroke', function (d) {
        if (d.linkType === 'active-circuit' || d.status === 1) {
          return '#00cd13';
        }
        return '#8a8f9a';
      })
      .style('stroke-dasharray', function (d) {
        if (d.linkType === 'active-circuit' || d.status === 1) {
          return null;
        }
        return '5,5';
      });

    link.each(function (this: any, d: any, i) {
      const _this = d3.select(this);
      if (d.linkType === 'active-circuit') {
        // Animated dot for active circuit links
        _this
          .append('text')
          .style('fill', 'rgb(255,198,22)')
          .style('font-size', '11');
        _this
          .append('rect')
          .attr('fill', 'white')
          .attr('width', 3)
          .attr('height', 3)
          .append('animate');
        _this.select('rect').append('animate');
      } else if (d.status === 1 && d.linkType === 'endpoint-connection') {
        // Animated dot for active endpoint connections
        _this
          .append('rect')
          .attr('fill', 'white')
          .attr('width', 3)
          .attr('height', 3)
          .append('animate');
        _this.select('rect').append('animate');
      } else if (d.status === 2) {
        // Warning/misconfigured — show link-cut icon
        _this
          .append('image')
          .attr('xlink:href', function () {
            return '/assets/images/visualizer/link-cut.png';
          })
          .attr('width', '20')
          .attr('height', '24');
      }
    });

    node = svg
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    node
      .append('image')
      .attr('xlink:href', function (d) {
        const routerImagePath = '/assets/images/visualizer/Routers.png';
        const nonProvisionedRouterImagePath =
          '/assets/images/visualizer/ER.png';
        const errRouterImagePath = '/assets/images/visualizer/error_er.png';
        const errEndpointImagePath = '/assets/images/visualizer/host-error.png';
        const unregisteredEndpointImagePath =
          '/assets/images/visualizer/host_unregistered.png';
        const endPointPath = '/assets/images/visualizer/host.png';

        if (d.type.includes('Identity') && d.status === 'Un-Registered') {
          return unregisteredEndpointImagePath;
        } else if (d.type.includes('Identity') && d.routerConnection === 'No') {
          return unregisteredEndpointImagePath;
        } else if (d.type.includes('Identity')) {
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
          return '/assets/images/visualizer/service.png';
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
        if (d.routerConnection === 'Yes' || d.apiSession === 'Yes') return '#08dc5a';
        return '#8a8f9a';
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Symmetric labels — truncated, centered below each node
    node.each(function (this: any, d: any) {
      const g = d3.select(this);
      const maxLen = 42;
      const displayName = d.name && d.name.length > maxLen
        ? d.name.substring(0, maxLen) + '\u2026'
        : d.name;

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

    // Add column header labels when fabric data is available
    if (this.fabricApiAvailable) {
      // Count nodes per group
      const groupCounts = { '1': 0, '2d': 0, '2dh': 0, '2t': 0, '2h': 0, '3': 0, '4': 0 };
      nodes.forEach((nd: any) => {
        if (groupCounts[nd.group] !== undefined) groupCounts[nd.group]++;
      });

      // Compute column positions in viewBox coordinates (same formula as helper)
      const cw = 1050;
      const pad = 100;
      const colSpace = (cw - pad * 2) / 4;
      const colX = [pad, pad + colSpace, pad + colSpace * 2, pad + colSpace * 3, pad + colSpace * 4];

      const columnLabels = [
        { x: colX[0], text: 'Identity', count: groupCounts['1'] },
        { x: colX[1], text: 'Public Edge Routers', count: groupCounts['2d'] + groupCounts['2dh'] },
        { x: colX[2], text: 'Private Edge Routers', count: groupCounts['2h'] },
        { x: colX[3], text: 'Hosts', count: groupCounts['3'] },
        { x: colX[4], text: 'Service', count: groupCounts['4'] },
      ];

      // Label text
      svg.selectAll('.column-label')
        .data(columnLabels)
        .enter()
        .append('text')
        .attr('class', 'column-label')
        .attr('x', (d: any) => d.x)
        .attr('y', 25)
        .attr('fill', 'var(--primary)')
        .style('font-family', "'Russo One', sans-serif")
        .style('font-size', '12px')
        .style('opacity', 0.75)
        .style('text-anchor', 'middle')
        .text((d: any) => d.text);

      // Count text
      svg.selectAll('.column-count')
        .data(columnLabels)
        .enter()
        .append('text')
        .attr('class', 'column-count')
        .attr('x', (d: any) => d.x)
        .attr('y', 40)
        .attr('fill', 'var(--primary)')
        .style('font-family', "'Open Sans', sans-serif")
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('opacity', 0.65)
        .style('text-anchor', 'middle')
        .text((d: any) => '(' + d.count + ')');
    }

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
        tooltip.style('display', 'none');
      }
    }

    function drawTooltip(event, d, endpointUtlizationJson) {
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

    function readKeyValues(d, endpointUtlizationJson) {
      const excludeKeys = new Set([
        'status', 'posy', 'posx', 'group', 'hostedEdgeId', 'value',
        'index', 'parent', 'depth', 'x', 'y', 'id', 'x0', 'y0',
        'vy', 'vx', 'routerType', 'linkType', 'provider', 'usage',
      ]);

      let info = "<div class='tool-tip-container'>";
      // Show name as header
      if (d.name) {
        info += '<div class="tooltip-header">' + d.name + '</div>';
      }

      const keys = Object.keys(d);
      keys.forEach(function (k) {
        if (excludeKeys.has(k) || k === 'name') return;

        let val = d[k];
        if (val === null || val === undefined || val === '') return;

        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

        if (isAnObject(val)) {
          val = val.name || JSON.stringify(val);
        } else if (val instanceof Array) {
          val = val.join(', ');
        }

        info += '<div class="prop-row">'
          + '<span class="prop-label">' + label + '</span>'
          + '<span class="prop-value">' + val + '</span>'
          + '</div>';
      });

      return info + '</div>';
    }

    function isAnObject(o) {
      return o instanceof Object && o.constructor === Object;
    }

    this.refreshRotate = false;
  } // end of initTopoView
}

class ServiceData {
  id;
  name;
}

