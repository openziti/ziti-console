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
import * as d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { take, tap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-identity-visualizer',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './identity-service-path.component.html',
  styleUrls: ['./identity-service-path.component.scss'],
})
export class IdentityServicePathComponent implements OnInit {
  public d3;
  refreshRotate = false;
  closeRotate = true;
  filterText = 'fetching services..';
  rangeDateTime = [];
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
  controllerDomain;
  zitiSessionId;
  serviceApiUrl;
  interceptConfigApiUrl;
  hostConfigApiUrl;
  dialPolicyApiUrl;
  bindPolicyApiUrl;

  constructor(
    private identityServicePathHelper: IdentityServicePathHelper,
    @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
    @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
    private router: Router,
    private dialogRef: MatDialogRef<IdentityServicePathComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.endpointData = data.identity;
    const dtNow = new Date();
    this.rangeDateTime[0] = new Date(dtNow.getTime() - 24 * 60 * 60 * 1000);
    this.rangeDateTime[1] = dtNow;
  }

  ngOnInit(): void {
    this.controllerDomain =
      this.settingsService?.settings?.selectedEdgeController;
    this.zitiSessionId = this.settingsService?.settings?.session?.id;
    this.serviceApiUrl = `${this.controllerDomain}/edge/management/v1/identities/${this.endpointData.id}/services`;
    this.interceptConfigApiUrl = `${this.controllerDomain}/edge/management/v1/configs`;
    this.hostConfigApiUrl = `${this.controllerDomain}/edge/management/v1/configs`;
    this.dialPolicyApiUrl = `${this.controllerDomain}/edge/management/v1/service-policies`;
    this.bindPolicyApiUrl = `${this.controllerDomain}/edge/management/v1/service-policies`;
    this.getEndpointNetworkAsCode();

    this.autocompleteOptions = [];
    this.isLoading = true;
  }

