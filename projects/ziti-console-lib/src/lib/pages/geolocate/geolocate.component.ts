    import {Component, OnInit, OnDestroy, Inject, ViewChild, SimpleChanges, ElementRef, AfterViewInit, HostListener} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from '../../services/ziti-data.service';
import {SETTINGS_SERVICE, SettingsService} from '../../services/settings.service';
import { Subscription, fromEvent } from 'rxjs';
import { throttleTime, filter, distinctUntilChanged } from 'rxjs/operators';
import {GrowlerService} from "../../features/messaging/growler.service";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {Router, ActivatedRoute} from '@angular/router';
import {FilterObj} from '../../features/data-table/data-table-filter.service';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmComponent} from '../../features/confirm/confirm.component';
import {GeolocationService} from './services/geolocation.service';
import {MapDataService} from './services/map-data.service';
import {CircuitCalculationService} from './services/circuit-calculation.service';
import {CircuitPathBuilderService} from './services/circuit-path-builder.service';
import {CircuitFilterService} from './services/circuit-filter.service';
import {MapMarkerService} from './services/map-marker.service';
import {MapRenderingService} from './services/map-rendering.service';
import {MapStateService} from './services/map-state.service';
import L from 'leaflet';
import 'leaflet.markercluster';

import {defer} from 'lodash-es';

@Component({
  selector: 'lib-geolocate',
  templateUrl: './geolocate.component.html',
  styleUrls: ['./geolocate.component.scss'],
  standalone: false
})
export class GeolocateComponent implements OnInit, OnDestroy {
  map: any;
  identityClusterGroup: any;
  routerClusterGroup: any;
  pageTitle = 'Dashboard';
  totalIdentities = 0;
  totalServices = 0;
  totalConfigs = 0;
  totalEdgeRouters = 0;
  totalServicePolicies = 0;
  totalSessions = 0;
  showVisualizer = false;

  // DEBUG: Set to true to randomly manipulate link latency for testing color thresholds
  DEBUG_TEST_LINK_LATENCY = true;

  // Counts for entities without geolocation
  unlocatedIdentities = 0;
  unlocatedRouters = 0;
  servicesWithActiveCircuits = 0;

  // Counts for entities with geolocation
  geolocatedIdentities = 0;
  geolocatedRouters = 0;

  // Search for services with circuits
  servicesWithCircuitsSearch = '';

  // Search for unlocated identities and routers
  unlocatedIdentitiesSearch = '';
  filteredUnlocatedIdentities: any[] = [];
  unlocatedRoutersSearch = '';
  filteredUnlocatedRouters: any[] = [];

  // Pagination and search for entity lists
  entityListSearch = '';
  entityListPage = 1;
  entityListPageSize = 20;
  entityListTotal = 0;
  filteredEntityList: any[] = [];
  fullEntityList: any[] = [];
  entityListType: string = '';
  entityListSortColumn: string = '';
  entityListSortDirection: 'asc' | 'desc' = 'desc';
  entityListLocationFilter: 'all' | 'located' | 'unlocated' = 'located';

  // Note: Marker, rendering, and location properties moved to MapMarkerService, MapRenderingService, and MapStateService

  // Drag and drop state
  private draggedEntity: any = null;
  private draggedEntityType: string = '';

  // Data caches
  circuits: any[] = [];
  terminators: any[] = [];
  identities: any[] = [];
  edgeRouters: any[] = [];
  services: any[] = [];
  links: any[] = [];

  // Note: Visibility toggles, side panel state, and selected circuit state moved to MapStateService

  // Entity list preview in split view
  entityListPreview: any = null; // Preview data for split view
  entityListPreviewType: 'identity' | 'routers' | 'services' | null = null;
  selectedRouterInPath: string | null = null; // Track the selected router in circuit path
  circuitPreviewEntity: any = null; // Preview entity in circuit panel
  circuitPreviewEntityType: string = ''; // Type of preview entity (identity/routers)

  // Entity preview in unlocated panel
  unlocatedPreviewEntity: any = null;
  unlocatedPreviewType: string = '';
  unlocatedPreviewHasUnsavedLocation: boolean = false;
  unlocatedPreviewCircuits: any[] = [];

  // Side panel resizing (width moved to MapStateService)
  isResizing = false;
  minPanelWidth = 20; // minimum width in rem
  maxPanelWidth = 60; // maximum width in rem
  startX = 0;
  startWidth = 0;

  // Note: circuitMarkerIds moved to MapMarkerService

  // Service and identity filters (multi-select)
  selectedServiceFilters: any[] = [];
  selectedIdentityFilters: any[] = [];

  serviceRoleAttributes: any[] = [];
  serviceNamedAttributes: any[] = [];
  servicesNameIdMap: { [key: string]: string } = {};
  servicesIdNameMap: { [key: string]: string } = {};

  identityRoleAttributes: any[] = [];
  identityNamedAttributes: any[] = [];
  identitiesNameIdMap: { [key: string]: string } = {};
  identitiesIdNameMap: { [key: string]: string } = {};

  routerRoleAttributes: any[] = [];

  // Note: Filter state properties (selectedServiceAttributes, selectedIdentityAttributes, etc.)
  // and dropdown visibility moved to MapStateService

  private subscription = new Subscription();
  private documentClickHandler = this.handleDocumentClick.bind(this);

  edgeRoutersInit = false;
  identitiesInit = false;
  isLoading = false;

  // Expose Math to template
  Math = Math;

  dialogRef: any;

  constructor(
    @Inject(ZITI_DATA_SERVICE) private zitiDataService: ZitiDataService,
    @Inject(SETTINGS_SERVICE) private settingsService: SettingsService,
    private router: Router,
    private route: ActivatedRoute,
    private growlerService: GrowlerService,
    private dialogForm: MatDialog,
    private geolocationService: GeolocationService,
    private mapDataService: MapDataService,
    private circuitCalculationService: CircuitCalculationService,
    private circuitPathBuilderService: CircuitPathBuilderService,
    private circuitFilterService: CircuitFilterService,
    public mapMarkerService: MapMarkerService,
    public mapRenderingService: MapRenderingService,
    public mapStateService: MapStateService
  ) {}

  // Template getters/setters for two-way binding - delegates to mapStateService
  get selectedRouterAttributes(): any[] { return this.mapStateService.selectedRouterAttributes; }
  set selectedRouterAttributes(value: any[]) { this.mapStateService.selectedRouterAttributes = value; }

  get selectedIdentityAttributes(): any[] { return this.mapStateService.selectedIdentityAttributes; }
  set selectedIdentityAttributes(value: any[]) { this.mapStateService.selectedIdentityAttributes = value; }

  get selectedIdentityNamedAttributes(): any[] { return this.mapStateService.selectedIdentityNamedAttributes; }
  set selectedIdentityNamedAttributes(value: any[]) { this.mapStateService.selectedIdentityNamedAttributes = value; }

  get selectedServiceAttributes(): any[] { return this.mapStateService.selectedServiceAttributes; }
  set selectedServiceAttributes(value: any[]) { this.mapStateService.selectedServiceAttributes = value; }

  get selectedServiceNamedAttributes(): any[] { return this.mapStateService.selectedServiceNamedAttributes; }
  set selectedServiceNamedAttributes(value: any[]) { this.mapStateService.selectedServiceNamedAttributes = value; }

  get selectedConnectionStatus(): string { return this.mapStateService.selectedConnectionStatus; }
  set selectedConnectionStatus(value: string) { this.mapStateService.selectedConnectionStatus = value; }

  get filtersApplied(): boolean { return this.mapStateService.filtersApplied; }
  set filtersApplied(value: boolean) { this.mapStateService.filtersApplied = value; }

  get showConnectionStatusFilterSelector(): boolean { return this.mapStateService.showConnectionStatusFilterSelector; }
  set showConnectionStatusFilterSelector(value: boolean) { this.mapStateService.showConnectionStatusFilterSelector = value; }

  get sidePanelOpen(): boolean { return this.mapStateService.sidePanelOpen; }
  set sidePanelOpen(value: boolean) { this.mapStateService.sidePanelOpen = value; }

  get sidePanelType() { return this.mapStateService.sidePanelType; }
  set sidePanelType(value: any) { this.mapStateService.sidePanelType = value; }

  get sidePanelData() { return this.mapStateService.sidePanelData; }
  set sidePanelData(value: any) { this.mapStateService.sidePanelData = value; }

  get sidePanelCircuits() { return this.mapStateService.sidePanelCircuits; }
  set sidePanelCircuits(value: any[]) { this.mapStateService.sidePanelCircuits = value; }

  get routersVisible(): boolean { return this.mapStateService.routersVisible; }
  set routersVisible(value: boolean) { this.mapStateService.routersVisible = value; }

  get identitiesVisible(): boolean { return this.mapStateService.identitiesVisible; }
  set identitiesVisible(value: boolean) { this.mapStateService.identitiesVisible = value; }

  get linksVisible(): boolean { return this.mapStateService.linksVisible; }
  set linksVisible(value: boolean) { this.mapStateService.linksVisible = value; }

  get activeCircuitsVisible(): boolean { return this.mapStateService.activeCircuitsVisible; }
  set activeCircuitsVisible(value: boolean) { this.mapStateService.activeCircuitsVisible = value; }

  get clusteringEnabled(): boolean { return this.mapStateService.clusteringEnabled; }
  set clusteringEnabled(value: boolean) { this.mapStateService.clusteringEnabled = value; }

  get selectedCircuit() { return this.mapStateService.selectedCircuit; }
  set selectedCircuit(value: any) { this.mapStateService.selectedCircuit = value; }

  get selectedCircuitRouters() { return this.mapStateService.selectedCircuitRouters; }
  set selectedCircuitRouters(value: any[]) { this.mapStateService.selectedCircuitRouters = value; }

  get selectedCircuitSegment() { return this.mapStateService.selectedCircuitSegment; }
  set selectedCircuitSegment(value: any) { this.mapStateService.selectedCircuitSegment = value; }

  get selectedUnlocatedCircuit() { return this.mapStateService.selectedUnlocatedCircuit; }
  set selectedUnlocatedCircuit(value: any) { this.mapStateService.selectedUnlocatedCircuit = value; }

  get selectedUnlocatedCircuitRouters() { return this.mapStateService.selectedUnlocatedCircuitRouters; }
  set selectedUnlocatedCircuitRouters(value: any[]) { this.mapStateService.selectedUnlocatedCircuitRouters = value; }

  @ViewChild('routerFilterSelector') routerFilterSelector: any;
  @ViewChild('identityFilterSelector') identityFilterSelector: any;
  @ViewChild('serviceFilterSelector') serviceFilterSelector: any;
  @ViewChild('connectionStatusFilterSelector') connectionStatusFilterSelector: ElementRef;

  ngOnInit(): void {
    // Subscribe to marker service events
    this.subscription.add(
      this.mapMarkerService.markerClicked.subscribe(data => {
        // If entity list panel is open with a preview, update the preview instead of switching panels
        if (this.mapStateService.sidePanelType === 'entityList' && this.entityListPreview?.item?.id === data.item.id) {
          // Update the existing preview with new location (in case marker was dragged)
          this.entityListPreview = {
            ...this.entityListPreview,
            location: data.location
          };
        } else {
          // Otherwise, open marker panel as usual
          this.openSidePanel('marker', data);
        }
      })
    );

    this.subscription.add(
      this.mapMarkerService.geolocationRemoved.subscribe(({ item, type, marker }) => {
        this.handleGeolocationRemoval(item, type, marker);
      })
    );

    this.subscription.add(
      this.mapMarkerService.geolocationUpdated.subscribe(({ item, lat, lng, type }) => {
        this.updateGeolocationLocal(item, lat, lng, type);

        // If entity list panel is showing a preview of this entity, update the location
        if (this.mapStateService.sidePanelType === 'entityList' && this.entityListPreview?.item?.id === item.id) {
          const location = type === 'identity'
            ? this.mapStateService.identityLocations.get(item.id)
            : this.mapStateService.routerLocations.get(item.id);

          this.entityListPreview = {
            ...this.entityListPreview,
            location: location
          };
        }
      })
    );

    // Subscribe to rendering service events
    this.subscription.add(
      this.mapRenderingService.linkClicked.subscribe(data => {
        this.openSidePanel('link', data);
      })
    );

    this.subscription.add(
      this.mapRenderingService.circuitSegmentClicked.subscribe(data => {
        this.openSidePanel('circuit', data);
      })
    );

    // Subscribe to settings changes to detect re-authentication
    // When user re-authenticates after timeout, reload map data
    this.subscription.add(
      this.settingsService.settingsChange.pipe(
        filter((settings: any) => !!settings?.session?.id),
        distinctUntilChanged((prev: any, curr: any) => prev?.session?.id === curr?.session?.id)
      ).subscribe((settings: any) => {
        // Session ID changed - user has re-authenticated
        // Reload map data to get latest information
        if (this.map) {
          this.isLoading = true;
          const attributesPromise = this.getRoleAttributest();
          const summaryPromise = this.loadEntityCounts();
          const mapPromise = this.loadMapData();
          Promise.all([attributesPromise, summaryPromise, mapPromise]).finally(() => {
            this.isLoading = false;
          });
        }
      })
    );

    const attributesPromise = this.getRoleAttributest();
    this.getIdentityNamedAttributes(); // Initialize identity names for filtering
    this.getServiceNamedAttributes(); // Initialize service names for filtering

    // Only initialize map if it doesn't already exist
    if (!this.map) {
      this.map = L.map('MainMap', {
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        minZoom: 2,
        crossOrigin: true,
        // Add tile loading optimizations
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2
      }).addTo(this.map);

      L.control.attribution({
        position: 'bottomleft'
      }).addTo(this.map);

      this.map.setView(new L.LatLng(41.850033, -87.6500523), 4);

      // Map click handler to clear marker selection when clicking on the map (not on a marker)
      this.map.on('click', (e: any) => {
        // Clear selected marker if one is selected
        this.mapMarkerService.clearSelectedMarker(this.identityClusterGroup, this.routerClusterGroup);
      });

      // Add map click handler to disable dragging when clicking outside markers
      this.map.on('click', (event: any) => {
        // Check if we clicked on a marker or on the map itself
        // If currentDraggableMarker exists and we're not clicking on it, disable dragging
        this.mapMarkerService.disableCurrentDraggableMarker();
      });

      // Initialize separate marker cluster groups for identities and routers
      if ((L as any).markerClusterGroup) {
        // Identity cluster group
        this.identityClusterGroup = (L as any).markerClusterGroup({
          maxClusterRadius: 80,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count >= 100) size = 'large';
            else if (count >= 10) size = 'medium';

            return L.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: `marker-cluster marker-cluster-identity marker-cluster-${size}`,
              iconSize: L.point(40, 40)
            });
          }
        });

        this.map.addLayer(this.identityClusterGroup);

        // Router cluster group
        this.routerClusterGroup = (L as any).markerClusterGroup({
          maxClusterRadius: 80,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count >= 100) size = 'large';
            else if (count >= 10) size = 'medium';

            return L.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: `marker-cluster marker-cluster-router marker-cluster-${size}`,
              iconSize: L.point(40, 40)
            });
          }
        });

        this.map.addLayer(this.routerClusterGroup);
      }
    }

    // Click handler to close dropdowns when clicking outside (only add once)
    if (!this.documentClickHandler) {
      document.addEventListener('click', this.documentClickHandler);
    }

    // Throttled mousemove handler for side panel resizing (only add once)
    if (this.subscription.closed) {
      this.subscription.add(
        fromEvent<MouseEvent>(document, 'mousemove')
          .pipe(throttleTime(16)) // ~60fps
          .subscribe(event => this.onMouseMove(event))
      );
    }

    this.isLoading = true;
    const summaryPromise = this.loadEntityCounts();
    const mapPromise = this.loadMapData();
    Promise.all([attributesPromise, summaryPromise, mapPromise]).then(() => {
    }).finally(() => {
      this.isLoading = false;
    });
    this.checkVisualizerFeature();
  }

  getRoleAttributest() {
    const serviceRolesPromise = this.getServiceRoleAttributes().then((result) => {
      this.serviceRoleAttributes = result.data;
    });
    const identityRolesPromise = this.getIdentityRoleAttributes().then((result) => {
      this.identityRoleAttributes = result.data;
    });
    const routerRolesPromise = this.getRouterRoleAttributes().then((result) => {
      this.routerRoleAttributes = result.data;
    });
    return Promise.all([routerRolesPromise, identityRolesPromise, serviceRolesPromise]);
  }

  public getRouterRoleAttributes() {
    return this.zitiDataService.get('edge-router-role-attributes', {}, []);
  }

  public getIdentityRoleAttributes() {
    return this.zitiDataService.get('identity-role-attributes', {}, []);
  }

  public getServiceRoleAttributes() {
    return this.zitiDataService.get('service-role-attributes', {}, []);
  }

  loadEntityCounts() {
    this.isLoading = true;
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    const summaryPromise = this.zitiDataService.get('summary', paging, []);

    return summaryPromise.then((result: any) => {
      const data = result?.data || [];
      this.totalIdentities = data['identities'];
      this.totalEdgeRouters = data['routers.edge'];
      this.totalServices = data['services'];
      this.totalConfigs = data['configs'];
      this.totalServicePolicies = data['servicePolicies'];
      this.totalSessions = data['sessions'];
    }).finally(() => {
      this.isLoading = false;
    });
  }

  loadMapData() {
    this.mapMarkerService.identityMarkers = [];
    this.mapMarkerService.routerMarkers = [];

    const edgeRoutersPromise = this.loadRouters();
    const identitiesPromise = this.loadIdentities();
    const servicesPromise = this.loadServices();
    return Promise.all([edgeRoutersPromise, identitiesPromise, servicesPromise]).then((results) => {
      this.edgeRoutersInit = true;
      const edgeRouters = results[0].data || [];
      this.edgeRouters = edgeRouters;

      // Combine and deduplicate by ID
      const routerMap = new Map();
      [...edgeRouters].forEach(router => {
        if (router.id && !routerMap.has(router.id)) {
          routerMap.set(router.id, router);
        }
      });
      const uniqueRouters = Array.from(routerMap.values());

      // Calculate unlocated routers count
      this.unlocatedRouters = uniqueRouters.filter(router => !router.tags?.geolocation).length;
      this.geolocatedRouters = uniqueRouters.filter(router => router.tags?.geolocation).length;

      this.mapMarkerService.addMarkers(
        uniqueRouters,
        'routers',
        this.routerClusterGroup,
        this.map,
        this.mapStateService.routerLocations,
        this.mapStateService.identityLocations
      );

      // Load links, circuits and terminators after routers are loaded and their locations are stored
      this.loadLinks();
      this.loadCircuits();
      this.loadTerminators();
    });
  }

  loadRouters() {
    // Fetch routers using the service
    return this.mapDataService.fetchRouters()
      .then(({ routers, routerTypes }) => {
        // Update state service's router types map
        this.mapStateService.setRouterTypes(routerTypes);

        // Apply role attribute filtering
        let routersToDisplay = routers;
        if (this.mapStateService.selectedRouterAttributes.length > 0) {
          routersToDisplay = routers.filter((router: any) => {
            const routerRoles = router.roleAttributes || [];
            return this.mapStateService.selectedRouterAttributes.some(selectedAttr =>
              routerRoles.includes(selectedAttr)
            );
          });
        }

        // Apply connection status filter
        if (this.mapStateService.selectedConnectionStatus === 'online') {
          routersToDisplay = routersToDisplay.filter((router: any) => router.isOnline === true);
        } else if (this.mapStateService.selectedConnectionStatus === 'offline') {
          routersToDisplay = routersToDisplay.filter((router: any) => router.isOnline === false);
        }

        return { data: routersToDisplay };
      });
  }

  loadIdentities() {
    // Build filters for API call
    let identityFilters: any = [];
    if (this.mapStateService.selectedIdentityAttributes.length > 0) {
      // Build filter like: roleAttributes contains "attr1" or roleAttributes contains "attr2"
      const searchFilter = {
        columnId: 'roleAttributes',
        value: this.mapStateService.selectedIdentityAttributes,
        filterName: 'Identity Attributes',
        type: 'ATTRIBUTE'
      };
      identityFilters.push(searchFilter);
    }
    if (this.mapStateService.selectedIdentityNamedAttributes.length > 0) {
      // Convert identity names to IDs for filtering
      const identityIds = this.mapStateService.selectedIdentityNamedAttributes
        .map(name => this.identitiesNameIdMap[name])
        .filter(id => id); // Filter out any undefined values

      if (identityIds.length > 0) {
        const namedFilter = {
          columnId: 'id',
          value: identityIds,
          filterName: 'Identity Id',
          type: 'TEXTINPUT',
          verb: '='
        };
        identityFilters.push(namedFilter);
      }
    }

    // Fetch identities using the service
    return this.mapDataService.fetchIdentities(identityFilters).then((allIdentities) => {
      this.identitiesInit = true;

      // Apply connection status filter
      if (this.mapStateService.selectedConnectionStatus === 'online') {
        allIdentities = allIdentities.filter((identity: any) => identity.edgeRouterConnectionStatus === 'online');
      } else if (this.mapStateService.selectedConnectionStatus === 'offline') {
        allIdentities = allIdentities.filter((identity: any) => identity.edgeRouterConnectionStatus !== 'online');
      }

      this.identities = allIdentities;

      // Calculate unlocated identities count (exclude Router-type identities)
      this.unlocatedIdentities = this.identities.filter(identity => identity.typeId !== 'Router' && !identity.tags?.geolocation).length;
      this.geolocatedIdentities = this.identities.filter(identity => identity.typeId !== 'Router' && identity.tags?.geolocation).length;

      this.mapMarkerService.addMarkers(
        this.identities,
        'identity',
        this.identityClusterGroup,
        this.map,
        this.mapStateService.routerLocations,
        this.mapStateService.identityLocations
      );
    });
  }

  loadServices() {
    // Build filters for API call
    let serviceFilters: any = [];
    if (this.mapStateService.selectedServiceAttributes.length > 0) {
      // Build filter like: roleAttributes contains "attr1" or roleAttributes contains "attr2"
      const searchFilter = {
        columnId: 'roleAttributes',
        value: this.mapStateService.selectedServiceAttributes,
        filterName: 'Service Attributes',
        type: 'ATTRIBUTE'
      };
      serviceFilters.push(searchFilter);
    }
    if (this.mapStateService.selectedServiceNamedAttributes.length > 0) {
      // Convert service names to IDs for filtering
      const serviceIds = this.mapStateService.selectedServiceNamedAttributes
        .map(name => this.servicesNameIdMap[name])
        .filter(id => id); // Filter out any undefined values

      if (serviceIds.length > 0) {
        const namedFilter = {
          columnId: 'id',
          value: serviceIds,
          filterName: 'Service Id',
          type: 'TEXTINPUT',
          verb: '='
        };
        serviceFilters.push(namedFilter);
      }
    }

    // Fetch services using the service
    return this.mapDataService.fetchServices(serviceFilters).then((services) => {
      this.services = services;
    });
  }

  // Wrapper method - delegates to MapMarkerService with additional bounds fitting logic
  addMarkers(data: any[], type: string, skipAutoFit: boolean = false) {
    const clusterGroup = type === 'identity' ? this.identityClusterGroup : this.routerClusterGroup;

    const markers = this.mapMarkerService.addMarkers(
      data,
      type,
      clusterGroup,
      this.map,
      this.mapStateService.routerLocations,
      this.mapStateService.identityLocations
    );

    // Fit bounds to show all markers after both routers and identities are loaded
    // Skip if explicitly requested (e.g., during drag-and-drop operations)
    if (!skipAutoFit && this.edgeRoutersInit && this.identitiesInit && markers.length > 0) {
      if (this.identityClusterGroup && this.routerClusterGroup) {
        const allMarkers = [...this.mapMarkerService.identityMarkers, ...this.mapMarkerService.routerMarkers];
        if (allMarkers.length > 0) {
          const group = L.featureGroup(allMarkers);
          // Set maxZoom to 10 increments less than the map's maximum to prevent zooming in too far
          // Users can still manually zoom in further if needed
          const mapMaxZoom = this.map.getMaxZoom();
          const autoZoomMax = Math.max(1, mapMaxZoom - 10);
          this.map.fitBounds(group.getBounds(), { maxZoom: autoZoomMax });
        }
      }
    }
  }

  loadLinks() {
    this.mapDataService.fetchLinks().then((links) => {
      // DEBUG: Randomly manipulate link latency for testing
      if (this.DEBUG_TEST_LINK_LATENCY) {
        links = links.map(link => {
          // 50% chance of excellent latency (green - under 50ms)
          // 30% chance of elevated latency (yellow - 50-100ms)
          // 20% chance of problematic latency (red - over 100ms)
          const random = Math.random();
          let testLatencyMs;

          if (random < 0.5) {
            // Excellent latency: 10-50ms
            testLatencyMs = 10 + Math.random() * 40;
          } else if (random < 0.8) {
            // Elevated latency: 50-100ms
            testLatencyMs = 50 + Math.random() * 50;
          } else {
            // Problematic latency: 100-300ms
            testLatencyMs = 100 + Math.random() * 200;
          }

          // Convert milliseconds to nanoseconds
          const testLatencyNs = Math.floor(testLatencyMs * 1000000);

          return {
            ...link,
            sourceLatency: testLatencyNs,
            destLatency: testLatencyNs
          };
        });
      }

      this.links = links;
      // Links will be drawn when data is ready or when filters change
      if (this.mapStateService.selectedServiceAttributes.length === 0 &&
          this.mapStateService.selectedServiceNamedAttributes.length === 0 &&
          this.mapStateService.selectedIdentityAttributes.length === 0 &&
          this.mapStateService.selectedIdentityNamedAttributes.length === 0 &&
          this.mapStateService.selectedRouterAttributes.length === 0) {
        this.drawLinks(this.links);
      }
    });
  }

  loadCircuits() {
    this.mapDataService.fetchCircuits().then((circuits) => {
      this.circuits = circuits;

      // Calculate count of services with active circuits using the service
      this.servicesWithActiveCircuits = this.circuitCalculationService.calculateServicesWithActiveCircuits(this.circuits);

      // Draw circuits if no filters are active AND circuits are visible
      if (this.mapStateService.selectedServiceAttributes.length === 0 &&
          this.mapStateService.selectedServiceNamedAttributes.length === 0 &&
          this.mapStateService.selectedIdentityAttributes.length === 0 &&
          this.mapStateService.selectedIdentityNamedAttributes.length === 0 &&
          this.mapStateService.selectedRouterAttributes.length === 0 &&
          this.mapStateService.activeCircuitsVisible) {
        this.drawActiveCircuits(this.circuits);
      }
    });
  }

  loadTerminators() {
    this.mapDataService.fetchTerminators().then((terminators) => {
      this.terminators = terminators;

      // Redraw active circuits now that we have terminators to find hosting identities
      // Only draw if circuits are visible
      if (this.circuits.length > 0 && this.mapStateService.activeCircuitsVisible) {
        this.drawActiveCircuits(this.circuits);
      }
    });
  }

  // Wrapper method - delegates to MapRenderingService
  drawLinks(links: any[]) {
    this.mapRenderingService.drawLinks(
      this.map,
      links,
      this.mapStateService.routerLocations,
      this.edgeRouters,
      this.mapStateService.linksVisible
    );
  }

  toggleClustering() {
    this.mapStateService.toggleClustering();

    if (this.mapStateService.clusteringEnabled) {
      // Enable clustering - add markers to cluster groups (only if visible)
      if (this.mapStateService.identitiesVisible) {
        this.mapMarkerService.identityMarkers.forEach(marker => {
          this.map.removeLayer(marker);
          if (this.identityClusterGroup) {
            this.identityClusterGroup.addLayer(marker);
          }
        });
      }
      if (this.mapStateService.routersVisible) {
        this.mapMarkerService.routerMarkers.forEach(marker => {
          this.map.removeLayer(marker);
          if (this.routerClusterGroup) {
            this.routerClusterGroup.addLayer(marker);
          }
        });
      }
    } else {
      // Disable clustering - add markers directly to map (only if visible)
      if (this.mapStateService.identitiesVisible) {
        this.mapMarkerService.identityMarkers.forEach(marker => {
          if (this.identityClusterGroup) {
            this.identityClusterGroup.removeLayer(marker);
          }
          marker.addTo(this.map);
        });
      }
      if (this.mapStateService.routersVisible) {
        this.mapMarkerService.routerMarkers.forEach(marker => {
          if (this.routerClusterGroup) {
            this.routerClusterGroup.removeLayer(marker);
          }
          marker.addTo(this.map);
        });
      }
    }
  }

  checkLinks() {
    this.mapRenderingService.updateLinksVisibility(this.map, this.mapStateService.linksVisible);
  }

  toggleLinks() {
    this.mapStateService.toggleLinks();
    this.checkLinks();
  }

  checkVisualizerFeature() {
    const urlParams = new URLSearchParams(window.location.search);
    this.showVisualizer = urlParams.get('feature') === 'visualizer';
  }

  // Service filter methods
  disableMapScroll() {
    if (this.map) {
      this.map.scrollWheelZoom.disable();
      this.map.dragging.disable();
    }
  }

  enableMapScroll() {
    if (this.map) {
      this.map.scrollWheelZoom.enable();
      this.map.dragging.enable();
    }
  }

  getFilteredIdentityIds(): Set<string> {
    return this.circuitFilterService.getFilteredIdentityIds(
      this.identities,
      this.circuits,
      this.terminators,
      this.selectedServiceFilters,
      this.selectedIdentityFilters
    );
  }

  getFilteredRouterIds(): Set<string> {
    return this.circuitFilterService.getFilteredRouterIds(
      this.identities,
      this.circuits,
      this.terminators,
      this.mapStateService.routerLocations,
      this.selectedServiceFilters,
      this.selectedIdentityFilters
    );
  }

  applyFilters() {
    const hasFilters = this.selectedServiceFilters.length > 0 || this.selectedIdentityFilters.length > 0;

    if (!hasFilters) {
      // No filters active - show all markers and links
      this.showAllMarkers();
      this.drawLinks(this.links);
      return;
    }

    const filteredIdentityIds = this.getFilteredIdentityIds();
    const filteredRouterIds = this.getFilteredRouterIds();

    // Clear all markers from cluster groups
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }

    // Re-add only filtered markers
    this.mapMarkerService.identityMarkers.forEach((marker: any) => {
      const identityId = this.getMarkerIdentityId(marker);
      if (identityId && filteredIdentityIds.has(identityId)) {
        if (this.mapStateService.clusteringEnabled && this.identityClusterGroup) {
          this.identityClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    this.mapMarkerService.routerMarkers.forEach((marker: any) => {
      const routerId = this.getMarkerRouterId(marker);
      if (routerId && filteredRouterIds.has(routerId)) {
        if (this.mapStateService.clusteringEnabled && this.routerClusterGroup) {
          this.routerClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    // Redraw circuit lines with filters (remove existing first)
    this.mapRenderingService.circuitLines.forEach(line => {
      this.map.removeLayer(line);
    });
    this.mapRenderingService.circuitLines = [];

    // Redraw filtered links
    this.drawFilteredLinks(filteredRouterIds);

    // Redraw active circuits with filters only if visible or a circuit is selected
    if (this.mapStateService.activeCircuitsVisible || this.isCircuitSelectionActive()) {
      this.drawActiveCircuits(this.circuits);
    }
  }

  showAllMarkers() {
    // Clear cluster groups
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }

    // Add all identity markers
    this.mapMarkerService.identityMarkers.forEach((marker: any) => {
      if (this.mapStateService.clusteringEnabled && this.identityClusterGroup) {
        this.identityClusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }
    });

    // Add all router markers
    this.mapMarkerService.routerMarkers.forEach((marker: any) => {
      if (this.mapStateService.clusteringEnabled && this.routerClusterGroup) {
        this.routerClusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }
    });

    // Redraw all circuits and links when no filters are active
    if (this.mapStateService.activeCircuitsVisible || this.isCircuitSelectionActive()) {
      this.drawActiveCircuits(this.circuits);
    }
  }

  // Wrapper method - delegates to MapRenderingService
  drawFilteredLinks(filteredRouterIds: Set<string>) {
    this.mapRenderingService.drawFilteredLinks(
      this.map,
      this.links,
      filteredRouterIds,
      this.mapStateService.routerLocations,
      this.mapStateService.linksVisible
    );
  }

  // Wrapper method - delegates to MapRenderingService with circuit marker management
  drawActiveCircuits(circuits: any[], isSelectedCircuit: boolean = false) {
    const newCircuitMarkerIds = this.mapRenderingService.drawActiveCircuits(
      this.map,
      circuits,
      this.identities,
      this.mapStateService.identityLocations,
      this.mapStateService.routerLocations,
      this.terminators,
      this.edgeRouters,
      this.services,
      this.mapStateService.selectedServiceAttributes,
      this.mapStateService.selectedServiceNamedAttributes,
      this.mapStateService.selectedCircuitSegment,
      this.mapStateService.activeCircuitsVisible,
      this.mapStateService.isCircuitSelectionActive(),
      (scaleUp: boolean) => this.scaleCircuitMarkers(scaleUp)
    );

    // Update circuit marker IDs and scale up markers only if a specific circuit is selected
    // Don't scale markers when showing all circuits
    if (this.mapStateService.isCircuitSelectionActive()) {
      this.mapMarkerService.circuitMarkerIds = newCircuitMarkerIds;
      this.scaleCircuitMarkers(true);
    } else {
      // When showing all circuits, keep markers at default size
      this.mapMarkerService.circuitMarkerIds.clear();
    }
  }

  // Helper function to scale markers that are part of active circuits
  // Wrapper method - delegates to MapMarkerService
  scaleCircuitMarkers(scaleUp: boolean): void {
    this.mapMarkerService.scaleCircuitMarkers(scaleUp, this.identityClusterGroup, this.routerClusterGroup);
  }

  // Wrapper method - delegates to MapMarkerService
  applyMarkerOpacity(selectedMarker: any, opacity: number = 0.7): void {
    this.mapMarkerService.applyMarkerOpacity(selectedMarker, opacity, this.identityClusterGroup, this.routerClusterGroup);
  }

  // Wrapper method - delegates to MapMarkerService
  resetMarkerOpacity(): void {
    this.mapMarkerService.resetMarkerOpacity(this.identityClusterGroup, this.routerClusterGroup);
  }

  toggleActiveCircuits() {
    // If a circuit is selected, clear the selection first
    if (this.isCircuitSelectionActive()) {
      this.mapStateService.selectedCircuit = null;
      this.mapStateService.selectedCircuitRouters = [];
      this.mapStateService.selectedUnlocatedCircuit = null;
      this.mapStateService.selectedUnlocatedCircuitRouters = [];
      this.clearActiveCircuits();
    }

    this.mapStateService.activeCircuitsVisible = !this.mapStateService.activeCircuitsVisible;

    if (this.mapStateService.activeCircuitsVisible) {
      // Show all circuits (not selected)
      this.drawActiveCircuits(this.circuits, false);
    } else {
      // Hide all circuits
      this.mapRenderingService.activeCircuitLines.forEach(line => {
        this.map.removeLayer(line);
      });
    }
  }

  toggleRouters() {
    this.mapStateService.routersVisible = !this.mapStateService.routersVisible;
    this.checkRouters();
  }

  toggleIdentities() {
    this.mapStateService.identitiesVisible = !this.mapStateService.identitiesVisible;
    this.checkIdentities();
  }

  checkRouters() {
    if (this.mapStateService.routersVisible) {
      // Show routers
      if (this.routerClusterGroup && this.mapStateService.clusteringEnabled) {
        this.routerClusterGroup.addTo(this.map);
      } else {
        this.mapMarkerService.routerMarkers.forEach(marker => marker.addTo(this.map));
      }
    } else {
      // Hide routers
      if (this.routerClusterGroup && this.mapStateService.clusteringEnabled) {
        this.map.removeLayer(this.routerClusterGroup);
      } else {
        this.mapMarkerService.routerMarkers.forEach(marker => this.map.removeLayer(marker));
      }
    }
  }

  checkIdentities() {
    if (this.mapStateService.identitiesVisible) {
      // Show identities
      if (this.identityClusterGroup && this.mapStateService.clusteringEnabled) {
        this.identityClusterGroup.addTo(this.map);
      } else {
        this.mapMarkerService.identityMarkers.forEach(marker => marker.addTo(this.map));
      }
    } else {
      // Hide identities
      if (this.identityClusterGroup && this.mapStateService.clusteringEnabled) {
        this.map.removeLayer(this.identityClusterGroup);
      } else {
        this.mapMarkerService.identityMarkers.forEach(marker => this.map.removeLayer(marker));
      }
    }
  }

  // Helper methods to get ID from marker
  getMarkerIdentityId(marker: any): string | null {
    return this.mapMarkerService.markerToIdentityId.get(marker) || null;
  }

  getMarkerRouterId(marker: any): string | null {
    return this.mapMarkerService.markerToRouterId.get(marker) || null;
  }

  showRouterFilterSelector = false;
  showRouterFilter(event?: any) {
    defer(() => {
      this.showRouterFilterSelector = true;
      defer(() => {
        this.routerFilterSelector?.search?.nativeElement?.focus();
      })
    });
  }

  closeRouterFilter(event?: any) {
    this.showRouterFilterSelector = false;
  }

  showIdentityFilterSelector = false;
  showIdentityFilter(event?: any) {
    defer(() => {
      this.showIdentityFilterSelector = true;
      defer(() => {
        this.identityFilterSelector?.search?.nativeElement?.focus();
      })
    });
  }

  closeIdentityFilter(event?: any) {
    this.showIdentityFilterSelector = false;
  }

  showServiceFilterSelector = false;
  showServiceFilter(event?: any) {
    defer(() => {
      this.showServiceFilterSelector = true;
      defer(() => {
        this.serviceFilterSelector?.search?.nativeElement?.focus();
      })
    });
  }

  closeServiceFilter(event?: any) {
    this.showServiceFilterSelector = false;
  }

  showConnectionStatusFilter(event?: any) {
    defer(() => {
      this.mapStateService.showConnectionStatusFilterSelector = true;
      defer(() => {
        this.connectionStatusFilterSelector?.nativeElement?.focus();
      })
    });
  }

  closeConnectionStatusFilter(event?: any) {
    this.mapStateService.showConnectionStatusFilterSelector = false;
  }

  onConnectionStatusChange(newStatus?: string) {
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  clearFilters(event) {
    this.mapStateService.selectedIdentityAttributes = [];
    this.mapStateService.selectedIdentityNamedAttributes = [];
    this.mapStateService.selectedRouterAttributes = [];
    this.mapStateService.selectedServiceAttributes = [];
    this.mapStateService.selectedServiceNamedAttributes = [];
    this.mapStateService.selectedConnectionStatus = 'all';
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  onRouterRoleAttributesChange(attributes: any[]) {
    this.mapStateService.selectedRouterAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  onIdentityRoleAttributesChange(attributes: any[]) {
    this.mapStateService.selectedIdentityAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  onIdentityNamedAttributesChange(attributes: any[]) {
    this.mapStateService.selectedIdentityNamedAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  getIdentityNamedAttributes(filter?: string) {
    const paging = {
      searchOn: 'name',
      filter: filter || '',
      total: 30,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    const filters: FilterObj[] = [];
    if (filter && filter.trim() !== '') {
      filters.push({
        filterName: 'name',
        columnId: 'name',
        value: filter || '%',
        label: '',
        type: 'TEXTINPUT',
      });
    }
    this.zitiDataService.get('identities', paging, filters).then((result) => {
      const namedAttributes = result.data.map((identity: any) => {
        this.identitiesNameIdMap[identity.name] = identity.id;
        this.identitiesIdNameMap[identity.id] = identity.name;
        return identity.name;
      });
      this.identityNamedAttributes = namedAttributes;
    });
  }

  onServiceRoleAttributesChange(attributes: any[]) {
    this.mapStateService.selectedServiceAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  onServiceNamedAttributesChange(attributes: any[]) {
    this.mapStateService.selectedServiceNamedAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  getServiceNamedAttributes(filter?: string) {
    const paging = {
      searchOn: 'name',
      filter: filter || '',
      total: 30,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    const filters: FilterObj[] = [];
    if (filter && filter.trim() !== '') {
      filters.push({
        columnId: 'name',
        value: filter,
        filterName: '',
        label: '',
        type: 'TEXTINPUT',
      });
    }
    this.zitiDataService.get('services', paging, filters).then((result) => {
      const namedAttributes = result.data.map((service: any) => {
        this.servicesNameIdMap[service.name] = service.id;
        this.servicesIdNameMap[service.id] = service.name;
        return service.name;
      });
      this.serviceNamedAttributes = namedAttributes;
    });
  }

  checkAppliedFilters() {
    if (this.mapStateService.selectedRouterAttributes.length === 0 &&
        this.mapStateService.selectedIdentityAttributes.length === 0 &&
        this.mapStateService.selectedIdentityNamedAttributes.length === 0 &&
        this.mapStateService.selectedServiceAttributes.length === 0 &&
        this.mapStateService.selectedServiceNamedAttributes.length === 0 &&
        this.mapStateService.selectedConnectionStatus === 'all') {
      this.mapStateService.filtersApplied = false;
    } else {
      this.mapStateService.filtersApplied = true;
    }
  }

  reloadMapDataWithFilters() {
    // Save reference to ALL location data before filtering
    // This ensures circuits can reference any identity/router
    const allRouterLocations = new Map(this.mapStateService.routerLocations);
    const allIdentityLocations = new Map(this.mapStateService.identityLocations);

    // Clear existing markers and lines
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }
    this.mapRenderingService.circuitLines.forEach(line => this.map.removeLayer(line));
    this.mapRenderingService.circuitLines = [];
    this.mapRenderingService.activeCircuitLines.forEach(line => this.map.removeLayer(line));
    this.mapRenderingService.activeCircuitLines = [];

    this.mapMarkerService.identityMarkers = [];
    this.mapMarkerService.routerMarkers = [];

    // Reload data with filters
    const mapPromise = this.loadMapData();

    mapPromise.then(() => {
      // Restore ALL location data so circuits can find any router/identity
      allRouterLocations.forEach((value, key) => {
        if (!this.mapStateService.routerLocations.has(key)) {
          this.mapStateService.routerLocations.set(key, value);
        }
      });
      allIdentityLocations.forEach((value, key) => {
        if (!this.mapStateService.identityLocations.has(key)) {
          this.mapStateService.identityLocations.set(key, value);
        }
      });

      // After loading filtered identities and services, filter circuits/terminators/links
      this.filterCircuitsAndRouters();
    });
  }

  filterCircuitsAndRouters() {

    // Use the already-filtered data from backend
    const filteredIdentityIds = new Set(this.identities.map(i => i.id));
    const filteredServiceIds = new Set(this.services.map(s => s.id));
    const filteredRouterIds = new Set(this.edgeRouters.map(r => r.id));

    // If no filters active, show all
    if (this.mapStateService.selectedRouterAttributes.length === 0 &&
        this.mapStateService.selectedIdentityAttributes.length === 0 &&
        this.mapStateService.selectedIdentityNamedAttributes.length === 0 &&
        this.mapStateService.selectedServiceAttributes.length === 0 &&
        this.mapStateService.selectedServiceNamedAttributes.length === 0) {
      // Show all markers
      this.showAllMarkers();
      // Redraw all circuits and links
      if (this.circuits.length > 0 && (this.mapStateService.activeCircuitsVisible || this.isCircuitSelectionActive())) {
        this.drawActiveCircuits(this.circuits);
      }
      if (this.links.length > 0) {
        this.drawLinks(this.links);
      }
      return;
    }

    // If markers don't exist yet, create them (for all data - not just mock data)
    if (this.mapMarkerService.identityMarkers.length === 0 && this.mapMarkerService.routerMarkers.length === 0) {
      this.mapMarkerService.addMarkers(
        this.edgeRouters,
        'routers',
        this.routerClusterGroup,
        this.map,
        this.mapStateService.routerLocations,
        this.mapStateService.identityLocations
      );

      this.mapMarkerService.addMarkers(
        this.identities,
        'identity',
        this.identityClusterGroup,
        this.map,
        this.mapStateService.routerLocations,
        this.mapStateService.identityLocations
      );
    }

    // Clear markers to redraw only filtered ones
    // Remove markers from cluster groups
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }

    // Also remove any markers that were added directly to the map (when clustering is disabled)
    this.mapMarkerService.identityMarkers.forEach((marker: any) => {
      if (this.map.hasLayer(marker)) {
        this.map.removeLayer(marker);
      }
    });
    this.mapMarkerService.routerMarkers.forEach((marker: any) => {
      if (this.map.hasLayer(marker)) {
        this.map.removeLayer(marker);
      }
    });

    // Determine if filters are applied for each type
    const hasIdentityFilter = this.mapStateService.selectedIdentityAttributes.length > 0 || this.mapStateService.selectedIdentityNamedAttributes.length > 0;
    const hasRouterFilter = this.mapStateService.selectedRouterAttributes.length > 0;
    const hasServiceFilter = this.mapStateService.selectedServiceAttributes.length > 0 || this.mapStateService.selectedServiceNamedAttributes.length > 0;

    // Filter circuits to only those involving filtered identities, services, and routers
    const filteredCircuits = this.circuits.filter((circuit) => {
      // Check service match - only filter if service filter is active
      const matchesService = !hasServiceFilter || filteredServiceIds.has(circuit.service?.id);

      // Check identity match - only filter if identity filter is active
      const circuitClientId = circuit.clientId || circuit.tags?.clientId || circuit.client?.id || circuit.sourceId || circuit.initiator?.id;
      const matchesIdentity = !hasIdentityFilter || filteredIdentityIds.has(circuitClientId);

      // Check if circuit path contains any of the filtered routers - only filter if router filter is active
      let matchesRouter = !hasRouterFilter;
      if (hasRouterFilter) {
        const pathNodes = circuit.path?.nodes || circuit.path;
        if (pathNodes) {
          matchesRouter = pathNodes.some((node: any) => {
            const routerId = node.id || node.routerId || node;
            return filteredRouterIds.has(routerId);
          });
        }
      }

      return matchesService && matchesIdentity && matchesRouter;
    });

    // Get identity and router IDs to show
    const identityIdsToShow = new Set<string>();
    const routerIdsToShow = new Set<string>();

    // Handle identity filtering
    if (hasIdentityFilter) {
      // If identity filter is active, show explicitly filtered identities
      filteredIdentityIds.forEach(id => identityIdsToShow.add(id));
      // Also add identities from filtered circuits for context
      filteredCircuits.forEach((circuit) => {
        const circuitClientId = circuit.clientId || circuit.tags?.clientId || circuit.client?.id || circuit.sourceId || circuit.initiator?.id;
        const circuitHostId = circuit.tags?.hostId || circuit.host?.id || circuit.hostId;
        if (circuitClientId) identityIdsToShow.add(circuitClientId);
        if (circuitHostId) identityIdsToShow.add(circuitHostId);
      });
    } else if (hasRouterFilter || hasServiceFilter) {
      // If only router/service filters are active, extract identities from circuits
      // Use the SAME logic that draws circuit paths to determine which identities are connected

      // For each filtered circuit, build the circuit path data to extract client/host identities
      filteredCircuits.forEach(circuit => {
        const circuitPathData = this.circuitPathBuilderService.buildCircuitPathData(
          circuit,
          this.mapStateService.routerLocations,
          this.mapStateService.identityLocations,
          this.edgeRouters,
          this.identities
        );

        if (circuitPathData) {
          // Add client identity if present
          if (circuitPathData.clientId) {
            identityIdsToShow.add(circuitPathData.clientId);
          }
          // Add host identity if present
          if (circuitPathData.hostId) {
            identityIdsToShow.add(circuitPathData.hostId);
          }
        }
      });
    } else {
      // No filters active - show all identities
      this.identities.forEach(identity => identityIdsToShow.add(identity.id));
    }

    // Handle router filtering
    if (hasRouterFilter) {
      // If router filter is active, only show filtered routers
      filteredRouterIds.forEach(id => routerIdsToShow.add(id));
    } else {
      // If no router filter is active, show ALL routers
      this.edgeRouters.forEach(router => routerIdsToShow.add(router.id));
    }

    // Add hosting identities from terminators for filtered services (only if service filter is active)
    if (hasServiceFilter) {
      this.terminators.forEach(terminator => {
        const terminatorServiceId = terminator.serviceId || terminator.service?.id;
        if (filteredServiceIds.has(terminatorServiceId)) {
          const hostIdentityId = terminator.hostId || terminator.identity?.id || terminator.identityId;
          if (hostIdentityId) {
            identityIdsToShow.add(hostIdentityId);
          }
          // Only add routers from terminators if router filter is active
          if (hasRouterFilter && terminator.routerId) {
            routerIdsToShow.add(terminator.routerId);
          }
        }
      });
    }

    // Add routers from filtered circuits only if router filter is active
    if (hasRouterFilter) {
      filteredCircuits.forEach(circuit => {
        const pathNodes = circuit.path?.nodes || circuit.path;
        if (pathNodes) {
          pathNodes.forEach((node: any) => {
            const routerId = node.id || node.routerId || node;
            if (routerId) {
              routerIdsToShow.add(routerId);
            }
          });
        }
      });
    }

    // Filter and redraw identity markers
    this.mapMarkerService.identityMarkers.forEach((marker: any) => {
      const identityId = this.getMarkerIdentityId(marker);
      if (identityId && identityIdsToShow.has(identityId)) {
        if (this.mapStateService.clusteringEnabled && this.identityClusterGroup) {
          this.identityClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    // Filter and redraw router markers
    this.mapMarkerService.routerMarkers.forEach((marker: any) => {
      const routerId = this.getMarkerRouterId(marker);
      if (routerId && routerIdsToShow.has(routerId)) {
        if (this.mapStateService.clusteringEnabled && this.routerClusterGroup) {
          this.routerClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    // Clear existing circuit and link lines
    this.mapRenderingService.circuitLines.forEach(line => this.map.removeLayer(line));
    this.mapRenderingService.circuitLines = [];
    this.mapRenderingService.activeCircuitLines.forEach(line => this.map.removeLayer(line));
    this.mapRenderingService.activeCircuitLines = [];

    // Redraw filtered circuits only if circuits are visible or a circuit is selected
    if (this.mapStateService.activeCircuitsVisible || this.isCircuitSelectionActive()) {
      // Draw filtered circuits (rendering service will filter paths to only visible entities)
      this.drawActiveCircuits(filteredCircuits, false);
    }

    // Filter and redraw links
    const filteredLinks = this.links.filter(link => {
      const sourceId = link.sourceRouter?.id;
      const destId = link.destRouter?.id;
      return routerIdsToShow.has(sourceId) && routerIdsToShow.has(destId);
    });
    this.drawLinks(filteredLinks);
  }

  openSidePanel(type: 'marker' | 'link' | 'circuit' | 'unlocated' | 'entityList' | 'servicesWithCircuits', data: any) {
    // Clear previous selected marker icon and reset opacity
    if (this.mapMarkerService.selectedMarker) {
      this.updateMarkerIcon(this.mapMarkerService.selectedMarker, false);
      this.resetMarkerOpacity();
      this.mapMarkerService.selectedMarker = null;
    }

    // Clear previous circuit selection when opening a new panel (except circuit panels)
    if (type !== 'circuit') {
      this.mapStateService.selectedCircuitSegment = null;
      this.mapStateService.selectedCircuit = null;
      this.mapStateService.selectedCircuitRouters = [];
      this.mapStateService.selectedUnlocatedCircuit = null;
      this.mapStateService.selectedUnlocatedCircuitRouters = [];
    }

    // Clear entity preview panels when switching to different side panels
    this.unlocatedPreviewEntity = null;
    this.entityListPreview = null;
    this.entityListPreviewType = null;

    this.mapStateService.sidePanelType = type;
    this.mapStateService.sidePanelData = data;
    this.mapStateService.sidePanelOpen = true;

    // Handle circuit panel - track the selected segment and build hops/routers data
    if (type === 'circuit' && data?.circuit && data?.segment) {
      this.mapStateService.selectedCircuitSegment = {
        circuitId: data.circuit.id,
        segmentIndex: data.segment.index
      };

      // Use circuitHops from data if already provided (from CircuitPathBuilderService),
      // otherwise build it from pathNodes (fallback for legacy code paths)
      const circuitHops = data.circuitHops || this.buildCircuitHops(data);

      // Use circuitRouters from data if already provided (from CircuitPathBuilderService),
      // otherwise build it from pathNodes (fallback for legacy code paths)
      const circuitRouters = data.circuitRouters || this.buildCircuitRouters(data.pathNodes);

      // Add hops and routers to sidePanelData
      this.mapStateService.sidePanelData = {
        ...data,
        circuitHops,
        circuitRouters
      };

      // Redraw the circuit with the selected segment highlighted
      this.clearActiveCircuits();
      this.drawActiveCircuits([data.circuit], false);
    }

    // Load circuits for marker panel and update marker icon
    if (type === 'marker' && data?.item?.id && data?.type) {
      this.mapStateService.sidePanelCircuits = this.getEntityCircuits(data.item.id, data.type);

      // Find and mark the selected marker
      const marker = this.findMarkerByItemId(data.item.id, data.type);
      if (marker) {
        this.mapMarkerService.selectedMarker = marker;
        this.updateMarkerIcon(marker, true);
        // Apply opacity and greyscale to all other markers
        this.applyMarkerOpacity(marker);
      }
    } else {
      this.mapStateService.sidePanelCircuits = [];
      // Reset opacity for non-marker panels
      if (!this.mapMarkerService.selectedMarker) {
        this.resetMarkerOpacity();
      }
    }

    // Trigger map resize after panel opens
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  showUnlocatedEntities() {
    // Filter identities without geolocation tags (exclude Router-type identities)
    const unlocatedIdentities = this.identities.filter(identity =>
      (identity.typeId !== 'Router') && (!identity.tags?.geolocation || identity.tags.geolocation.trim() === '')
    );

    // Filter routers without geolocation tags
    const unlocatedRouters = this.edgeRouters.filter(router =>
      !router.tags?.geolocation || router.tags.geolocation.trim() === ''
    );

    // Initialize search
    this.unlocatedIdentitiesSearch = '';
    this.filteredUnlocatedIdentities = [...unlocatedIdentities];
    this.unlocatedRoutersSearch = '';
    this.filteredUnlocatedRouters = [...unlocatedRouters];

    // Open side panel with unlocated entities
    this.openSidePanel('unlocated', {
      unlocatedIdentities,
      unlocatedRouters
    });
  }

  showUnlocatedIdentities() {
    // Filter identities without geolocation tags (exclude Router-type identities)
    const unlocatedIdentities = this.identities.filter(identity =>
      (identity.typeId !== 'Router') && (!identity.tags?.geolocation || identity.tags.geolocation.trim() === '')
    );

    // Initialize search
    this.unlocatedIdentitiesSearch = '';
    this.filteredUnlocatedIdentities = [...unlocatedIdentities];
    this.unlocatedRoutersSearch = '';
    this.filteredUnlocatedRouters = [];

    // Open side panel with only unlocated identities
    this.openSidePanel('unlocated', {
      unlocatedIdentities,
      unlocatedRouters: []
    });
  }

  showUnlocatedRouters() {
    // Filter routers without geolocation tags
    const unlocatedRouters = this.edgeRouters.filter(router =>
      !router.tags?.geolocation || router.tags.geolocation.trim() === ''
    );

    // Initialize search
    this.unlocatedIdentitiesSearch = '';
    this.filteredUnlocatedIdentities = [];
    this.unlocatedRoutersSearch = '';
    this.filteredUnlocatedRouters = [...unlocatedRouters];

    // Open side panel with only unlocated routers
    this.openSidePanel('unlocated', {
      unlocatedIdentities: [],
      unlocatedRouters
    });
  }

  showServicesWithActiveCircuits() {
    // Initialize search
    this.servicesWithCircuitsSearch = '';

    // Open side panel with all circuits (will be sorted by service name in the component)
    this.openSidePanel('servicesWithCircuits', {});
  }

  onServicesWithCircuitsSearchChange(search: string) {
    this.servicesWithCircuitsSearch = search;
  }

  onUnlocatedIdentitiesSearchChange(search: string) {
    this.unlocatedIdentitiesSearch = search;
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) {
      // If search is empty, show all identities
      this.filteredUnlocatedIdentities = [...(this.mapStateService.sidePanelData?.unlocatedIdentities || [])];
    } else {
      // Filter identities by name
      this.filteredUnlocatedIdentities = (this.mapStateService.sidePanelData?.unlocatedIdentities || []).filter(identity =>
        identity.name?.toLowerCase().includes(searchLower)
      );
    }
  }

  onUnlocatedRoutersSearchChange(search: string) {
    this.unlocatedRoutersSearch = search;
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) {
      // If search is empty, show all routers
      this.filteredUnlocatedRouters = [...(this.mapStateService.sidePanelData?.unlocatedRouters || [])];
    } else {
      // Filter routers by name
      this.filteredUnlocatedRouters = (this.mapStateService.sidePanelData?.unlocatedRouters || []).filter(router =>
        router.name?.toLowerCase().includes(searchLower)
      );
    }
  }

  showLocatedIdentities() {
    // Filter out Router-type identities (they're shown as routers, not identities)
    const filteredIdentities = this.identities.filter(identity => identity.typeId !== 'Router');
    this.entityListLocationFilter = 'located'; // Default to located view
    this.initializeEntityList(filteredIdentities, 'identities');
    this.openSidePanel('entityList', { entityType: 'identities' });
  }

  showLocatedRouters() {
    this.entityListLocationFilter = 'located'; // Default to located view
    this.initializeEntityList(this.edgeRouters, 'routers');
    this.openSidePanel('entityList', { entityType: 'routers' });
  }

  showAllServices() {
    // Add active circuit count to each service
    const servicesWithCounts = this.services.map(service => {
      const circuitCount = this.circuits.filter(circuit => {
        const serviceId = circuit.service?.id || circuit.serviceId;
        return serviceId === service.id;
      }).length;

      return {
        ...service,
        activeCircuitCount: circuitCount
      };
    });

    // Set default sort to active circuits descending
    this.entityListSortColumn = 'activeCircuitCount';
    this.entityListSortDirection = 'desc';

    this.initializeEntityList(servicesWithCounts, 'services');
    this.openSidePanel('entityList', { entityType: 'services' });
  }

  initializeEntityList(entities: any[], type: string) {
    // Clear preview when switching to a different entity list type
    if (this.entityListType !== type) {
      this.closeEntityListPreview();
    }

    this.fullEntityList = [...entities];
    this.entityListType = type;
    this.entityListSearch = '';
    this.entityListPage = 1;
    this.applyEntityListFilters();
  }

  applyEntityListFilters() {
    // Apply location filter (for identities and routers only)
    let filtered = this.fullEntityList;
    if (this.entityListType === 'identities' || this.entityListType === 'routers') {
      if (this.entityListLocationFilter === 'located') {
        filtered = filtered.filter(entity => entity.tags?.geolocation);
      } else if (this.entityListLocationFilter === 'unlocated') {
        filtered = filtered.filter(entity => !entity.tags?.geolocation || entity.tags.geolocation.trim() === '');
      }
      // 'all' filter shows everything, no filtering needed
    }

    // Apply search filter
    if (this.entityListSearch.trim()) {
      const searchLower = this.entityListSearch.toLowerCase();
      filtered = filtered.filter(entity =>
        entity.name?.toLowerCase().includes(searchLower) ||
        entity.id?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (this.entityListSortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[this.entityListSortColumn];
        const bValue = b[this.entityListSortColumn];

        let comparison = 0;
        if (aValue === null || aValue === undefined) comparison = 1;
        else if (bValue === null || bValue === undefined) comparison = -1;
        else if (typeof aValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else {
          comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }

        return this.entityListSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.entityListTotal = filtered.length;

    // Apply pagination
    const startIndex = (this.entityListPage - 1) * this.entityListPageSize;
    const endIndex = startIndex + this.entityListPageSize;
    this.filteredEntityList = filtered.slice(startIndex, endIndex);
  }

  onEntityListSearchChange(search: string) {
    this.entityListSearch = search;
    this.entityListPage = 1; // Reset to first page on search
    this.applyEntityListFilters();
  }

  onEntityListPageChange(page: number) {
    this.entityListPage = page;
    this.applyEntityListFilters();
  }

  onEntityListSortChange(sort: {column: string, direction: 'asc' | 'desc'}) {
    this.entityListSortColumn = sort.column;
    this.entityListSortDirection = sort.direction;
    this.entityListPage = 1; // Reset to first page on sort
    this.applyEntityListFilters();
  }

  onEntityListLocationFilterChange(filter: 'all' | 'located' | 'unlocated') {
    this.entityListLocationFilter = filter;
    this.entityListPage = 1; // Reset to first page on filter change
    this.applyEntityListFilters();
  }

  get entityListTotalPages(): number {
    return Math.ceil(this.entityListTotal / this.entityListPageSize);
  }

  get entityListPageNumbers(): number[] {
    const total = this.entityListTotalPages;
    const current = this.entityListPage;
    const pages: number[] = [];

    // Show max 7 page numbers
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

  openEntityPreview(entity: any, type: string) {
    // Store the preview entity to display below the unlocated lists
    this.unlocatedPreviewEntity = entity;
    this.unlocatedPreviewType = type;
    // Clear unsaved flag when clicking on a row (only set by drag & drop)
    this.unlocatedPreviewHasUnsavedLocation = false;
    // Only get circuits if entity is located on the map (has geolocation)
    const hasGeolocation = entity.tags?.geolocation && entity.tags.geolocation.trim() !== '';
    this.unlocatedPreviewCircuits = hasGeolocation ? this.getEntityCircuits(entity.id, type) : [];

    // Clear selected circuit state when switching entities
    this.mapStateService.selectedUnlocatedCircuit = null;
    this.mapStateService.selectedUnlocatedCircuitRouters = [];
  }

  // Drag and drop handlers for unlocated entities
  onDragStart(event: DragEvent, entity: any, type: string): void {
    this.draggedEntity = entity;
    this.draggedEntityType = type;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', entity.name); // Required for Firefox
    }

    // Add visual feedback to the dragged row
    const target = event.target as HTMLElement;
    setTimeout(() => {
      target.classList.add('dragging');
      // Add global grabbing cursor
      document.body.classList.add('dragging-entity');
    }, 0);
  }

  onMapDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    // Add visual feedback to map container
    const mapContainer = (event.currentTarget as HTMLElement).closest('.map-container');
    if (mapContainer) {
      mapContainer.classList.add('drag-over');
    }
  }

  onMapDrop(event: DragEvent): void {
    event.preventDefault();

    // Remove visual feedback from map container
    const mapContainer = (event.currentTarget as HTMLElement).closest('.map-container');
    if (mapContainer) {
      mapContainer.classList.remove('drag-over');
    }

    // Remove global grabbing cursor
    document.body.classList.remove('dragging-entity');

    if (!this.draggedEntity) {
      return;
    }

    // Get the map container element
    const mapElement = document.getElementById('MainMap');
    if (!mapElement) {
      return;
    }

    // Get the bounds of the map container
    const rect = mapElement.getBoundingClientRect();

    // Calculate the position relative to the map container
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert pixel coordinates to lat/lng
    const point = L.point(x, y);
    const latLng = this.map.containerPointToLatLng(point);

    // Store entity info before clearing drag state
    const droppedEntity = this.draggedEntity;
    const droppedEntityType = this.draggedEntityType;

    // Update entity geolocation
    this.updateGeolocationLocal(droppedEntity, latLng.lat, latLng.lng, droppedEntityType);

    // Create marker for the newly located entity (skip auto-fit to prevent zoom out)
    this.addMarkers([droppedEntity], droppedEntityType, true);

    // Center map on the dropped location without changing zoom
    this.map.panTo(latLng);

    // Show preview and handle marker setup
    setTimeout(() => {
      // Always show preview first (regardless of whether marker is found/clustered)
      if (this.mapStateService.sidePanelType === 'unlocated' || this.mapStateService.sidePanelType === 'entityList') {
        // Set preview entity to show details in the unlocated/entity list panel
        if (this.mapStateService.sidePanelType === 'unlocated') {
          this.unlocatedPreviewEntity = droppedEntity;
          this.unlocatedPreviewType = droppedEntityType;
          this.unlocatedPreviewHasUnsavedLocation = false; // Using _unsavedLocation flag now
          this.unlocatedPreviewCircuits = this.getEntityCircuits(droppedEntity.id, droppedEntityType);
        } else if (this.mapStateService.sidePanelType === 'entityList') {
          // Update entity list preview with location
          const location = droppedEntityType === 'identity'
            ? this.mapStateService.identityLocations.get(droppedEntity.id)
            : this.mapStateService.routerLocations.get(droppedEntity.id);

          this.entityListPreview = {
            type: droppedEntityType,
            item: droppedEntity,
            location: location,
            _justDropped: true  // Flag to track freshly dropped entities
          };
        }
      } else {
        // If unlocated/entity list panel isn't open, open marker panel
        const location = droppedEntityType === 'identity'
          ? this.mapStateService.identityLocations.get(droppedEntity.id)
          : this.mapStateService.routerLocations.get(droppedEntity.id);

        if (location) {
          this.openSidePanel('marker', {
            type: droppedEntityType,
            item: droppedEntity,
            location: location
          });
        }
      }

      // Try to find and mark the newly created marker as selected
      // Note: marker might be in a cluster, so this is best-effort
      const markers = droppedEntityType === 'identity' ? this.mapMarkerService.identityMarkers : this.mapMarkerService.routerMarkers;
      const newMarker = markers.find((m: any) => m._itemData?.id === droppedEntity.id);

      if (newMarker) {
        // Mark this marker as selected
        this.mapMarkerService.selectedMarker = newMarker;
        this.updateMarkerIcon(newMarker, true);

        // Enable dragging
        newMarker.dragging.enable();
        this.mapMarkerService.currentDraggableMarker = newMarker;

        // Apply visual styling
        const markerElement = newMarker.getElement();
        if (markerElement) {
          const cssClass = droppedEntityType === 'identity' ? 'marker-draggable-active-identity' : 'marker-draggable-active-router';
          markerElement.classList.add(cssClass);
          // Ensure it's fully opaque
          markerElement.style.opacity = '1';
        }

        // Apply reduced opacity to other markers
        this.applyMarkerOpacity(newMarker);
      }

      // Refresh unlocated entities data (without reopening the panel)
      const unlocatedIdentities = this.identities.filter(identity =>
        (identity.typeId !== 'Router') && (!identity.tags?.geolocation || identity.tags.geolocation.trim() === '')
      );
      const unlocatedRouters = this.edgeRouters.filter(router =>
        !router.tags?.geolocation || router.tags.geolocation.trim() === ''
      );
      this.filteredUnlocatedIdentities = unlocatedIdentities.filter(identity =>
        identity.name?.toLowerCase().includes(this.unlocatedIdentitiesSearch.toLowerCase())
      );
      this.filteredUnlocatedRouters = unlocatedRouters.filter(router =>
        router.name?.toLowerCase().includes(this.unlocatedRoutersSearch.toLowerCase())
      );
    }, 100);

    // Clear drag state
    this.draggedEntity = null;
    this.draggedEntityType = '';
  }

  onMapDragLeave(event: DragEvent): void {
    // Remove visual feedback when drag leaves the map
    const mapContainer = (event.currentTarget as HTMLElement).closest('.map-container');
    if (mapContainer) {
      mapContainer.classList.remove('drag-over');
    }
    // Remove global grabbing cursor
    document.body.classList.remove('dragging-entity');
  }

  closeSidePanel() {
    // Clear selected marker icon and reset opacity
    if (this.mapMarkerService.selectedMarker) {
      this.updateMarkerIcon(this.mapMarkerService.selectedMarker, false);
      this.resetMarkerOpacity();
      this.mapMarkerService.selectedMarker = null;
    }

    // Clear selected circuit segment
    this.mapStateService.selectedCircuitSegment = null;

    // Clear selected router in path and circuit preview
    this.selectedRouterInPath = null;
    this.circuitPreviewEntity = null;
    this.circuitPreviewEntityType = '';

    // Clear selected circuit and restore all circuits if they were visible
    if (this.mapStateService.selectedCircuit) {
      this.mapStateService.selectedCircuit = null;
      this.mapStateService.selectedCircuitRouters = [];
      this.clearActiveCircuits();
      if (this.mapStateService.activeCircuitsVisible) {
        this.drawActiveCircuits(this.circuits, false);
      }
    }

    this.mapStateService.sidePanelOpen = false;
    this.mapStateService.sidePanelType = null;
    this.mapStateService.sidePanelData = null;

    // Trigger map resize after panel closes
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  navigateToDetails(type: string, id: string) {
    if (!id) return;

    if (type === 'identity') {
      this.router.navigateByUrl(`/identities/${id}`);
    } else if (type === 'routers') {
      this.router.navigateByUrl(`/routers/${id}`);
    } else if (type === 'services') {
      this.router.navigateByUrl(`/services/advanced/${id}`);
    }
  }

  navigateToCircuitEntity(id: string, type: string) {
    if (!id || !type) return;

    // Type could be 'identity' or 'routers'
    this.navigateToDetails(type, id);
  }

  openRouterPanel(router: any) {
    if (!router || !router.id) return;

    // Get router location
    const location = this.mapStateService.routerLocations.get(router.id);

    // Open side panel with router data
    this.openSidePanel('marker', {
      type: 'routers',
      item: router,
      location: location
    });
  }

  handleEntityListClick(entity: any) {
    if (!entity || !entity.id) return;

    if (this.entityListType === 'routers') {
      // For routers, show preview in bottom half of panel
      this.showEntityListPreview(entity, 'routers');
    } else if (this.entityListType === 'identities') {
      // For identities, show preview in bottom half of panel
      this.showEntityListPreview(entity, 'identity');
    } else if (this.entityListType === 'services') {
      // For services, show preview in bottom half of panel
      this.showEntityListPreview(entity, 'services');
    } else {
      // For other entity types, navigate to details page
      this.navigateToDetails(this.entityListType, entity.id);
    }
  }

  showEntityListPreview(entity: any, type: 'identity' | 'routers' | 'services') {
    if (!entity || !entity.id) return;

    // Get entity location (services don't have locations)
    let location = null;
    if (type === 'identity') {
      location = this.mapStateService.identityLocations.get(entity.id);
    } else if (type === 'routers') {
      location = this.mapStateService.routerLocations.get(entity.id);
    }

    // Set preview data
    this.entityListPreview = {
      type: type,
      item: entity,
      location: location
    };
    this.entityListPreviewType = type;

    // Load circuits for this entity
    this.mapStateService.sidePanelCircuits = this.getEntityCircuits(entity.id, type);

    // Clear selected circuit state when switching entities
    this.mapStateService.selectedCircuit = null;
    this.mapStateService.selectedCircuitRouters = [];
    this.mapStateService.selectedUnlocatedCircuit = null;
    this.mapStateService.selectedUnlocatedCircuitRouters = [];

    // Reset the previously selected marker if any
    if (this.mapMarkerService.selectedMarker) {
      this.updateMarkerIcon(this.mapMarkerService.selectedMarker, false);
      this.mapMarkerService.selectedMarker = null;
    }

    // Reset opacity for all markers first
    this.resetMarkerOpacity();

    // Find and mark the selected marker (services don't have markers)
    if (type !== 'services') {
      const marker = this.findMarkerByItemId(entity.id, type);
      if (marker) {
        this.mapMarkerService.selectedMarker = marker;
        this.updateMarkerIcon(marker, true);

        // Ensure selected marker has full opacity
        const element = marker.getElement();
        if (element) {
          element.style.opacity = '1';
        }

        // Apply reduced opacity to all other markers
        this.applyMarkerOpacity(marker);

        // Expand cluster and zoom to show the marker if clustering is enabled
        const clusterGroup = type === 'identity' ? this.identityClusterGroup : this.routerClusterGroup;
        if (clusterGroup && this.mapStateService.clusteringEnabled) {
          // zoomToShowLayer zooms to the parent cluster bounds and spiderfies if still clustered
          clusterGroup.zoomToShowLayer(marker);
        } else if (location && location.lat && location.lng) {
          // Fallback: clustering disabled or marker not in cluster, just pan to location
          this.map.panTo([location.lat, location.lng]);
        }
      } else if (location && location.lat && location.lng) {
        // Marker not found (shouldn't normally happen), just pan to location
        this.map.panTo([location.lat, location.lng]);
      }
    } else if (location && location.lat && location.lng) {
      // Services don't have markers, just pan to location
      this.map.panTo([location.lat, location.lng]);
    }
  }

  closeEntityListPreview() {
    // Check if the entity has unsaved location changes OR was just dropped
    if (this.entityListPreview?.item &&
        (this.hasUnsavedLocationChanges(this.entityListPreview.item) || (this.entityListPreview as any)?._justDropped)) {
      const item = this.entityListPreview.item;
      const type = this.entityListPreview.type;

      // Find and remove the marker from the map
      const marker = this.findMarkerByItemId(item.id, type);
      if (marker) {
        // Remove from cluster groups or map
        if (type === 'identity') {
          if (this.identityClusterGroup && this.identityClusterGroup.hasLayer(marker)) {
            this.identityClusterGroup.removeLayer(marker);
          } else if (this.map.hasLayer(marker)) {
            this.map.removeLayer(marker);
          }
          // Remove from marker service collections
          const index = this.mapMarkerService.identityMarkers.indexOf(marker);
          if (index > -1) {
            this.mapMarkerService.identityMarkers.splice(index, 1);
          }
          this.mapMarkerService.markerToIdentityId.delete(marker);
        } else {
          if (this.routerClusterGroup && this.routerClusterGroup.hasLayer(marker)) {
            this.routerClusterGroup.removeLayer(marker);
          } else if (this.map.hasLayer(marker)) {
            this.map.removeLayer(marker);
          }
          // Remove from marker service collections
          const index = this.mapMarkerService.routerMarkers.indexOf(marker);
          if (index > -1) {
            this.mapMarkerService.routerMarkers.splice(index, 1);
          }
          this.mapMarkerService.markerToRouterId.delete(marker);
        }

        // Disable dragging if enabled
        if (marker.dragging) {
          marker.dragging.disable();
        }

        // Remove CSS classes
        const markerElement = marker.getElement();
        if (markerElement) {
          markerElement.classList.remove('marker-draggable-active-identity');
          markerElement.classList.remove('marker-draggable-active-router');
        }

        // Clear currentDraggableMarker if this is it
        if (this.mapMarkerService.currentDraggableMarker === marker) {
          this.mapMarkerService.currentDraggableMarker = null;
        }
      }

      // Clear the location from state
      if (type === 'identity') {
        this.mapStateService.identityLocations.delete(item.id);
      } else {
        this.mapStateService.routerLocations.delete(item.id);
      }

      // Clear the geolocation tag and unsaved flag from the entity
      if (item.tags) {
        delete item.tags.geolocation;
      }
      item._unsavedLocation = false;
    }

    this.entityListPreview = null;
    this.entityListPreviewType = null;
    this.mapStateService.sidePanelCircuits = [];

    // Reset marker selection
    if (this.mapMarkerService.selectedMarker) {
      this.updateMarkerIcon(this.mapMarkerService.selectedMarker, false);
      this.resetMarkerOpacity();
      this.mapMarkerService.selectedMarker = null;
    }
  }

  openIdentityPanel(identity: any) {
    if (!identity || !identity.id) return;

    // Get identity location
    const location = this.mapStateService.identityLocations.get(identity.id);

    // Open side panel with identity data
    this.openSidePanel('marker', {
      type: 'identity',
      item: identity,
      location: location
    });
  }

  openServicePanel(service: any) {
    if (!service || !service.id) return;

    // Open side panel with service data
    this.openSidePanel('marker', {
      type: 'services', // Use plural to match getEntityCircuits() logic
      item: service,
      location: null // Services don't have location
    });
  }

  openEntityPanel(entityId: string, entityType: string) {
    if (!entityId || !entityType) return;

    if (entityType === 'identity') {
      // Find the identity
      const identity = this.identities.find(id => id.id === entityId);
      if (identity) {
        this.openIdentityPanel(identity);
        // Center on map
        const location = this.mapStateService.identityLocations.get(entityId);
        if (location && location.lat && location.lng) {
          this.map.panTo([location.lat, location.lng]);
        }
      }
    } else if (entityType === 'routers') {
      // Find the router
      const router = this.edgeRouters.find(r => r.id === entityId);
      if (router) {
        this.openRouterPanel(router);
        // Center on map
        const location = this.mapStateService.routerLocations.get(entityId);
        if (location && location.lat && location.lng) {
          this.map.panTo([location.lat, location.lng]);
        }
      }
    }
  }

  parseConnectionType(type: string): string {
    if (!type) return 'N/A';
    // Remove "link." prefix if present
    return type.replace(/^link\./, '');
  }

  parseEndpoint(endpoint: string): { protocol: string, address: string, port: string } {
    if (!endpoint) {
      return { protocol: 'N/A', address: 'N/A', port: 'N/A' };
    }

    // Format: "tcp:172.31.20.189:44162"
    // Split by colon
    const parts = endpoint.split(':');

    if (parts.length >= 3) {
      const protocol = parts[0]; // "tcp"
      const address = parts[1]; // "172.31.20.189"
      const port = parts.slice(2).join(':'); // "44162" (join in case there are more colons)

      return { protocol, address, port };
    } else if (parts.length === 2) {
      // Format might be "protocol:address" without port
      return { protocol: parts[0], address: parts[1], port: 'N/A' };
    } else {
      // Unexpected format
      return { protocol: 'N/A', address: endpoint, port: 'N/A' };
    }
  }

  updateGeolocationLocal(item: any, lat: number, lng: number, type: string): void {
    // Track the original location BEFORE updating (for unsaved changes detection)
    this.geolocationService.trackOriginalLocation(item);

    // Update the item's geolocation tag using the service
    this.geolocationService.updateGeolocationLocal(item, lat, lng);

    // Mark item as having unsaved location changes
    item._unsavedLocation = true;

    // Update the location in our maps
    if (type === 'routers') {
      this.mapStateService.setRouterLocation(item.id, { lat, lng, name: item.name });
    } else if (type === 'identity') {
      this.mapStateService.setIdentityLocation(item.id, { lat, lng, name: item.name });
    }

    // Redraw circuits/links since position changed
    if (this.mapStateService.linksVisible) {
      this.drawLinks(this.links);
    }
    if (this.mapStateService.activeCircuitsVisible) {
      this.drawActiveCircuits(this.circuits);
    }
  }

  handleGeolocationRemoval(item: any, type: string, marker: any): void {
    // Remove marker from map and service collections
    this.mapMarkerService.removeMarker(
      marker,
      type,
      this.identityClusterGroup,
      this.routerClusterGroup,
      this.mapStateService.routerLocations,
      this.mapStateService.identityLocations,
      item.id
    );

    // Remove geolocation from backend using the service
    this.geolocationService.removeGeolocation(item, type, this.mapStateService.routerTypes).then(() => {
      // Show success message
      const successGrowler = new GrowlerModel(
        'success',
        'Geolocation Removed',
        `Geolocation for ${item.name} has been removed successfully`
      );
      this.growlerService.show(successGrowler);

      // Update counts
      if (type === 'identity') {
        this.unlocatedIdentities = this.identities.filter(identity => identity.typeId !== 'Router' && !identity.tags?.geolocation).length;
        this.geolocatedIdentities = this.identities.filter(identity => identity.typeId !== 'Router' && identity.tags?.geolocation).length;
      } else if (type === 'routers') {
        this.unlocatedRouters = this.edgeRouters.filter(router => !router.tags?.geolocation).length;
        this.geolocatedRouters = this.edgeRouters.filter(router => router.tags?.geolocation).length;
      }

      // Update unlocated entity lists if the unlocated panel is open
      if (this.mapStateService.sidePanelType === 'unlocated') {
        const unlocatedIdentities = this.identities.filter(identity =>
          (identity.typeId !== 'Router') && (!identity.tags?.geolocation || identity.tags.geolocation.trim() === '')
        );
        const unlocatedRouters = this.edgeRouters.filter(router =>
          !router.tags?.geolocation || router.tags.geolocation.trim() === ''
        );

        // Update the panel data
        this.mapStateService.sidePanelData = {
          unlocatedIdentities,
          unlocatedRouters
        };

        // Update filtered lists based on current search
        this.filteredUnlocatedIdentities = unlocatedIdentities.filter(identity =>
          identity.name?.toLowerCase().includes(this.unlocatedIdentitiesSearch.toLowerCase())
        );
        this.filteredUnlocatedRouters = unlocatedRouters.filter(router =>
          router.name?.toLowerCase().includes(this.unlocatedRoutersSearch.toLowerCase())
        );
      }

      // Update entity list if it's open and showing the affected entity type
      if (this.mapStateService.sidePanelType === 'entityList') {
        const entityType = this.mapStateService.sidePanelData?.entityType;
        if ((type === 'identity' && entityType === 'identities') || (type === 'routers' && entityType === 'routers')) {
          // Refresh the entity list to reflect the location change
          this.updateEntityListAfterLocationChange();
        }
      }

      // Redraw circuits and links
      if (this.mapStateService.linksVisible) {
        this.drawLinks(this.links);
      }
      if (this.mapStateService.activeCircuitsVisible) {
        this.drawActiveCircuits(this.circuits);
      }
    }).catch(error => {
      const errorMessage = this.zitiDataService.getErrorMessage(error);
      const errorGrowler = new GrowlerModel(
        'error',
        'Remove Failed',
        `Failed to remove geolocation: ${errorMessage}`
      );
      this.growlerService.show(errorGrowler);
    });
  }

  updateEntityListAfterLocationChange() {
    // Refresh the full entity list with updated data
    if (this.entityListType === 'identities') {
      const filteredIdentities = this.identities.filter(identity => identity.typeId !== 'Router');
      this.fullEntityList = [...filteredIdentities];
    } else if (this.entityListType === 'routers') {
      this.fullEntityList = [...this.edgeRouters];
    }

    // Reapply filters to update the displayed list
    this.applyEntityListFilters();
  }

  navigateToRoleAttribute(role: string) {
    if (!role) return;

    // Determine which filter to update based on the entity type
    // Check entity list preview first, then side panel data, then unlocated preview
    let entityType = this.entityListPreviewType ||
                     this.mapStateService.sidePanelData?.type ||
                     this.unlocatedPreviewType;

    // For entity list, convert the entityListType to the appropriate type
    if (this.mapStateService.sidePanelType === 'entityList' && this.entityListType) {
      if (this.entityListType === 'identities') entityType = 'identity';
      else if (this.entityListType === 'routers') entityType = 'routers';
      else if (this.entityListType === 'services') entityType = 'service';
    }

    if (entityType === 'identity') {
      // Add to identity attributes filter if not already present
      if (!this.mapStateService.selectedIdentityAttributes.includes(role)) {
        this.mapStateService.selectedIdentityAttributes = [...this.mapStateService.selectedIdentityAttributes, role];
        this.reloadMapDataWithFilters();
        this.checkAppliedFilters();
      }
    } else if (entityType === 'routers') {
      // Add to router attributes filter if not already present
      if (!this.mapStateService.selectedRouterAttributes.includes(role)) {
        this.mapStateService.selectedRouterAttributes = [...this.mapStateService.selectedRouterAttributes, role];
        this.reloadMapDataWithFilters();
        this.checkAppliedFilters();
      }
    } else if (entityType === 'service') {
      // Add to service attributes filter if not already present
      if (!this.mapStateService.selectedServiceAttributes.includes(role)) {
        this.mapStateService.selectedServiceAttributes = [...this.mapStateService.selectedServiceAttributes, role];
        this.reloadMapDataWithFilters();
        this.checkAppliedFilters();
      }
    }
  }

  getEntityOnlineStatus(item: any): boolean {
    // Check both isOnline and connected properties (routers use 'connected')
    return item?.isOnline ?? item?.connected ?? false;
  }

  hasUnsavedLocationChanges(item: any): boolean {
    return this.geolocationService.hasUnsavedChanges(item);
  }

  async saveLocationChanges(item: any, type: string): Promise<void> {
    if (!item || !item.id) return;

    await this.geolocationService.saveGeolocation(item, type, this.mapStateService.routerTypes);

    // Clear the unsaved location flag after successful save
    item._unsavedLocation = false;

    // Update counts (entity now has geolocation)
    if (type === 'identity') {
      this.unlocatedIdentities = this.identities.filter(identity => identity.typeId !== 'Router' && !identity.tags?.geolocation).length;
      this.geolocatedIdentities = this.identities.filter(identity => identity.typeId !== 'Router' && identity.tags?.geolocation).length;
    } else if (type === 'routers') {
      this.unlocatedRouters = this.edgeRouters.filter(router => !router.tags?.geolocation).length;
      this.geolocatedRouters = this.edgeRouters.filter(router => router.tags?.geolocation).length;
    }

    // Update unlocated entity lists if the unlocated panel is open
    if (this.mapStateService.sidePanelType === 'unlocated') {
      const unlocatedIdentities = this.identities.filter(identity =>
        (identity.typeId !== 'Router') && (!identity.tags?.geolocation || identity.tags.geolocation.trim() === '')
      );
      const unlocatedRouters = this.edgeRouters.filter(router =>
        !router.tags?.geolocation || router.tags.geolocation.trim() === ''
      );

      // Update the panel data
      this.mapStateService.sidePanelData = {
        unlocatedIdentities,
        unlocatedRouters
      };

      // Update filtered lists based on current search
      this.filteredUnlocatedIdentities = unlocatedIdentities.filter(identity =>
        identity.name?.toLowerCase().includes(this.unlocatedIdentitiesSearch.toLowerCase())
      );
      this.filteredUnlocatedRouters = unlocatedRouters.filter(router =>
        router.name?.toLowerCase().includes(this.unlocatedRoutersSearch.toLowerCase())
      );
    }

    // Update entity list if it's open and showing the affected entity type
    if (this.mapStateService.sidePanelType === 'entityList') {
      const entityType = this.mapStateService.sidePanelData?.entityType;
      if ((type === 'identity' && entityType === 'identities') || (type === 'routers' && entityType === 'routers')) {
        // Refresh the entity list to reflect the location change
        this.updateEntityListAfterLocationChange();
      }
    }

    // Clean up draggable marker state and visual styling
    if (this.mapMarkerService.currentDraggableMarker) {
      const marker = this.mapMarkerService.currentDraggableMarker;

      // Disable dragging
      if (marker.dragging) {
        marker.dragging.disable();
      }

      // Remove visual CSS classes
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.classList.remove('marker-draggable-active-identity');
        markerElement.classList.remove('marker-draggable-active-router');
      }

      // Clear currentDraggableMarker reference
      this.mapMarkerService.currentDraggableMarker = null;
    }

    // Reset marker selection and opacity
    if (this.mapMarkerService.selectedMarker) {
      this.updateMarkerIcon(this.mapMarkerService.selectedMarker, false);
      this.mapMarkerService.selectedMarker = null;
    }

    // Reset opacity on all markers
    this.resetMarkerOpacity();
  }

  async saveUnlocatedPreviewEntity(): Promise<void> {
    if (!this.unlocatedPreviewEntity) {
      return;
    }

    // Check if there are unsaved changes (either flag)
    if (!this.unlocatedPreviewHasUnsavedLocation && !this.unlocatedPreviewEntity._unsavedLocation) {
      return;
    }

    await this.saveLocationChanges(this.unlocatedPreviewEntity, this.unlocatedPreviewType);

    // Clear the unsaved flags after successful save
    this.unlocatedPreviewHasUnsavedLocation = false;

    // Keep the preview open so user can continue dropping more entities
    // Don't close the preview - just clear the unsaved flag
  }

  getEntityCircuits(entityId: string, entityType: string): any[] {
    if (!entityId || !this.circuits || this.circuits.length === 0) {
      return [];
    }

    const matchedCircuits = this.circuits.filter(circuit => {
      if (entityType === 'identity') {
        // Check if this identity is the client (initiator)
        const clientId = circuit.tags?.clientId ||
                         circuit.clientId ||
                         circuit.client?.id ||
                         circuit.sourceId ||
                         circuit.initiator?.id;

        if (clientId === entityId) {
          return true;
        }

        // Check if this identity is the host
        const hostIdFromTags = circuit.tags?.hostId;
        if (hostIdFromTags === entityId) {
          return true;
        }

        // Check via terminator
        const terminatorIdFromCircuit = circuit.terminator?.id || circuit.terminatorId;
        if (terminatorIdFromCircuit) {
          const terminator = this.terminators.find(t => t.id === terminatorIdFromCircuit);
          if (terminator) {
            const hostIdentityId = terminator.hostId || terminator.identity?.id || terminator.identityId;
            if (hostIdentityId === entityId) {
              return true;
            }
          }
        }
      } else if (entityType === 'routers') {
        // Check if this router is in the circuit path
        // Handle both formats: circuit.path.nodes (new) or circuit.path (old)
        const pathNodes = circuit.path?.nodes || circuit.path;

        if (!pathNodes || !Array.isArray(pathNodes)) {
          return false;
        }

        return pathNodes.some((node: any) => {
          const routerId = node.id || node.routerId || node;
          return routerId === entityId;
        });
      } else if (entityType === 'services') {
        // Check if this circuit is using this service
        const serviceId = circuit.service?.id || circuit.serviceId;
        return serviceId === entityId;
      }

      return false;
    });

    return matchedCircuits;
  }

  clearActiveCircuits(): void {
    this.mapRenderingService.activeCircuitLines.forEach(line => {
      this.map.removeLayer(line);
    });
    this.mapRenderingService.activeCircuitLines = [];

    // Scale down circuit markers and clear the set
    this.scaleCircuitMarkers(false);
    this.mapMarkerService.circuitMarkerIds.clear();
  }

  isCircuitSelectionActive(): boolean {
    return !!(this.mapStateService.selectedCircuit || this.mapStateService.selectedUnlocatedCircuit);
  }

  selectCircuit(circuit: any, isUnlocatedPanel: boolean = false): void {
    if (isUnlocatedPanel) {
      // Toggle selection - if already selected, deselect it
      if (this.mapStateService.selectedUnlocatedCircuit?.id === circuit.id) {
        this.mapStateService.selectedUnlocatedCircuit = null;
        this.mapStateService.selectedUnlocatedCircuitRouters = [];
        this.mapStateService.selectedCircuitSegment = null; // Clear segment selection
        // Clear circuit display and show all circuits if they were visible
        this.clearActiveCircuits();
        if (this.mapStateService.activeCircuitsVisible) {
          this.drawActiveCircuits(this.circuits, false);
        }
      } else {
        this.mapStateService.selectedUnlocatedCircuit = circuit;
        this.mapStateService.selectedUnlocatedCircuitRouters = this.getCircuitRouters(circuit);
        this.mapStateService.selectedCircuitSegment = null; // Clear segment selection when selecting from list
        // Show only this circuit on the map (no segment highlighting from circuit list)
        this.clearActiveCircuits();
        this.drawActiveCircuits([circuit], false);
      }
    } else {
      // Toggle selection - if already selected, deselect it
      if (this.mapStateService.selectedCircuit?.id === circuit.id) {
        this.mapStateService.selectedCircuit = null;
        this.mapStateService.selectedCircuitRouters = [];
        this.mapStateService.selectedCircuitSegment = null; // Clear segment selection
        // Clear circuit display and show all circuits if they were visible
        this.clearActiveCircuits();
        if (this.mapStateService.activeCircuitsVisible) {
          this.drawActiveCircuits(this.circuits, false);
        }
      } else {
        this.mapStateService.selectedCircuit = circuit;
        this.mapStateService.selectedCircuitRouters = this.getCircuitRouters(circuit);
        this.mapStateService.selectedCircuitSegment = null; // Clear segment selection when selecting from list
        // Show only this circuit on the map (no segment highlighting from circuit list)
        this.clearActiveCircuits();
        this.drawActiveCircuits([circuit], false);
      }
    }
  }

  getCircuitRouters(circuit: any): any[] {
    if (!circuit) {
      return [];
    }

    // Handle both formats: circuit.path.nodes (new) or circuit.path (old)
    const pathNodes = circuit.path?.nodes || circuit.path;

    if (!pathNodes || !Array.isArray(pathNodes)) {
      return [];
    }

    // Map path nodes to router details
    return pathNodes.map((node: any) => {
      const routerId = node.id || node.routerId || node;

      // Try to find the router in our edgeRouters array
      const router = this.edgeRouters.find(r => r.id === routerId);
      // Also check routerLocations map for the name
      const routerLocation = this.mapStateService.routerLocations.get(routerId);

      // If node already has full details, enrich it with connection status
      if (node.name) {
        // Always ensure we have the connected property
        if (node.connected !== undefined) {
          // Node already has connected status, return as-is
          return node;
        }
        // Add connected property from router data or default to false if not found
        return {
          ...node,
          connected: router ? (router.connected ?? router.isOnline ?? false) : false,
          _notFound: !router
        };
      }

      if (router) {
        return {
          id: router.id,
          name: routerLocation?.name || router.name || routerId,
          type: 'routers',
          connected: router.connected ?? router.isOnline ?? false,
          _notFound: false
        };
      }

      // If not found, return basic info with location name if available
      return {
        id: routerId,
        name: routerLocation?.name || routerId,
        type: 'routers',
        connected: false,
        _notFound: true
      };
    });
  }

  // Wrapper method - delegates to MapMarkerService
  findMarkerByItemId(itemId: string, itemType: string): any {
    return this.mapMarkerService.findMarkerByItemId(itemId, itemType, this.identityClusterGroup, this.routerClusterGroup);
  }

  // Wrapper method - delegates to MapMarkerService
  updateMarkerIcon(marker: any, isSelected: boolean): void {
    this.mapMarkerService.updateMarkerIcon(marker, isSelected);
  }

  buildCircuitHops(data: any): any[] {
    // Use the full path information including identities and routers
    const routerNames = data.routerNames || [];
    const entityIds = data.entityIds || [];
    const entityTypes = data.entityTypes || [];

    if (!routerNames || routerNames.length < 2) {
      return [];
    }

    const hops = [];
    for (let i = 0; i < routerNames.length - 1; i++) {
      hops.push({
        from: routerNames[i],
        to: routerNames[i + 1],
        fromId: entityIds[i],
        toId: entityIds[i + 1],
        fromType: entityTypes[i],
        toType: entityTypes[i + 1],
        index: i
      });
    }

    return hops;
  }

  buildCircuitRouters(pathNodes: any[]): any[] {
    if (!pathNodes || pathNodes.length === 0) {
      return [];
    }

    return pathNodes.map((node, index) => ({
      id: node.id,
      name: node.name || node.id,
      type: node.type || 'routers',
      order: index + 1
    }));
  }

  selectCircuitHop(hop: any, index: number): void {
    // Clear selected router when selecting a hop
    this.selectedRouterInPath = null;

    // Update the selected segment to highlight it on the map
    this.mapStateService.selectedCircuitSegment = {
      circuitId: this.mapStateService.sidePanelData?.circuit?.id,
      segmentIndex: index
    };

    // Store the current circuit data before redrawing
    const currentCircuit = this.mapStateService.sidePanelData.circuit;
    const currentCircuitHops = this.mapStateService.sidePanelData.circuitHops;
    const currentCircuitRouters = this.mapStateService.sidePanelData.circuitRouters;
    const currentPathNodes = this.mapStateService.sidePanelData.pathNodes;
    const currentPathCoordinates = this.mapStateService.sidePanelData.pathCoordinates;
    const currentRouterNames = this.mapStateService.sidePanelData.routerNames;
    const currentEntityIds = this.mapStateService.sidePanelData.entityIds;
    const currentEntityTypes = this.mapStateService.sidePanelData.entityTypes;

    // Redraw the circuit with the new selected segment highlighted
    this.clearActiveCircuits();
    this.drawActiveCircuits([currentCircuit], false);

    // Restore the panel state to circuit type with updated segment
    this.mapStateService.sidePanelType = 'circuit';
    this.mapStateService.sidePanelData = {
      circuit: currentCircuit,
      segment: {
        from: hop.from,
        to: hop.to,
        fromId: hop.fromId,
        toId: hop.toId,
        fromType: hop.fromType,
        toType: hop.toType,
        index: index,
        total: currentCircuitHops?.length || 0
      },
      circuitHops: currentCircuitHops,
      circuitRouters: currentCircuitRouters,
      pathNodes: currentPathNodes,
      pathCoordinates: currentPathCoordinates,
      routerNames: currentRouterNames,
      entityIds: currentEntityIds,
      entityTypes: currentEntityTypes
    };
  }

  selectCircuitRouter(routerId: string, routerType: string): void {
    // Track the selected router for highlighting in the table
    this.selectedRouterInPath = routerId;

    // Find the router/identity entity and get its location
    let location: any = null;

    if (routerType === 'identity') {
      const identity = this.identities.find(id => id.id === routerId);
      if (identity) {
        location = this.mapStateService.identityLocations.get(routerId);
        // Set preview entity with location data
        this.circuitPreviewEntity = {
          ...identity,
          _location: location
        };
        this.circuitPreviewEntityType = 'identity';
      }
    } else if (routerType === 'routers') {
      const router = this.edgeRouters.find(r => r.id === routerId);
      if (router) {
        location = this.mapStateService.routerLocations.get(routerId);
        // Set preview entity with location data
        this.circuitPreviewEntity = {
          ...router,
          _location: location
        };
        this.circuitPreviewEntityType = 'routers';
      }
    }

    // Center the map on the router/identity location, expanding its cluster if needed
    if (location && location.lat && location.lng) {
      const marker = this.findMarkerByItemId(routerId, routerType);
      const clusterGroup = routerType === 'identity' ? this.identityClusterGroup : this.routerClusterGroup;

      if (marker && clusterGroup) {
        // Select and highlight the marker first
        if (this.mapMarkerService.selectedMarker) {
          this.updateMarkerIcon(this.mapMarkerService.selectedMarker, false);
          this.resetMarkerOpacity();
        }
        this.mapMarkerService.selectedMarker = marker;
        this.updateMarkerIcon(marker, true);
        this.applyMarkerOpacity(marker);

        // Then zoom to show it
        clusterGroup.zoomToShowLayer(marker);
      } else {
        // Fallback: marker not found (shouldn't normally happen), just pan
        this.map.panTo([location.lat, location.lng]);
      }
    }
  }

  closeCircuitPreview(): void {
    this.circuitPreviewEntity = null;
    this.circuitPreviewEntityType = '';
    this.selectedRouterInPath = null;
  }

  openCircuitPreview(circuit: any, event?: Event): void {
    // Stop event propagation to prevent row click
    if (event) {
      event.stopPropagation();
    }

    // Clear any existing circuit preview
    this.circuitPreviewEntity = null;
    this.circuitPreviewEntityType = '';
    this.selectedRouterInPath = null;

    // Clear entity list preview state
    this.entityListPreview = null;
    this.entityListPreviewType = null;

    // Use service to build circuit path data
    const pathData = this.circuitPathBuilderService.buildCircuitPathData(
      circuit,
      this.mapStateService.routerLocations,
      this.mapStateService.identityLocations,
      this.edgeRouters,
      this.identities,
      this.links
    );

    if (!pathData) {
      console.warn('Could not build circuit path data for circuit:', circuit.id);
      return;
    }

    // Warn if some entities are missing geolocation data
    if (!pathData.hasCompleteGeolocation) {
      console.warn('Circuit has entities without geolocation data:', pathData.missingLocations.join(', '));
    }

    // Open the circuit panel with available data
    if (pathData.circuitHops.length > 0) {
      // Set the selected circuit and draw it on the map
      this.mapStateService.selectedCircuit = circuit;
      this.mapStateService.selectedCircuitRouters = pathData.circuitRouters;
      this.mapStateService.selectedCircuitSegment = null; // Clear segment selection

      // Clear and redraw the circuit on the map
      this.clearActiveCircuits();
      this.drawActiveCircuits([circuit], false);

      this.openSidePanel('circuit', {
        circuit: circuit,
        segment: {
          index: 0,
          total: pathData.circuitHops.length,
          from: pathData.circuitHops[0].from,
          to: pathData.circuitHops[0].to,
          fromId: pathData.circuitHops[0].fromId,
          toId: pathData.circuitHops[0].toId,
          fromType: pathData.circuitHops[0].fromType,
          toType: pathData.circuitHops[0].toType,
          isVisible: pathData.circuitHops[0].isVisible
        },
        pathNodes: pathData.pathNodes,
        pathCoordinates: pathData.pathCoordinates,
        routerNames: pathData.routerNames,
        entityIds: pathData.entityIds,
        entityTypes: pathData.entityTypes,
        circuitHops: pathData.circuitHops,
        circuitRouters: pathData.circuitRouters,
        visibleSegmentToHopIndex: pathData.visibleSegmentToHopIndex
      });
    }
  }

  // Document click handler for closing dropdowns
  private handleDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    let dropdownClosed = false;

    if (!target.closest('.service-filter-container')) {
      if (this.mapStateService.showServiceDropdown) {
        dropdownClosed = true;
      }
      this.mapStateService.showServiceDropdown = false;
    }
    if (!target.closest('.identity-filter-container')) {
      if (this.mapStateService.showIdentityDropdown) {
        dropdownClosed = true;
      }
      this.mapStateService.showIdentityDropdown = false;
    }

    // Re-enable map scroll when dropdowns close
    if (dropdownClosed) {
      this.enableMapScroll();
    }
  }

  // Side panel resize handlers
  onResizerMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.mapStateService.sidePanelWidth;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) {
      return;
    }

    // Calculate the delta in pixels and convert to rem
    const deltaX = this.startX - event.clientX;
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const deltaRem = deltaX / fontSize;

    // Calculate new width
    let newWidth = this.startWidth + deltaRem;

    // Clamp to min/max
    newWidth = Math.max(this.minPanelWidth, Math.min(this.maxPanelWidth, newWidth));

    this.mapStateService.sidePanelWidth = newWidth;

    // Update CSS variable
    document.documentElement.style.setProperty('--side-panel-width', `${newWidth}rem`);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isResizing) {
      this.isResizing = false;
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    document.removeEventListener('click', this.documentClickHandler);

    // Clean up Leaflet map and event listeners
    if (this.map) {
      // Remove all event listeners from map
      this.map.off();

      // Clean up cluster groups
      if (this.identityClusterGroup) {
        this.identityClusterGroup.off();
        this.identityClusterGroup.clearLayers();
      }
      if (this.routerClusterGroup) {
        this.routerClusterGroup.off();
        this.routerClusterGroup.clearLayers();
      }

      // Clear marker arrays
      this.mapMarkerService.identityMarkers = [];
      this.mapMarkerService.routerMarkers = [];

      // Clear line arrays
      this.mapRenderingService.circuitLines = [];
      this.mapRenderingService.activeCircuitLines = [];

      // Clear location maps
      this.mapStateService.identityLocations.clear();
      this.mapStateService.routerLocations.clear();
      this.mapMarkerService.markerToIdentityId.clear();
      this.mapMarkerService.markerToRouterId.clear();

      // Remove the map
      this.map.remove();
      this.map = null;
    }
  }
}