  getEndpointNetworkAsCode() {
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
          this.selectedService = 'Services not found for a selected identity';
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
            this.zitiService
              .get(`identities/${this.endpointData.id}/edge-routers`, {}, [])
              .then((result) => {
                this.edgerouters = [];
                result.data.forEach((rec) => {
                  this.edgerouters.push(rec);
                });
              });
            this.serviceOptions = createServiceOptions(this.services);
            this.filterText =
              this.serviceOptions.length === 0
                ? ''
                : this.serviceOptions[0].name;
            this.selectedService =
              this.serviceOptions.length === 0
                ? 'Services not found for a selected identity'
                : this.serviceOptions[0].name;
            this.autocompleteOptions = this.serviceOptions;
            this.serviceChanged();
          });
        }
      });

    function createServiceOptions(_services) {
      const options = [];
      const serviceNames = [];
      _services.find((srvice) => {
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
    const str = event ? event.option.value : '';
    this.serviceChanged();
  }

  serviceChanged() {
    this.isLoading = true;
    const allPromises = [];
    let serviceOb = null;
    let service_configs = [];
    this.services.forEach((rec) => {
      if (rec.name === this.selectedService) {
        serviceOb = rec;
      }
    });
    const configs_url = this.getLinkForResource(serviceOb, 'configs'); // host ip:port , intercept ip:port

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
        policies.data.forEach((policy) => {
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
          this.startVisProcess(bindIdnetities, serviceOb, service_configs);
          this.isLoading = false;
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

  startVisProcess(bindIdnetities, selectedServiceOb, serviceConfigs) {
    this.countGrp2Nds = 0;
    this.countGrp3Nds = 0;
    if (_.isEmpty(this.selectedService)) {
      this.serviceSelectError = !_.isEmpty(this.selectedService);
      return;
    }
    try {
      this.graphJsonObj = this.identityServicePathHelper.getEndpointGraphObj(
        this.endpointData,
        bindIdnetities,
        this.edgerouters,
        selectedServiceOb,
        serviceConfigs
      );
    } catch (err) {
      console.log(err);
    }

    let countGrp1Nds = 0;
    this.doEndpointHasServicesInPrivateNw = false;
    this.doEndpointHasPublicRouters = false;
    this.doEndpointHasAppwans = false;
    this.graphJsonObj.nodes.find((nd) => {
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
    const margin = { top: 10, right: 90, bottom: 30, left: 0 };
    const width = 1100 - margin.left - margin.right;
    const height = 1100 - margin.top - margin.bottom;
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
      .attr('viewBox', '0 ' + -10 + ' ' + width + ' ' + height)
      .append('g')
      .attr('transform', 'translate(' + -300 + ',' + 225 + ')');

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
      .force('center', d3.forceCenter(width / 2, height / 2));

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
        if (d.status === 1 || d.status === -1) {
          return 1.5; //Math.sqrt(d.weight);
        } else {
          return 1;
        }
      })
      .style('stroke', function (d) {
        if (d.status === 1) {
          let doInUsage = false;
          return '#00cd13';
        } else if (d.status === -1) {
          return '#d8dce7';
        } else {
          return '#ff004e';
        }
      });

    link.each(function (this: any, d: any, i) {
      const _this = d3.select(this);
      if (d.status === 1) {
        let doInUsage = true; // false;
        _this
          .append('text')
          // .text(d.netspeed)
          .style('fill', 'rgb(255,198,22)')
          .style('font-size', '11');
        _this
          .append('rect')
          .attr('fill', function (d) {
            return '#555';
          })
          .attr('width', function (d) {
            if (doInUsage) {
              return 3;
            } else {
              return 0.1;
            }
          })
          .attr('height', function (d) {
            if (doInUsage) {
              return 3;
            } else {
              return 0.1;
            }
          })
          .append('animate');

        _this.select('rect').append('animate');
      } else if (d.status === 0) {
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
        } else if (
          d.type.includes('Identity') &&
          d.apiSession === 'Yes' &&
          d.status === 'Registered'
        ) {
          return endPointPath;
        } else if (
          d.type.includes('Identity') &&
          (d.routerConnection === 'No' || d.apiSession === 'No')
        ) {
          return errEndpointImagePath;
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

    // node.append('title') .text(function (d) {return d.name;});

    node
      .append('text')
      .attr('x', 10)
      .attr('y', 12)
      .style('font-weight', '600')
      .text(function (d) {
        // const name = d.type.includes('Service') ? d.alias : d.name;
        return d.name;
      });

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
      ); // readObjectValues(d);
      tooltip.style('display', 'block');
      tooltip.style('white-space', 'pre-wrap');
      const x = event.pageX + 'px';
      const y = event.pageY + 'px';
      tooltip.style('left', x);
      tooltip.style('top', y);
    }

    function readKeyValues(d, endpointUtlizationJson) {
      let info =
        "<div class='tool-tip-container' style='font-size:14px;font-family:Open Sans; font-weight: 600; font-color: var(--tableText);'>";
      const keys = Object.keys(d);

      keys.forEach(function (k) {
        if (
          k === 'status' ||
          k === 'posy' ||
          k === 'posx' ||
          k === 'group' ||
          k === 'hostedEdgeId' ||
          k === 'value' ||
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
          const kVal: any = d[k];
          if (kVal && kVal !== '') {
            info = info + '<div class="prop-row"><div class="prop-name">' + k + ':</div><div class="prop-val">' + kVal.length + '</div></div>';
          }
        } else {
          if (isAnObject(d[k])) {
            const kVal: any = d[k];
            if (kVal && kVal !== '') {
              info = info + '<div class="prop-row"><div class="prop-name">' + k + ':</div><div class="prop-val">' + kVal.name + '</div></div>';
            }
          } else if (d[k] instanceof Array) {
            info =
              info +
              '<div class="prop-row"><div class="prop-name">' +
              k +
              ':</div><div class="prop-val">' +
              d[k].join('<br> &nbsp;&nbsp; &nbsp;&nbsp;') +
              '</div></div>';
          } else {
            const vo = d[k];
            if (vo && vo !== '') {
              info =
                info +
                '<div class="prop-row"><div class="prop-name">' +
                k +
                ':</div><div class="prop-val">' +
                (vo !== null || vo !== '' ? d[k] : 'N/A') +
                '</div></div>';
            }
          }
        }
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

