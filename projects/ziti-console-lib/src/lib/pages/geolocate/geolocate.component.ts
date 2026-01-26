    import {Component, OnInit, OnDestroy, Inject, ViewChild, SimpleChanges, ElementRef} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from '../../services/ziti-data.service';
import { Subscription } from 'rxjs';
import {GrowlerService} from "../../features/messaging/growler.service";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {Router} from '@angular/router';
import {FilterObj} from '../../features/data-table/data-table-filter.service';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmComponent} from '../../features/confirm/confirm.component';
import L from 'leaflet';
import 'leaflet.markercluster';

import {defer} from 'lodash-es';

@Component({
  selector: 'lib-geolocate',
  templateUrl: './geolocate.component.html',
  styleUrls: ['./geolocate.component.scss']
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

  identityMarkers = [];
  routerMarkers = [];
  circuitLines = [];
  activeCircuitLines = [];
  routerLocations = new Map<string, {lat: number, lng: number, name: string}>();
  identityLocations = new Map<string, {lat: number, lng: number, name: string}>();

  // Marker-to-ID mappings
  markerToIdentityId = new Map<any, string>();
  markerToRouterId = new Map<any, string>();

  // Track currently draggable marker
  currentDraggableMarker: any = null;

  // Track original locations for change detection
  originalLocations = new Map<string, string>();

  // Track router types (edge-router vs transit-router)
  routerTypes = new Map<string, string>();

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

  clusteringEnabled = true;
  linksVisible = false;
  activeCircuitsVisible = false;
  routersVisible = true;
  identitiesVisible = true;

  // Side panel
  sidePanelOpen = false;
  sidePanelType: 'marker' | 'link' | 'circuit' | 'unlocated' | null = null;
  sidePanelData: any = null;
  sidePanelCircuits: any[] = [];
  selectedCircuit: any = null;
  selectedCircuitRouters: any[] = [];
  selectedCircuitSegment: any = null; // Track the selected circuit segment for highlighting
  selectedMarker: any = null; // Track the currently selected marker
  selectedRouterInPath: string | null = null; // Track the selected router in circuit path

  // Entity preview in unlocated panel
  unlocatedPreviewEntity: any = null;
  unlocatedPreviewType: string = '';
  unlocatedPreviewHasUnsavedLocation: boolean = false;
  unlocatedPreviewCircuits: any[] = [];
  selectedUnlocatedCircuit: any = null;
  selectedUnlocatedCircuitRouters: any[] = [];

  // Service filter (multi-select)
  serviceFilterText = '';
  filteredServices: any[] = [];
  showServiceDropdown = false;
  selectedServiceFilters: any[] = [];

  serviceRoleAttributes: any[] = [];
  selectedServiceAttributes: any[] = [];

  identityRoleAttributes: any[] = [];
  identityNamedAttributes: any[] = [];
  selectedIdentityAttributes: any[] = [];
  selectedIdentityNamedAttributes: any[] = [];
  identitiesNameIdMap: { [key: string]: string } = {};
  identitiesIdNameMap: { [key: string]: string } = {};

  routerRoleAttributes: any[] = [];
  selectedRouterAttributes: any[] = [];

  selectedConnectionStatus: string = 'all';
  showConnectionStatusFilterSelector = false;

  filtersApplied = false;

  // Identity filter (multi-select)
  identityFilterText = '';
  filteredIdentities: any[] = [];
  showIdentityDropdown = false;
  selectedIdentityFilters: any[] = [];

  private subscription = new Subscription();

  edgeRoutersInit = false;
  identitiesInit = false;
  isLoading = false;

  dialogRef: any;

  constructor(
    @Inject(ZITI_DATA_SERVICE) private zitiDataService: ZitiDataService,
    private router: Router,
    private growlerService: GrowlerService,
    private dialogForm: MatDialog
  ) {}

  @ViewChild('routerFilterSelector') routerFilterSelector: any;
  @ViewChild('identityFilterSelector') identityFilterSelector: any;
  @ViewChild('serviceFilterSelector') serviceFilterSelector: any;
  @ViewChild('connectionStatusFilterSelector') connectionStatusFilterSelector: ElementRef;

  ngOnInit(): void {
    const attributesPromise = this.getRoleAttributest();
    this.getIdentityNamedAttributes(); // Initialize identity names for filtering
    this.map = L.map('MainMap', {
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; NetFoundry Inc.'
    }).addTo(this.map);

    L.control.attribution({
      position: 'bottomleft'
    }).addTo(this.map);

    this.map.setView(new L.LatLng(41.850033, -87.6500523), 4);

    // Click handler to close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      let dropdownClosed = false;

      if (!target.closest('.service-filter-container')) {
        if (this.showServiceDropdown) {
          dropdownClosed = true;
        }
        this.showServiceDropdown = false;
      }
      if (!target.closest('.identity-filter-container')) {
        if (this.showIdentityDropdown) {
          dropdownClosed = true;
        }
        this.showIdentityDropdown = false;
      }

      // Re-enable map scroll when dropdowns close
      if (dropdownClosed) {
        this.enableMapScroll();
      }

    });

    // Add map click handler to disable dragging when clicking outside markers
    this.map.on('click', (event: any) => {
      // Check if we clicked on a marker or on the map itself
      // If currentDraggableMarker exists and we're not clicking on it, disable dragging
      if (this.currentDraggableMarker) {
        console.log('Map clicked, disabling drag mode');
        this.currentDraggableMarker.dragging.disable();

        // Remove visual styling (both classes)
        const markerElement = this.currentDraggableMarker.getElement();
        if (markerElement) {
          markerElement.classList.remove('marker-draggable-active-identity');
          markerElement.classList.remove('marker-draggable-active-router');
        }

        this.currentDraggableMarker = null;
      }
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

      // Handle context menu on cluster group layer
      this.identityClusterGroup.on('layeradd', (event: any) => {
        const marker = event.layer;
        if (marker && marker._itemData && marker._itemType) {
          console.log('Re-binding contextmenu for identity marker:', marker._itemData.name);
          // Ensure the contextmenu event is properly bound after adding to cluster
          marker.off('contextmenu');  // Remove any existing handlers
          marker.on('contextmenu', (e: any) => {
            console.log('Identity marker contextmenu from cluster:', marker._itemData.name, e);
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            this.showMarkerContextMenu(e, marker, marker._itemData, marker._itemType);
            return false;
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

      // Handle context menu on cluster group layer
      this.routerClusterGroup.on('layeradd', (event: any) => {
        const marker = event.layer;
        if (marker && marker._itemData && marker._itemType) {
          console.log('Re-binding contextmenu for router marker:', marker._itemData.name);
          // Ensure the contextmenu event is properly bound after adding to cluster
          marker.off('contextmenu');  // Remove any existing handlers
          marker.on('contextmenu', (e: any) => {
            console.log('Router marker contextmenu from cluster:', marker._itemData.name, e);
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            this.showMarkerContextMenu(e, marker, marker._itemData, marker._itemType);
            return false;
          });
        }
      });

      this.map.addLayer(this.routerClusterGroup);

      console.log('Marker clustering enabled for identities and routers separately');
    } else {
      console.log('Marker clustering not available');
    }

    this.isLoading = true;
    const summaryPromise = this.loadEntityCounts();
    const mapPromise = this.loadMapData();
    Promise.all([attributesPromise, summaryPromise, mapPromise]).finally(() => {
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
    this.identityMarkers = [];
    this.routerMarkers = [];

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

      this.addMarkers(uniqueRouters, 'routers');

      // Load links, circuits and terminators after routers are loaded and their locations are stored
      this.loadLinks();
      this.loadCircuits();
      this.loadTerminators();
    });
  }

  loadRouters() {
    // Load both fabric routers (for circuits) and edge-routers (for role attributes)
    // Then merge them together
    const fabricUrl = '/routers?limit=1000';
    const edgePaging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };

    console.log('Loading routers from both fabric and edge APIs');

    // Load both APIs in parallel
    const fabricPromise = this.zitiDataService.call(fabricUrl, '/fabric/v1').catch(() => ({ data: [] }));
    const edgePromise = this.zitiDataService.get('edge-routers', edgePaging, []).catch(() => ({ data: [] }));

    return Promise.all([fabricPromise, edgePromise])
      .then(([fabricResult, edgeResult]) => {
        const fabricRouters = fabricResult?.data || [];
        const edgeRouters = edgeResult?.data || [];

        console.log(`Loaded ${fabricRouters.length} fabric routers and ${edgeRouters.length} edge routers`);

        // Create a map of edge routers by ID for quick lookup
        const edgeRouterMap = new Map(edgeRouters.map((r: any) => [r.id, r]));

        // Merge: Use fabric routers as base, enrich with edge router data (especially roleAttributes)
        const mergedRouters = fabricRouters.map((fabricRouter: any) => {
          const edgeRouter: any = edgeRouterMap.get(fabricRouter.id);
          if (edgeRouter) {
            // This is an edge router - track it
            this.routerTypes.set(fabricRouter.id, 'edge-router');
            // Merge: fabric router data + edge router role attributes and other properties
            return {
              ...fabricRouter,
              roleAttributes: edgeRouter.roleAttributes || [],
              // Keep other edge router properties that might be useful
              ...edgeRouter,
              _routerType: 'edge-router'
            };
          }
          // This is a transit router (not in edge API)
          this.routerTypes.set(fabricRouter.id, 'transit-router');
          return {
            ...fabricRouter,
            _routerType: 'transit-router'
          };
        });

        const edgeRouterCount = Array.from(this.routerTypes.values()).filter(t => t === 'edge-router').length;
        const transitRouterCount = Array.from(this.routerTypes.values()).filter(t => t === 'transit-router').length;
        console.log(`Merged into ${mergedRouters.length} routers: ${edgeRouterCount} edge routers, ${transitRouterCount} transit routers`);

        // Apply role attribute filtering
        let routersToDisplay = mergedRouters;
        if (this.selectedRouterAttributes.length > 0) {
          const beforeFilterCount = mergedRouters.length;
          routersToDisplay = mergedRouters.filter((router: any) => {
            const routerRoles = router.roleAttributes || [];
            return this.selectedRouterAttributes.some(selectedAttr =>
              routerRoles.includes(selectedAttr)
            );
          });
          console.log(`Filtered routers for display from ${beforeFilterCount} to ${routersToDisplay.length} based on role attributes`);
        }

        // Apply connection status filter
        if (this.selectedConnectionStatus === 'online') {
          routersToDisplay = routersToDisplay.filter((router: any) => router.isOnline === true);
        } else if (this.selectedConnectionStatus === 'offline') {
          routersToDisplay = routersToDisplay.filter((router: any) => router.isOnline === false);
        }

        return { data: routersToDisplay };
      });
  }

  loadIdentities() {
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    let identityFilters: any = [];
    if (this.selectedIdentityAttributes.length > 0) {
      // Build filter like: roleAttributes contains "attr1" or roleAttributes contains "attr2"
      const searchFilter = {
        columnId: 'roleAttributes',
        value: this.selectedIdentityAttributes,
        filterName: 'Identity Attributes',
        type: 'ATTRIBUTE'
      };
      identityFilters.push(searchFilter);
    }
    if (this.selectedIdentityNamedAttributes.length > 0) {
      // Convert identity names to IDs for filtering
      const identityIds = this.selectedIdentityNamedAttributes
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
    return this.zitiDataService.get('identities', paging, identityFilters).then((result) => {
      this.identitiesInit = true;
      console.log('LoadIdentities - Raw identities from API:', result?.data?.length, 'identityFilters:', identityFilters);

      // Filter out identities of type "Router" since those are already shown as red router markers
      let allIdentities = result?.data || [];
      console.log('LoadIdentities - Before Router filter:', allIdentities.length);
      allIdentities = allIdentities.filter((identity: any) => identity.type?.entity !== 'Router');
      console.log('LoadIdentities - After Router filter:', allIdentities.length);

      // Apply connection status filter
      if (this.selectedConnectionStatus === 'online') {
        allIdentities = allIdentities.filter((identity: any) => identity.edgeRouterConnectionStatus === 'online');
        console.log('LoadIdentities - After online filter:', allIdentities.length);
      } else if (this.selectedConnectionStatus === 'offline') {
        allIdentities = allIdentities.filter((identity: any) => identity.edgeRouterConnectionStatus !== 'online');
        console.log('LoadIdentities - After offline filter:', allIdentities.length);
      }

      this.identities = allIdentities;
      this.filteredIdentities = [...this.identities];
      console.log('LoadIdentities - Final identities count:', this.identities.length);
      console.log('LoadIdentities - Looking for client ID cmkqh4z0h5sn9dhnypvg5ofnk:',
        this.identities.find(id => id.id === 'cmkqh4z0h5sn9dhnypvg5ofnk') ? 'FOUND' : 'NOT FOUND');
      this.addMarkers(this.identities, 'identity');
    });
  }

  loadServices() {
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    let serviceFilters: any = [];
    if (this.selectedServiceAttributes.length > 0) {
      // Build filter like: roleAttributes contains "attr1" or roleAttributes contains "attr2"
      const searchFilter = {
        columnId: 'roleAttributes',
        value: this.selectedServiceAttributes,
        filterName: 'Identity Attributes',
        type: 'ATTRIBUTE'
      };
      serviceFilters.push(searchFilter);
    }
    return this.zitiDataService.get('services', paging, serviceFilters).then((result: any) => {
      this.services = result?.data || [];
      this.filteredServices = [...this.services];
    });
  }

  addMarkers(data: any[], type: string) {
    const iconUrl = type === 'identity' ? '/assets/svgs/identity-marker.svg' : '/assets/svgs/router-marker.svg';
    const icon = L.icon({
      iconUrl,
      iconRetinaUrl: iconUrl,
      shadowUrl: '/assets/scripts/components/leaflet/images/marker-shadow.png',
      iconSize: [40, 60],
      iconAnchor: [20, 54],
      popupAnchor: [0, -50],
      tooltipAnchor: [16, -28],
      shadowSize: [62, 62]
    });

    const markers = [];
    const clusterGroup = type === 'identity' ? this.identityClusterGroup : this.routerClusterGroup;

    for (const item of data) {
      let lat: number, lng: number;

      if (item.tags?.geolocation) {
        const [latStr, lngStr] = item.tags.geolocation.split(',');
        if (!isNaN(latStr) && !isNaN(lngStr)) {
          lat = parseFloat(latStr);
          lng = parseFloat(lngStr);
        } else {
          // Invalid geolocation format - skip this marker
          console.log(`Skipping ${type} ${item.name} - invalid geolocation format`);
          continue;
        }
      } else {
        // No geolocation tag - skip marker creation
        console.log(`Skipping ${type} ${item.name} - no geolocation tag`);
        continue;
      }

      // Store router and identity locations for circuit drawing
      if (type === 'routers') {
        this.routerLocations.set(item.id, { lat, lng, name: item.name });
      } else if (type === 'identity') {
        this.identityLocations.set(item.id, { lat, lng, name: item.name });
      }

      const marker = L.marker([lat, lng], {
        icon,
        draggable: false  // Start as not draggable
      });

      // Store item and type on the marker for later retrieval
      (marker as any)._itemData = item;
      (marker as any)._itemType = type;

      // Store original location for change tracking (before any modifications)
      if (!this.originalLocations.has(item.id) && item.tags?.geolocation) {
        this.originalLocations.set(item.id, item.tags.geolocation);
      }

      // Add click handler to open side panel
      marker.on('click', (e: any) => {
        // Don't disable dragging when clicking the marker itself
        e.originalEvent.stopPropagation();

        // Get the current location from the marker's position (in case it was dragged)
        const currentLatLng = marker.getLatLng();

        this.openSidePanel('marker', {
          item: item,
          type: type,
          location: { lat: currentLatLng.lat, lng: currentLatLng.lng }
        });
      });

      // Add context menu on right-click - bind directly to marker
      marker.on('contextmenu', (event: any) => {
        console.log('Marker contextmenu event triggered for:', item.name, event);
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
        this.showMarkerContextMenu(event, marker, item, type);
        return false;
      });

      // Add drag end handler to update geolocation
      marker.on('dragend', (event: any) => {
        const newLatLng = event.target.getLatLng();
        this.updateGeolocationLocal(item, newLatLng.lat, newLatLng.lng, type);

        // Re-apply the draggable styling in case it was removed during updates
        setTimeout(() => {
          const markerElement = marker.getElement();
          if (markerElement && this.currentDraggableMarker === marker) {
            const cssClass = type === 'identity' ? 'marker-draggable-active-identity' : 'marker-draggable-active-router';
            markerElement.classList.add(cssClass);
          }
        }, 100);

        // Don't disable dragging here - let the user click outside to disable it
        // Just open side panel to show updated location
        this.openSidePanel('marker', {
          item: item,
          type: type,
          location: { lat: newLatLng.lat, lng: newLatLng.lng }
        });
      });

      // Store marker-to-ID mapping
      if (type === 'identity') {
        this.markerToIdentityId.set(marker, item.id);
      } else if (type === 'routers') {
        this.markerToRouterId.set(marker, item.id);
      }

      // Add marker to appropriate cluster group if available, otherwise add to map
      if (clusterGroup) {
        clusterGroup.addLayer(marker);
      } else {
        console.warn(`No cluster group for ${type}, adding marker directly to map`);
        marker.addTo(this.map);
      }

      markers.push(marker);
    }

    // Store markers in appropriate array
    if (type === 'identity') {
      this.identityMarkers = [...this.identityMarkers, ...markers];
    } else {
      this.routerMarkers = [...this.routerMarkers, ...markers];
    }

    if (this.edgeRoutersInit && this.identitiesInit && markers.length > 0) {
      // Fit bounds to show all markers
      if (this.identityClusterGroup && this.routerClusterGroup) {
        const allMarkers = [...this.identityMarkers, ...this.routerMarkers];
        if (allMarkers.length > 0) {
          const group = L.featureGroup(allMarkers);
          this.map.fitBounds(group.getBounds());
        }
      }
    }
  }


  generateRandomUSLocation(): { lat: number, lng: number } {
    // US cities with their approximate coordinates
    const cities = [
      { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
      { name: 'New York', lat: 40.7128, lng: -74.0060 },
      { name: 'Charlotte', lat: 35.2271, lng: -80.8431 },
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
      { name: 'Austin', lat: 30.2672, lng: -97.7431 },
      { name: 'Miami', lat: 25.7617, lng: -80.1918 }
    ];

    // Pick a random city
    const city = cities[Math.floor(Math.random() * cities.length)];

    // Generate random offset within ~10 mile radius
    // 1 degree latitude ≈ 69 miles
    // 1 degree longitude ≈ 54.6 miles at 40° latitude (varies by latitude)
    const maxOffset = 10 / 69; // ~10 miles in degrees

    const latOffset = (Math.random() - 0.5) * 2 * maxOffset;
    const lngOffset = (Math.random() - 0.5) * 2 * maxOffset;

    return {
      lat: city.lat + latOffset,
      lng: city.lng + lngOffset
    };
  }

  loadLinks() {
    const url = '/links?limit=1000';
    console.log('Loading links from:', url);

    this.zitiDataService.call(url, '/fabric/v1')
    .then((result: any) => {
      this.links = result?.data || [];
      console.log(`Loaded ${this.links.length} links`, this.links);
      console.log(`Router locations available: ${this.routerLocations.size}`);
      // Links will be drawn when data is ready or when filters change
      if (this.selectedServiceAttributes.length === 0 &&
          this.selectedIdentityAttributes.length === 0 &&
          this.selectedRouterAttributes.length === 0) {
        this.drawLinks(this.links);
      }
    })
    .catch((error) => {
      console.error('Failed to load links:', error);
      console.log('Links feature unavailable - this might be expected if fabric API is not enabled');
    });
  }

  loadCircuits() {
    const url = '/circuits?limit=1000';
    console.log('Loading circuits from:', url);

    this.zitiDataService.call(url, '/fabric/v1')
    .then((result: any) => {
      this.circuits = result?.data || [];
      console.log(`Loaded ${this.circuits.length} circuits`, this.circuits);

      // Log circuit structure for debugging
      if (this.circuits.length > 0) {
        console.log('Sample circuit structure:', this.circuits[0]);
        console.log('Circuit keys:', Object.keys(this.circuits[0]));
        console.log('Circuit has clientId?', this.circuits[0].clientId);
        console.log('Circuit has client?', this.circuits[0].client);
        console.log('Circuit tags:', this.circuits[0].tags);
      }

      // Draw circuits if no filters are active
      if (this.selectedServiceAttributes.length === 0 &&
          this.selectedIdentityAttributes.length === 0 &&
          this.selectedRouterAttributes.length === 0) {
        this.drawActiveCircuits(this.circuits);
      }
    })
    .catch((error) => {
      console.error('Failed to load circuits:', error);
      console.log('Circuits feature unavailable - this might be expected if fabric API is not enabled');
    });
  }

  loadTerminators() {
    const url = '/terminators?limit=1000';
    console.log('Loading terminators from:', url);

    this.zitiDataService.call(url, '/fabric/v1')
    .then((result: any) => {
      this.terminators = result?.data || [];
      console.log(`Loaded ${this.terminators.length} terminators`, this.terminators);

      // Log terminator structure for debugging
      if (this.terminators.length > 0) {
        console.log('Sample terminator structure:', this.terminators[0]);
        console.log('Terminator keys:', Object.keys(this.terminators[0]));
      }

      // Redraw active circuits now that we have terminators to find hosting identities
      if (this.circuits.length > 0) {
        console.log('Redrawing active circuits with terminator data...');
        this.drawActiveCircuits(this.circuits);
      }
    })
    .catch((error) => {
      console.error('Failed to load terminators:', error);
      console.log('Terminators feature unavailable - this might be expected if fabric API is not enabled');
    });
  }

  drawLinks(links: any[]) {
    console.log('drawLinks called with', links.length, 'links');
    console.log('Router locations:', Array.from(this.routerLocations.entries()));

    // Clear existing circuit lines
    this.circuitLines.forEach(line => {
      this.map.removeLayer(line);
    });
    this.circuitLines = [];

    // Get set of currently visible router IDs
    const visibleRouterIds = new Set<string>();
    this.edgeRouters.forEach(router => {
      visibleRouterIds.add(router.id);
    });

    links.forEach((link, index) => {
      console.log(`Link ${index}:`, link);

      // Each link has sourceRouter and destRouter
      const sourceRouter = link.sourceRouter;
      const destRouter = link.destRouter;

      if (!sourceRouter || !destRouter) {
        console.log(`  Link ${index} missing source or dest router`);
        return;
      }

      // Only show link if both routers are visible
      if (!visibleRouterIds.has(sourceRouter.id) || !visibleRouterIds.has(destRouter.id)) {
        console.log(`  Skipping link ${index} because one or both routers are not visible`);
        return;
      }

      console.log(`  Looking for router IDs: ${sourceRouter.id} and ${destRouter.id}`);

      const loc1 = this.routerLocations.get(sourceRouter.id);
      const loc2 = this.routerLocations.get(destRouter.id);

      console.log(`  Found locations:`, loc1, loc2);

      if (loc1 && loc2) {
        // Determine line color based on link state
        let lineColor = '#4A90E2'; // default blue
        let lineOpacity = 0.6;

        if (link.down) {
          lineColor = '#E74C3C'; // red for down links
          lineOpacity = 0.8;
        } else if (link.state === 'Connected') {
          lineColor = '#2ECC71'; // green for connected
          lineOpacity = 0.7;
        }

        const line = L.polyline(
          [[loc1.lat, loc1.lng], [loc2.lat, loc2.lng]],
          {
            color: lineColor,
            weight: 3,
            opacity: lineOpacity,
            smoothFactor: 1
          }
        );

        // Add click handler to open side panel
        line.on('click', () => {
          this.openSidePanel('link', {
            link: link,
            sourceRouter: sourceRouter,
            destRouter: destRouter,
            locations: { source: loc1, dest: loc2 }
          });
        });

        line.addTo(this.map);
        this.circuitLines.push(line);
      } else {
        console.warn(`  Missing location for routers: ${sourceRouter.id} (${sourceRouter.name}) or ${destRouter.id} (${destRouter.name})`);
      }
    });

    console.log(`Drew ${this.circuitLines.length} link lines from ${links.length} links`);
    this.checkLinks();
  }

  toggleClustering() {
    this.clusteringEnabled = !this.clusteringEnabled;

    if (this.clusteringEnabled) {
      // Enable clustering - add markers to cluster groups (only if visible)
      if (this.identitiesVisible) {
        this.identityMarkers.forEach(marker => {
          this.map.removeLayer(marker);
          if (this.identityClusterGroup) {
            this.identityClusterGroup.addLayer(marker);
          }
        });
      }
      if (this.routersVisible) {
        this.routerMarkers.forEach(marker => {
          this.map.removeLayer(marker);
          if (this.routerClusterGroup) {
            this.routerClusterGroup.addLayer(marker);
          }
        });
      }
    } else {
      // Disable clustering - add markers directly to map (only if visible)
      if (this.identitiesVisible) {
        this.identityMarkers.forEach(marker => {
          if (this.identityClusterGroup) {
            this.identityClusterGroup.removeLayer(marker);
          }
          marker.addTo(this.map);
        });
      }
      if (this.routersVisible) {
        this.routerMarkers.forEach(marker => {
          if (this.routerClusterGroup) {
            this.routerClusterGroup.removeLayer(marker);
          }
          marker.addTo(this.map);
        });
      }
    }
  }

  checkLinks() {
    this.circuitLines.forEach(line => {
      if (this.linksVisible) {
        line.addTo(this.map);
      } else {
        this.map.removeLayer(line);
      }
    });
  }

  toggleLinks() {
    this.linksVisible = !this.linksVisible;

    this.checkLinks();
  }

  checkVisualizerFeature() {
    const urlParams = new URLSearchParams(window.location.search);
    this.showVisualizer = urlParams.get('feature') === 'visualizer';
  }

  // Service filter methods
  onServiceFilterInput(event: any) {
    const searchText = this.serviceFilterText.toLowerCase();

    if (searchText.trim() === '') {
      this.filteredServices = this.services.filter(s =>
        !this.selectedServiceFilters.some(selected => selected.id === s.id)
      );
    } else {
      this.filteredServices = this.services.filter(service =>
        service.name.toLowerCase().includes(searchText) &&
        !this.selectedServiceFilters.some(selected => selected.id === service.id)
      );
    }

    this.showServiceDropdown = true;
  }

  selectService(service: any) {
    if (!this.selectedServiceFilters.some(selected => selected.id === service.id)) {
      this.selectedServiceFilters.push(service);
      this.serviceFilterText = '';
      this.filteredServices = this.services.filter(s =>
        !this.selectedServiceFilters.some(selected => selected.id === s.id)
      );
      this.applyFilters();
    }
    this.showServiceDropdown = false;
    this.enableMapScroll();
  }

  removeServiceFilter(service: any) {
    this.selectedServiceFilters = this.selectedServiceFilters.filter(s => s.id !== service.id);
    this.filteredServices = this.services.filter(s =>
      !this.selectedServiceFilters.some(selected => selected.id === s.id)
    );
    this.applyFilters();
  }

  clearServiceFilters() {
    this.selectedServiceFilters = [];
    this.serviceFilterText = '';
    this.filteredServices = [...this.services];
    this.applyFilters();
  }

  // Identity filter methods
  onIdentityFilterInput(event: any) {
    const searchText = this.identityFilterText.toLowerCase();

    if (searchText.trim() === '') {
      this.filteredIdentities = this.identities.filter(i =>
        !this.selectedIdentityFilters.some(selected => selected.id === i.id)
      );
    } else {
      this.filteredIdentities = this.identities.filter(identity =>
        identity.name.toLowerCase().includes(searchText) &&
        !this.selectedIdentityFilters.some(selected => selected.id === identity.id)
      );
    }

    this.showIdentityDropdown = true;
  }

  selectIdentity(identity: any) {
    if (!this.selectedIdentityFilters.some(selected => selected.id === identity.id)) {
      this.selectedIdentityFilters.push(identity);
      this.identityFilterText = '';
      this.filteredIdentities = this.identities.filter(i =>
        !this.selectedIdentityFilters.some(selected => selected.id === i.id)
      );
      this.applyFilters();
    }
    this.showIdentityDropdown = false;
    this.enableMapScroll();
  }

  removeIdentityFilter(identity: any) {
    this.selectedIdentityFilters = this.selectedIdentityFilters.filter(i => i.id !== identity.id);
    this.filteredIdentities = this.identities.filter(i =>
      !this.selectedIdentityFilters.some(selected => selected.id === i.id)
    );
    this.applyFilters();
  }

  clearIdentityFilters() {
    this.selectedIdentityFilters = [];
    this.identityFilterText = '';
    this.filteredIdentities = [...this.identities];
    this.applyFilters();
  }

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
    const identityIds = new Set<string>();

    // If no filters are active, return all identities
    if (this.selectedIdentityFilters.length === 0 && this.selectedServiceFilters.length === 0) {
      this.identities.forEach(identity => identityIds.add(identity.id));
      return identityIds;
    }

    const selectedServiceIds = new Set(this.selectedServiceFilters.map(s => s.id));
    const selectedIdentityIds = new Set(this.selectedIdentityFilters.map(i => i.id));

    // If both filters are active, start with selected identities
    if (this.selectedIdentityFilters.length > 0) {
      this.selectedIdentityFilters.forEach(identity => {
        identityIds.add(identity.id);
      });
    }

    // If service filter is active, add identities that have active or potential access to those services
    if (this.selectedServiceFilters.length > 0) {
      // Add identities from active circuits for selected services
      this.circuits.forEach(circuit => {
        const circuitServiceId = circuit.service?.id;
        const circuitClientId = circuit.clientId || circuit.tags?.clientId;

        // Include if service matches (and identity matches if identity filter is active)
        const matchesService = selectedServiceIds.has(circuitServiceId);
        const matchesIdentity = selectedIdentityIds.size === 0 || selectedIdentityIds.has(circuitClientId);

        if (matchesService && matchesIdentity && circuitClientId) {
          identityIds.add(circuitClientId);
        }
      });

      // Add hosting identities from terminators for selected services
      this.terminators.forEach(terminator => {
        const terminatorServiceId = terminator.serviceId || terminator.service?.id;
        if (selectedServiceIds.has(terminatorServiceId)) {
          const hostingIdentityId = terminator.identity?.id || terminator.identityId;
          if (hostingIdentityId) {
            identityIds.add(hostingIdentityId);
          }
        }
      });

      // Add identities that could potentially access these services
      // (only if no specific identity filter is active)
      if (this.selectedIdentityFilters.length === 0) {
        this.identities.forEach(identity => {
          const hasAccess = this.terminators.some(terminator => {
            const terminatorServiceId = terminator.serviceId || terminator.service?.id;
            return selectedServiceIds.has(terminatorServiceId);
          });
          if (hasAccess) {
            identityIds.add(identity.id);
          }
        });
      }
    }

    return identityIds;
  }

  getFilteredRouterIds(): Set<string> {
    const routerIds = new Set<string>();

    // If no filters are active, show all routers
    if (this.selectedServiceFilters.length === 0 && this.selectedIdentityFilters.length === 0) {
      Array.from(this.routerLocations.keys()).forEach(id => routerIds.add(id));
      return routerIds;
    }

    const selectedServiceIds = new Set(this.selectedServiceFilters.map(s => s.id));
    const selectedIdentityIds = new Set(this.selectedIdentityFilters.map(i => i.id));
    const filteredIdentityIds = this.getFilteredIdentityIds();

    // Add all routers from active circuits that match the filters
    this.circuits.forEach(circuit => {
      const circuitServiceId = circuit.service?.id;
      const circuitClientId = circuit.clientId || circuit.tags?.clientId;

      // Check if circuit matches filters
      const matchesService = selectedServiceIds.size === 0 || selectedServiceIds.has(circuitServiceId);
      const matchesIdentity = selectedIdentityIds.size === 0 || selectedIdentityIds.has(circuitClientId);

      // Handle both old format (path array) and new format (path.nodes array)
      const pathNodes = circuit.path?.nodes || circuit.path;

      // Include all routers in the circuit path if the circuit matches our filters
      if (matchesService && matchesIdentity && pathNodes) {
        pathNodes.forEach((node: any) => {
          const routerId = node.id || node.routerId || node;
          if (routerId) {
            routerIds.add(routerId);
          }
        });
      }
    });

    // Add routers that have terminators for selected services
    if (selectedServiceIds.size > 0) {
      this.terminators.forEach(terminator => {
        const terminatorServiceId = terminator.serviceId || terminator.service?.id;
        if (selectedServiceIds.has(terminatorServiceId)) {
          routerIds.add(terminator.routerId);
        }
      });
    }

    // Add edge routers for filtered identities (routers the identities connect to)
    this.identities.forEach(identity => {
      if (filteredIdentityIds.has(identity.id)) {
        // Add edge routers from the identity's serviceEdgeRouters
        if (identity.serviceEdgeRouters) {
          identity.serviceEdgeRouters.forEach((routerId: string) => {
            routerIds.add(routerId);
          });
        }
        // Also check if identity has edgeRouterConnections
        if (identity.edgeRouterConnections) {
          identity.edgeRouterConnections.forEach((connection: any) => {
            const routerId = connection.id || connection.routerId;
            if (routerId) {
              routerIds.add(routerId);
            }
          });
        }
      }
    });

    return routerIds;
  }

  applyFilters() {
    console.log('Applying filters:', {
      services: this.selectedServiceFilters.map(s => s.name),
      identities: this.selectedIdentityFilters.map(i => i.name)
    });

    const hasFilters = this.selectedServiceFilters.length > 0 || this.selectedIdentityFilters.length > 0;

    if (!hasFilters) {
      // No filters active - show all markers and links
      this.showAllMarkers();
      this.drawLinks(this.links);
      return;
    }

    const filteredIdentityIds = this.getFilteredIdentityIds();
    const filteredRouterIds = this.getFilteredRouterIds();

    console.log(`Filtered to ${filteredIdentityIds.size} identities and ${filteredRouterIds.size} routers`);

    // Clear all markers from cluster groups
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }

    // Re-add only filtered markers
    this.identityMarkers.forEach((marker: any) => {
      const identityId = this.getMarkerIdentityId(marker);
      if (identityId && filteredIdentityIds.has(identityId)) {
        if (this.clusteringEnabled && this.identityClusterGroup) {
          this.identityClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    this.routerMarkers.forEach((marker: any) => {
      const routerId = this.getMarkerRouterId(marker);
      if (routerId && filteredRouterIds.has(routerId)) {
        if (this.clusteringEnabled && this.routerClusterGroup) {
          this.routerClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    // Redraw circuit lines with filters (remove existing first)
    this.circuitLines.forEach(line => {
      this.map.removeLayer(line);
    });
    this.circuitLines = [];

    // Redraw filtered links
    this.drawFilteredLinks(filteredRouterIds);

    // Redraw active circuits with filters
    this.drawActiveCircuits(this.circuits);
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
    this.identityMarkers.forEach((marker: any) => {
      if (this.clusteringEnabled && this.identityClusterGroup) {
        this.identityClusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }
    });

    // Add all router markers
    this.routerMarkers.forEach((marker: any) => {
      if (this.clusteringEnabled && this.routerClusterGroup) {
        this.routerClusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }
    });

    // Redraw all circuits and links when no filters are active
    this.drawActiveCircuits(this.circuits);
  }

  drawFilteredLinks(filteredRouterIds: Set<string>) {
    console.log('drawFilteredLinks called with', this.links.length, 'total links');

    this.links.forEach((link) => {
      const sourceRouter = link.sourceRouter;
      const destRouter = link.destRouter;

      if (!sourceRouter || !destRouter) {
        return;
      }

      // Only show links between filtered routers
      if (!filteredRouterIds.has(sourceRouter.id) || !filteredRouterIds.has(destRouter.id)) {
        return;
      }

      const loc1 = this.routerLocations.get(sourceRouter.id);
      const loc2 = this.routerLocations.get(destRouter.id);

      if (loc1 && loc2) {
        // Determine line color based on link state
        let lineColor = '#4A90E2'; // default blue
        let lineOpacity = 0.6;

        if (link.down) {
          lineColor = '#E74C3C'; // red for down links
          lineOpacity = 0.8;
        } else if (link.state === 'Connected') {
          lineColor = '#2ECC71'; // green for connected
          lineOpacity = 0.7;
        }

        const line = L.polyline(
          [[loc1.lat, loc1.lng], [loc2.lat, loc2.lng]],
          {
            color: lineColor,
            weight: 3,
            opacity: lineOpacity,
            smoothFactor: 1
          }
        );

        // Add click handler to open side panel
        line.on('click', () => {
          this.openSidePanel('link', {
            link: link,
            sourceRouter: sourceRouter,
            destRouter: destRouter,
            locations: { source: loc1, dest: loc2 }
          });
        });

        if (this.linksVisible) {
          line.addTo(this.map);
        }

        this.circuitLines.push(line);
      }
    });

    console.log(`Drew ${this.circuitLines.length} filtered link lines`);
  }

  drawActiveCircuits(circuits: any[], isSelectedCircuit: boolean = false) {
    console.log('drawActiveCircuits called with', circuits.length, 'circuits', isSelectedCircuit ? '(selected)' : '');

    // Clear existing active circuit lines
    this.activeCircuitLines.forEach(line => {
      this.map.removeLayer(line);
    });
    this.activeCircuitLines = [];

    // Get set of currently visible router IDs
    const visibleRouterIds = new Set<string>();
    this.edgeRouters.forEach(router => {
      visibleRouterIds.add(router.id);
    });

    // Get set of currently visible service IDs
    const visibleServiceIds = new Set<string>();
    this.services.forEach(service => {
      visibleServiceIds.add(service.id);
    });

    circuits.forEach((circuit) => {
      // Handle both old format (path array) and new format (path.nodes array)
      const pathNodes = circuit.path?.nodes || circuit.path;

      console.log('==== PROCESSING CIRCUIT ====');
      console.log('Full circuit object:', circuit);
      console.log('Circuit path data:', {
        serviceName: circuit.service?.name,
        serviceId: circuit.service?.id,
        clientId: circuit.clientId,
        hasPath: !!circuit.path,
        hasPathNodes: !!circuit.path?.nodes,
        pathNodes: pathNodes,
        pathNodesLength: pathNodes?.length
      });
      console.log('Available identities:', this.identities.length);
      console.log('Available terminators:', this.terminators.length);
      console.log('Router locations map size:', this.routerLocations.size);
      console.log('Identity locations map size:', this.identityLocations.size);

      if (!pathNodes || pathNodes.length < 1) {
        console.log('Skipping circuit - no path nodes');
        return;
      }

      // Check if service filter is applied and if this circuit's service matches
      const circuitServiceId = circuit.service?.id;
      const circuitServiceName = circuit.service?.name;
      console.log('Circuit service:', circuitServiceName, 'ID:', circuitServiceId);
      console.log('Visible service IDs:', Array.from(visibleServiceIds));
      console.log('Selected service attributes:', this.selectedServiceAttributes);

      if (this.selectedServiceAttributes.length > 0) {
        // Service filter is applied - check if circuit's service is visible
        if (!circuitServiceId || !visibleServiceIds.has(circuitServiceId)) {
          console.log('Skipping circuit because service does not match filter. Service ID:', circuitServiceId, 'is not in visible services');
          return;
        } else {
          console.log('Circuit service matches filter!');
        }
      }

      // Check if all routers in this circuit path are visible
      const allRoutersVisible = pathNodes.every((node: any) => {
        const routerId = node.id || node.routerId || node;
        return visibleRouterIds.has(routerId);
      });

      if (!allRoutersVisible) {
        console.log('Skipping circuit because not all routers are visible');
        return;
      }

      // Collect all coordinates in the full path: client identity → routers → hosting identity
      const pathCoordinates: [number, number][] = [];
      const routerNames: string[] = [];
      const entityIds: string[] = [];
      const entityTypes: string[] = [];

      // 1. Add client identity as starting point
      // Try to get clientId from tags first, then other locations
      const clientId = circuit.tags?.clientId ||
                       circuit.clientId ||
                       circuit.client?.id ||
                       circuit.sourceId ||
                       circuit.initiator?.id;
      console.log('Looking for client identity with ID:', clientId, 'from circuit:', circuit.id);
      console.log('Circuit tags:', circuit.tags);

      if (clientId) {
        const clientIdentity = this.identities.find(id => id.id === clientId);
        if (clientIdentity) {
          const clientLoc = this.identityLocations.get(clientIdentity.id);
          if (clientLoc) {
            pathCoordinates.push([clientLoc.lat, clientLoc.lng]);
            routerNames.push(clientIdentity.name || 'Client');
            entityIds.push(clientIdentity.id);
            entityTypes.push('identity');
            console.log('Added client identity:', clientIdentity.name, clientLoc);
          } else {
            console.log('Client identity found but no location data for:', clientIdentity.name);
          }
        } else {
          console.log('Client identity not found in identities array for ID:', clientId);
        }
      } else {
        console.log('No clientId found in circuit (checked clientId, tags.clientId, client.id, sourceId, initiator.id)');
        console.log('Full circuit object for debugging:', JSON.stringify(circuit, null, 2));
      }

      // 2. Add all routers in the circuit path
      for (const node of pathNodes) {
        const routerId = node.id || node.routerId || node;
        const routerName = node.name || routerId;
        const loc = this.routerLocations.get(routerId);

        console.log('Processing path node:', { routerId, routerName, hasLocation: !!loc, location: loc });

        if (loc) {
          pathCoordinates.push([loc.lat, loc.lng]);
          routerNames.push(routerName);
          entityIds.push(routerId);
          entityTypes.push('routers');
        }
      }

      // 3. Add hosting identity as endpoint (find terminator for this service)
      const serviceId = circuit.service?.id;
      const hostIdFromTags = circuit.tags?.hostId;
      const terminatorIdFromCircuit = circuit.terminator?.id || circuit.terminatorId;
      console.log('Looking for hosting identity. ServiceId:', serviceId, 'HostId from tags:', hostIdFromTags, 'Terminator ID:', terminatorIdFromCircuit);

      // First try to get hostId from circuit tags
      let hostIdentityId = hostIdFromTags;

      // If not in tags, try to find the specific terminator for this circuit
      if (!hostIdentityId && terminatorIdFromCircuit) {
        const terminator = this.terminators.find(t => t.id === terminatorIdFromCircuit);
        console.log('Found terminator by circuit terminator ID:', terminator);
        if (terminator) {
          hostIdentityId = terminator.hostId || terminator.identity?.id || terminator.identityId;
          console.log('Got hostIdentityId from specific terminator:', hostIdentityId);
        }
      }

      // If still not found, try to find any terminator for this service (fallback)
      if (!hostIdentityId && serviceId) {
        const terminator = this.terminators.find(t =>
          t.serviceId === serviceId ||
          t.service === serviceId ||
          t.service?.id === serviceId
        );
        console.log('Found terminator by service ID (fallback):', terminator);
        if (terminator) {
          hostIdentityId = terminator.hostId || terminator.identity?.id || terminator.identityId;
          console.log('Got hostIdentityId from terminator:', hostIdentityId);
        }
      }

      if (hostIdentityId) {
        console.log('Looking for hosting identity with ID:', hostIdentityId);
        const hostIdentity = this.identities.find(id => id.id === hostIdentityId);
        console.log('Found hosting identity:', hostIdentity);
        if (hostIdentity) {
          const hostLoc = this.identityLocations.get(hostIdentity.id);
          console.log('Hosting identity location:', hostLoc);
          if (hostLoc) {
            pathCoordinates.push([hostLoc.lat, hostLoc.lng]);
            routerNames.push(hostIdentity.name || 'Host');
            entityIds.push(hostIdentity.id);
            entityTypes.push('identity');
            console.log('Added hosting identity:', hostIdentity.name, hostLoc);
          } else {
            console.log('Hosting identity found but no location');
          }
        } else {
          console.log('Hosting identity not found in identities array');
        }
      } else {
        console.log('No hosting identity ID found (checked tags and terminators)');
      }

      console.log('Path coordinates collected:', pathCoordinates.length, 'nodes (client + routers + host)');

      // Draw individual line segments between each hop in the circuit
      if (pathCoordinates.length >= 2) {
        for (let i = 0; i < pathCoordinates.length - 1; i++) {
          const start = pathCoordinates[i];
          const end = pathCoordinates[i + 1];

          // Get the active circuit color from CSS variables
          const activeCircuitColor = getComputedStyle(document.documentElement).getPropertyValue('--activeCircuitColor').trim() || '#833b82';

          // Check if this specific segment is selected
          const isThisSegmentSelected = this.selectedCircuitSegment &&
                                        this.selectedCircuitSegment.circuitId === circuit.id &&
                                        this.selectedCircuitSegment.segmentIndex === i;

          // Use enhanced styling for the selected segment only
          const lineOptions: any = {
            color: isThisSegmentSelected ? '#f4c905' : (isSelectedCircuit ? activeCircuitColor : activeCircuitColor),
            weight: isThisSegmentSelected ? 4 : 3,
            opacity: isThisSegmentSelected ? 1 : 0.9,
            smoothFactor: 1,
            pane: 'overlayPane', // Higher z-index to render above router links
            dashArray: isThisSegmentSelected ? '15, 5' : '10, 5',
            className: isThisSegmentSelected ? 'active-circuit-line selected-circuit-line' : 'active-circuit-line'
          };

          const line = L.polyline([start, end], lineOptions);

          // Add click handler to open side panel
          line.on('click', () => {
            this.openSidePanel('circuit', {
              circuit: circuit,
              segment: {
                index: i,
                total: pathCoordinates.length - 1,
                from: routerNames[i],
                to: routerNames[i + 1],
                fromId: entityIds[i],
                toId: entityIds[i + 1],
                fromType: entityTypes[i],
                toType: entityTypes[i + 1]
              },
              pathNodes: pathNodes,
              pathCoordinates: pathCoordinates,
              routerNames: routerNames,
              entityIds: entityIds,
              entityTypes: entityTypes
            });
          });

          // Add line to map if circuits are visible OR if a specific circuit is selected (override mode)
          const isOverrideMode = this.isCircuitSelectionActive();
          if (this.activeCircuitsVisible || isOverrideMode) {
            line.addTo(this.map);
          }

          this.activeCircuitLines.push(line);
        }
      }
    });

    console.log(`Drew ${this.activeCircuitLines.length} active circuit line segments from ${circuits.length} circuits`);
  }

  toggleActiveCircuits() {
    // If a circuit is selected, clear the selection first
    if (this.isCircuitSelectionActive()) {
      this.selectedCircuit = null;
      this.selectedCircuitRouters = [];
      this.selectedUnlocatedCircuit = null;
      this.selectedUnlocatedCircuitRouters = [];
      this.clearActiveCircuits();
    }

    this.activeCircuitsVisible = !this.activeCircuitsVisible;

    if (this.activeCircuitsVisible) {
      // Show all circuits (not selected)
      this.drawActiveCircuits(this.circuits, false);
    } else {
      // Hide all circuits
      this.activeCircuitLines.forEach(line => {
        this.map.removeLayer(line);
      });
    }
  }

  toggleRouters() {
    this.routersVisible = !this.routersVisible;
    this.checkRouters();
  }

  toggleIdentities() {
    this.identitiesVisible = !this.identitiesVisible;
    this.checkIdentities();
  }

  checkRouters() {
    if (this.routersVisible) {
      // Show routers
      if (this.routerClusterGroup && this.clusteringEnabled) {
        this.routerClusterGroup.addTo(this.map);
      } else {
        this.routerMarkers.forEach(marker => marker.addTo(this.map));
      }
    } else {
      // Hide routers
      if (this.routerClusterGroup && this.clusteringEnabled) {
        this.map.removeLayer(this.routerClusterGroup);
      } else {
        this.routerMarkers.forEach(marker => this.map.removeLayer(marker));
      }
    }
  }

  checkIdentities() {
    if (this.identitiesVisible) {
      // Show identities
      if (this.identityClusterGroup && this.clusteringEnabled) {
        this.identityClusterGroup.addTo(this.map);
      } else {
        this.identityMarkers.forEach(marker => marker.addTo(this.map));
      }
    } else {
      // Hide identities
      if (this.identityClusterGroup && this.clusteringEnabled) {
        this.map.removeLayer(this.identityClusterGroup);
      } else {
        this.identityMarkers.forEach(marker => this.map.removeLayer(marker));
      }
    }
  }

  // Helper methods to get ID from marker
  getMarkerIdentityId(marker: any): string | null {
    return this.markerToIdentityId.get(marker) || null;
  }

  getMarkerRouterId(marker: any): string | null {
    return this.markerToRouterId.get(marker) || null;
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
      this.showConnectionStatusFilterSelector = true;
      defer(() => {
        this.connectionStatusFilterSelector?.nativeElement?.focus();
      })
    });
  }

  closeConnectionStatusFilter(event?: any) {
    this.showConnectionStatusFilterSelector = false;
  }

  onConnectionStatusChange(event?: any) {
    console.log('Connection status changed:', this.selectedConnectionStatus);
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  clearFilters(event) {
    this.selectedIdentityAttributes = [];
    this.selectedIdentityNamedAttributes = [];
    this.selectedRouterAttributes = [];
    this.selectedServiceAttributes = [];
    this.selectedConnectionStatus = 'all';
    this.reloadMapDataWithFilters();
  }

  onRouterRoleAttributesChange(attributes: any[]) {
    console.log('Router role attributes changed:', attributes);
    this.selectedRouterAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  onIdentityRoleAttributesChange(attributes: any[]) {
    console.log('Identity role attributes changed:', attributes);
    this.selectedIdentityAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  onIdentityNamedAttributesChange(attributes: any[]) {
    console.log('Identity named attributes changed:', attributes);
    this.selectedIdentityNamedAttributes = attributes;
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
    console.log('Service role attributes changed:', attributes);
    this.selectedServiceAttributes = attributes;
    this.reloadMapDataWithFilters();
    this.checkAppliedFilters();
  }

  checkAppliedFilters() {
    if (this.selectedRouterAttributes.length === 0 &&
        this.selectedIdentityAttributes.length === 0 &&
        this.selectedIdentityNamedAttributes.length === 0 &&
        this.selectedServiceAttributes.length === 0 &&
        this.selectedConnectionStatus === 'all') {
      this.filtersApplied = false;
    } else {
      this.filtersApplied = true;
    }
  }

  reloadMapDataWithFilters() {
    // Save reference to ALL location data before filtering
    // This ensures circuits can reference any identity/router
    const allRouterLocations = new Map(this.routerLocations);
    const allIdentityLocations = new Map(this.identityLocations);

    // Clear existing markers and lines
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }
    this.circuitLines.forEach(line => this.map.removeLayer(line));
    this.circuitLines = [];
    this.activeCircuitLines.forEach(line => this.map.removeLayer(line));
    this.activeCircuitLines = [];

    this.identityMarkers = [];
    this.routerMarkers = [];

    // Reload data with filters
    const mapPromise = this.loadMapData();

    mapPromise.then(() => {
      // Restore ALL location data so circuits can find any router/identity
      allRouterLocations.forEach((value, key) => {
        if (!this.routerLocations.has(key)) {
          this.routerLocations.set(key, value);
        }
      });
      allIdentityLocations.forEach((value, key) => {
        if (!this.identityLocations.has(key)) {
          this.identityLocations.set(key, value);
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

    console.log('Filtering with:', {
      identityIds: filteredIdentityIds.size,
      serviceIds: filteredServiceIds.size,
      routerIds: filteredRouterIds.size
    });

    // If no filters active, show all
    if (this.selectedRouterAttributes.length === 0 &&
        this.selectedIdentityAttributes.length === 0 &&
        this.selectedIdentityNamedAttributes.length === 0 &&
        this.selectedServiceAttributes.length === 0) {
      // Show all markers
      this.showAllMarkers();
      // Redraw all circuits and links
      if (this.circuits.length > 0) {
        this.drawActiveCircuits(this.circuits);
      }
      if (this.links.length > 0) {
        this.drawLinks(this.links);
      }
      return;
    }

    // Clear markers to redraw only filtered ones
    if (this.identityClusterGroup) {
      this.identityClusterGroup.clearLayers();
    }
    if (this.routerClusterGroup) {
      this.routerClusterGroup.clearLayers();
    }

    // Filter circuits to only those involving filtered identities, services, and routers
    const filteredCircuits = this.circuits.filter(circuit => {
      const matchesService = filteredServiceIds.size === 0 || filteredServiceIds.has(circuit.service?.id);
      const circuitClientId = circuit.clientId || circuit.tags?.clientId;
      const matchesIdentity = filteredIdentityIds.size === 0 || filteredIdentityIds.has(circuitClientId);

      // Check if circuit path contains any of the filtered routers
      let matchesRouter = this.selectedRouterAttributes.length === 0;
      if (!matchesRouter) {
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

    // Start with filtered identities and routers (from role attributes)
    filteredIdentityIds.forEach(id => identityIdsToShow.add(id));
    filteredRouterIds.forEach(id => routerIdsToShow.add(id));

    // Add identities from filtered circuits
    filteredCircuits.forEach(circuit => {
      const circuitClientId = circuit.clientId || circuit.tags?.clientId;
      if (circuitClientId) {
        identityIdsToShow.add(circuitClientId);
      }
    });

    // Add hosting identities from terminators for filtered services
    this.terminators.forEach(terminator => {
      const terminatorServiceId = terminator.serviceId || terminator.service?.id;
      if (filteredServiceIds.has(terminatorServiceId)) {
        const hostIdentityId = terminator.hostId || terminator.identity?.id || terminator.identityId;
        if (hostIdentityId) {
          identityIdsToShow.add(hostIdentityId);
        }
        if (terminator.routerId) {
          routerIdsToShow.add(terminator.routerId);
        }
      }
    });

    // Add routers from filtered circuits
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

    console.log('Showing:', {
      identities: identityIdsToShow.size,
      routers: routerIdsToShow.size
    });

    // Filter and redraw identity markers
    this.identityMarkers.forEach((marker: any) => {
      const identityId = this.getMarkerIdentityId(marker);
      if (identityId && identityIdsToShow.has(identityId)) {
        if (this.clusteringEnabled && this.identityClusterGroup) {
          this.identityClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    // Filter and redraw router markers
    this.routerMarkers.forEach((marker: any) => {
      const routerId = this.getMarkerRouterId(marker);
      if (routerId && routerIdsToShow.has(routerId)) {
        if (this.clusteringEnabled && this.routerClusterGroup) {
          this.routerClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }
      }
    });

    // Clear existing circuit and link lines
    this.circuitLines.forEach(line => this.map.removeLayer(line));
    this.circuitLines = [];
    this.activeCircuitLines.forEach(line => this.map.removeLayer(line));
    this.activeCircuitLines = [];

    // Redraw filtered circuits
    this.drawActiveCircuits(filteredCircuits);

    // Filter and redraw links
    const filteredLinks = this.links.filter(link => {
      const sourceId = link.sourceRouter?.id;
      const destId = link.destRouter?.id;
      return routerIdsToShow.has(sourceId) && routerIdsToShow.has(destId);
    });
    this.drawLinks(filteredLinks);
  }

  openSidePanel(type: 'marker' | 'link' | 'circuit' | 'unlocated', data: any) {
    // Clear previous selected marker icon
    if (this.selectedMarker) {
      this.updateMarkerIcon(this.selectedMarker, false);
      this.selectedMarker = null;
    }

    // Clear previous circuit selection when opening a new panel
    if (type !== 'circuit') {
      this.selectedCircuitSegment = null;
    }

    this.sidePanelType = type;
    this.sidePanelData = data;
    this.sidePanelOpen = true;

    // Handle circuit panel - track the selected segment and build hops/routers data
    if (type === 'circuit' && data?.circuit && data?.segment) {
      this.selectedCircuitSegment = {
        circuitId: data.circuit.id,
        segmentIndex: data.segment.index
      };

      // Build circuit hops data from the full path (including identities)
      const circuitHops = this.buildCircuitHops(data);
      const circuitRouters = this.buildCircuitRouters(data.pathNodes);

      // Add hops and routers to sidePanelData
      this.sidePanelData = {
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
      this.sidePanelCircuits = this.getEntityCircuits(data.item.id, data.type);

      // Find and mark the selected marker
      const marker = this.findMarkerByItemId(data.item.id, data.type);
      if (marker) {
        this.selectedMarker = marker;
        this.updateMarkerIcon(marker, true);
      }
    } else {
      this.sidePanelCircuits = [];
    }

    // Trigger map resize after panel opens
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  showUnlocatedEntities() {
    // Filter identities without geolocation tags
    const unlocatedIdentities = this.identities.filter(identity =>
      !identity.tags?.geolocation || identity.tags.geolocation.trim() === ''
    );

    // Filter routers without geolocation tags
    const unlocatedRouters = this.edgeRouters.filter(router =>
      !router.tags?.geolocation || router.tags.geolocation.trim() === ''
    );

    console.log(`Found ${unlocatedIdentities.length} unlocated identities and ${unlocatedRouters.length} unlocated routers`);

    // Open side panel with unlocated entities
    this.openSidePanel('unlocated', {
      unlocatedIdentities,
      unlocatedRouters
    });
  }

  openEntityPreview(entity: any, type: string) {
    // Store the preview entity to display below the unlocated lists
    this.unlocatedPreviewEntity = entity;
    this.unlocatedPreviewType = type;
    // Clear unsaved flag when clicking on a row (only set by drag & drop)
    this.unlocatedPreviewHasUnsavedLocation = false;
    // Get circuits for this entity
    this.unlocatedPreviewCircuits = this.getEntityCircuits(entity.id, type);
  }

  // Drag and drop handlers for unlocated entities
  onDragStart(event: DragEvent, entity: any, type: string): void {
    console.log('Drag started for:', entity.name, 'type:', type);
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
    console.log('Drop event on map:', event);

    // Remove visual feedback from map container
    const mapContainer = (event.currentTarget as HTMLElement).closest('.map-container');
    if (mapContainer) {
      mapContainer.classList.remove('drag-over');
    }

    // Remove global grabbing cursor
    document.body.classList.remove('dragging-entity');

    if (!this.draggedEntity) {
      console.log('No dragged entity');
      return;
    }

    // Get the map container element
    const mapElement = document.getElementById('MainMap');
    if (!mapElement) {
      console.error('Map container not found');
      return;
    }

    // Get the bounds of the map container
    const rect = mapElement.getBoundingClientRect();

    // Calculate the position relative to the map container
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log('Drop coordinates relative to map:', x, y);

    // Convert pixel coordinates to lat/lng
    const point = L.point(x, y);
    const latLng = this.map.containerPointToLatLng(point);

    console.log('Converted to lat/lng:', latLng.lat, latLng.lng);

    // Store entity info before clearing drag state
    const droppedEntity = this.draggedEntity;
    const droppedEntityType = this.draggedEntityType;

    // Update entity geolocation
    this.updateGeolocationLocal(droppedEntity, latLng.lat, latLng.lng, droppedEntityType);

    // Create marker for the newly located entity
    console.log('Creating marker for newly located entity:', droppedEntity.name);
    this.addMarkers([droppedEntity], droppedEntityType);

    // Enable drag mode on the newly created marker
    setTimeout(() => {
      // Find the newly created marker
      const markers = droppedEntityType === 'identity' ? this.identityMarkers : this.routerMarkers;
      const newMarker = markers.find((m: any) => m._itemData?.id === droppedEntity.id);

      if (newMarker) {
        console.log('Enabling drag on newly created marker:', droppedEntity.name);
        newMarker.dragging.enable();
        this.currentDraggableMarker = newMarker;

        // Apply visual styling
        const markerElement = newMarker.getElement();
        if (markerElement) {
          const cssClass = droppedEntityType === 'identity' ? 'marker-draggable-active-identity' : 'marker-draggable-active-router';
          markerElement.classList.add(cssClass);
        }
      }
    }, 100);

    // Open entity preview with unsaved location flag
    this.unlocatedPreviewEntity = droppedEntity;
    this.unlocatedPreviewType = droppedEntityType;
    this.unlocatedPreviewHasUnsavedLocation = true;
    // Get circuits for this entity
    this.unlocatedPreviewCircuits = this.getEntityCircuits(droppedEntity.id, droppedEntityType);

    // Refresh unlocated entities list
    setTimeout(() => {
      this.showUnlocatedEntities();
    }, 500);

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
    console.log('Drag left map area');
  }

  closeSidePanel() {
    // Clear selected marker icon
    if (this.selectedMarker) {
      this.updateMarkerIcon(this.selectedMarker, false);
      this.selectedMarker = null;
    }

    // Clear selected circuit segment
    this.selectedCircuitSegment = null;

    // Clear selected router in path
    this.selectedRouterInPath = null;

    // Clear selected circuit and restore all circuits if they were visible
    if (this.selectedCircuit) {
      this.selectedCircuit = null;
      this.selectedCircuitRouters = [];
      this.clearActiveCircuits();
      if (this.activeCircuitsVisible) {
        this.drawActiveCircuits(this.circuits, false);
      }
    }

    this.sidePanelOpen = false;
    this.sidePanelType = null;
    this.sidePanelData = null;

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
      this.router.navigateByUrl(`/services/${id}`);
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
    const location = this.routerLocations.get(router.id);

    // Open side panel with router data
    this.openSidePanel('marker', {
      type: 'routers',
      item: router,
      location: location
    });
  }

  openIdentityPanel(identity: any) {
    if (!identity || !identity.id) return;

    // Get identity location
    const location = this.identityLocations.get(identity.id);

    // Open side panel with identity data
    this.openSidePanel('marker', {
      type: 'identity',
      item: identity,
      location: location
    });
  }

  openServicePanel(service: any) {
    if (!service || !service.id) return;

    // Services don't have a dedicated panel type yet, so navigate to details page
    this.navigateToDetails('services', service.id);
  }

  openEntityPanel(entityId: string, entityType: string) {
    if (!entityId || !entityType) return;

    if (entityType === 'identity') {
      // Find the identity
      const identity = this.identities.find(id => id.id === entityId);
      if (identity) {
        this.openIdentityPanel(identity);
      }
    } else if (entityType === 'routers') {
      // Find the router
      const router = this.edgeRouters.find(r => r.id === entityId);
      if (router) {
        this.openRouterPanel(router);
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
    console.log(`Updating geolocation locally for ${type} ${item.name} (${item.id}) to ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    // Update the item's tags with new geolocation
    const geolocationString = `${lat},${lng}`;

    console.log('Before update:', {
      itemId: item.id,
      oldGeolocation: item.tags?.geolocation,
      newGeolocation: geolocationString
    });

    // Prepare the updated tags
    const updatedTags = {
      ...item.tags,
      geolocation: geolocationString
    };

    // Update the item locally (no backend save)
    item.tags = updatedTags;

    console.log('After update:', {
      itemId: item.id,
      currentGeolocation: item.tags.geolocation
    });

    // Update the location in our maps
    if (type === 'routers') {
      this.routerLocations.set(item.id, { lat, lng, name: item.name });
    } else if (type === 'identity') {
      this.identityLocations.set(item.id, { lat, lng, name: item.name });
    }

    // Redraw circuits/links since position changed
    if (this.linksVisible) {
      this.drawLinks(this.links);
    }
    if (this.activeCircuitsVisible) {
      this.drawActiveCircuits(this.circuits);
    }
  }

  showMarkerContextMenu(event: any, marker: any, item: any, type: string): void {
    console.log('showMarkerContextMenu called', { item: item.name, type, event });

    // Remove any existing context menu
    const existingMenu = document.getElementById('marker-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'marker-context-menu';
    menu.style.position = 'fixed'; // Changed to fixed for better positioning
    menu.style.left = `${event.originalEvent.clientX}px`;
    menu.style.top = `${event.originalEvent.clientY}px`;
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    menu.style.zIndex = '99999';
    menu.style.minWidth = '150px';
    menu.style.padding = '0.25rem 0';

    console.log('Menu created at position:', event.originalEvent.clientX, event.originalEvent.clientY);

    // Create menu item
    const menuItem = document.createElement('div');
    menuItem.textContent = 'Enable Drag/Drop';
    menuItem.style.padding = '0.5rem 1rem';
    menuItem.style.cursor = 'pointer';
    menuItem.style.color = '#333';
    menuItem.style.transition = 'background-color 0.2s ease';

    // Add hover effect
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f0f0f0';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    // Add click handler
    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`Enabling drag/drop for ${item.name}`);

      // Disable any previously draggable marker
      if (this.currentDraggableMarker && this.currentDraggableMarker !== marker) {
        this.currentDraggableMarker.dragging.disable();
        // Remove visual styling from previous marker
        const prevElement = this.currentDraggableMarker.getElement();
        const prevType = (this.currentDraggableMarker as any)._itemType;
        if (prevElement) {
          prevElement.classList.remove('marker-draggable-active-identity');
          prevElement.classList.remove('marker-draggable-active-router');
        }
      }

      // Enable dragging on this marker
      marker.dragging.enable();
      this.currentDraggableMarker = marker;

      // Add visual styling to indicate drag mode (type-specific)
      const markerElement = marker.getElement();
      if (markerElement) {
        const cssClass = type === 'identity' ? 'marker-draggable-active-identity' : 'marker-draggable-active-router';
        markerElement.classList.add(cssClass);
      }

      menu.remove();
    });

    menu.appendChild(menuItem);

    // Create "Remove Geolocation" menu item
    const removeMenuItem = document.createElement('div');
    removeMenuItem.textContent = 'Remove Geolocation';
    removeMenuItem.style.padding = '0.5rem 1rem';
    removeMenuItem.style.cursor = 'pointer';
    removeMenuItem.style.color = '#d32f2f';
    removeMenuItem.style.transition = 'background-color 0.2s ease';
    removeMenuItem.style.borderTop = '1px solid #e0e0e0';

    // Add hover effect
    removeMenuItem.addEventListener('mouseenter', () => {
      removeMenuItem.style.backgroundColor = '#ffebee';
    });
    removeMenuItem.addEventListener('mouseleave', () => {
      removeMenuItem.style.backgroundColor = 'transparent';
    });

    // Add click handler for remove
    removeMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`Opening confirm dialog for removing geolocation from ${item.name}`);

      // Close the context menu first
      menu.remove();

      // Show confirm dialog
      const confirmData = {
        appendId: 'RemoveGeolocation',
        title: 'Remove Geolocation',
        message: `Are you sure you want to remove the geolocation tag from <strong>${item.name}</strong>?<br><br>This will remove the marker from the map and the entity will appear in the unlocated entities list.`,
        confirmLabel: 'Yes, Remove',
        cancelLabel: 'Cancel',
        showCancelLink: true,
        imageUrl: '../../assets/svgs/Growl_Warning.svg',
      };

      this.dialogRef = this.dialogForm.open(ConfirmComponent, {
        data: confirmData,
        autoFocus: false,
      });

      this.dialogRef.afterClosed().subscribe({
        next: (result: any) => {
          if (!result?.confirmed) {
            console.log('Remove geolocation cancelled');
            return;
          }

          console.log(`Removing geolocation for ${item.name}`);

          // Remove the marker from the map
          if (type === 'identity') {
            this.identityClusterGroup.removeLayer(marker);
            this.identityMarkers = this.identityMarkers.filter((m: any) => m !== marker);
            this.identityLocations.delete(item.id);
          } else if (type === 'routers') {
            this.routerClusterGroup.removeLayer(marker);
            this.routerMarkers = this.routerMarkers.filter((m: any) => m !== marker);
            this.routerLocations.delete(item.id);
          }

          // Remove geolocation tag from item
          if (item.tags) {
            delete item.tags.geolocation;
          }

          // Remove from original locations tracking
          this.originalLocations.delete(item.id);

          // If this was the draggable marker, clear it
          if (this.currentDraggableMarker === marker) {
            this.currentDraggableMarker = null;
          }

          // Show success message
          const successGrowler = new GrowlerModel(
            'success',
            'Geolocation Removed',
            `Geolocation removed from ${item.name}. The entity will appear in the unlocated list.`
          );
          this.growlerService.show(successGrowler);
        }
      });
    });

    menu.appendChild(removeMenuItem);
    document.body.appendChild(menu);
    console.log('Menu appended to body, total menus:', document.querySelectorAll('#marker-context-menu').length);

    // Remove menu when clicking elsewhere
    const removeMenu = (e: Event) => {
      if (!menu.contains(e.target as Node)) {
        console.log('Removing menu');
        menu.remove();
        document.removeEventListener('click', removeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 100);
  }

  navigateToRoleAttribute(role: string) {
    if (!role) return;

    const searchFilter = {
      columnId: 'roleAttributes',
      value: role,
      label: '#' + role,
      filterName: 'Role Attribute',
      type: 'ATTRIBUTE'
    };
    localStorage.setItem('search_filters', JSON.stringify([searchFilter]));
    this.router.navigate(['/identities'], {
      queryParams: { roleAttributes: role }
    });
  }

  getEntityOnlineStatus(item: any): boolean {
    // Check both isOnline and connected properties (routers use 'connected')
    return item?.isOnline ?? item?.connected ?? false;
  }

  hasUnsavedLocationChanges(item: any): boolean {
    if (!item || !item.id) return false;

    const originalLocation = this.originalLocations.get(item.id);
    const currentLocation = item.tags?.geolocation;

    // If no original location stored, store it now and return false
    if (!originalLocation && currentLocation) {
      this.originalLocations.set(item.id, currentLocation);
      return false;
    }

    // Compare original vs current
    return originalLocation !== currentLocation;
  }

  async saveLocationChanges(item: any, type: string): Promise<void> {
    if (!item || !item.id) return;

    try {
      console.log(`Saving location changes for ${type} ${item.name} (${item.id})`);

      // Prepare the update payload with just the tags
      const updatePayload = {
        tags: item.tags
      };

      // Call the appropriate backend service
      if (type === 'routers') {
        // Determine router type (edge-router or transit-router)
        const routerType = this.routerTypes.get(item.id) || item._routerType || 'edge-router';
        console.log(`Router type for ${item.name}: ${routerType}`);

        if (routerType === 'transit-router') {
          await this.zitiDataService.patch('transit-routers', updatePayload, item.id);
        } else {
          await this.zitiDataService.patch('edge-routers', updatePayload, item.id);
        }
      } else if (type === 'identity') {
        await this.zitiDataService.patch('identities', updatePayload, item.id);
      }

      // Update the original location to the new saved value
      this.originalLocations.set(item.id, item.tags.geolocation);

      console.log(`Successfully saved location for ${item.name}`);
      const successGrowler = new GrowlerModel(
        'success',
        'Location Saved',
        `Location for ${item.name} has been saved successfully`
      );
      this.growlerService.show(successGrowler);

    } catch (error) {
      console.error('Error saving location:', error);
      const errorMessage = this.zitiDataService.getErrorMessage(error);
      const errorGrowler = new GrowlerModel(
        'error',
        'Save Failed',
        `Failed to save location: ${errorMessage}`
      );
      this.growlerService.show(errorGrowler);
    }
  }

  async saveUnlocatedPreviewEntity(): Promise<void> {
    if (!this.unlocatedPreviewEntity || !this.unlocatedPreviewHasUnsavedLocation) {
      return;
    }

    await this.saveLocationChanges(this.unlocatedPreviewEntity, this.unlocatedPreviewType);

    // Clear the unsaved flag after successful save
    this.unlocatedPreviewHasUnsavedLocation = false;

    // Close the preview
    this.unlocatedPreviewEntity = null;
    this.unlocatedPreviewType = '';
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
      }

      return false;
    });

    return matchedCircuits;
  }

  clearActiveCircuits(): void {
    this.activeCircuitLines.forEach(line => {
      this.map.removeLayer(line);
    });
    this.activeCircuitLines = [];
  }

  isCircuitSelectionActive(): boolean {
    return !!(this.selectedCircuit || this.selectedUnlocatedCircuit);
  }

  selectCircuit(circuit: any, isUnlocatedPanel: boolean = false): void {
    if (isUnlocatedPanel) {
      // Toggle selection - if already selected, deselect it
      if (this.selectedUnlocatedCircuit?.id === circuit.id) {
        this.selectedUnlocatedCircuit = null;
        this.selectedUnlocatedCircuitRouters = [];
        this.selectedCircuitSegment = null; // Clear segment selection
        // Clear circuit display and show all circuits if they were visible
        this.clearActiveCircuits();
        if (this.activeCircuitsVisible) {
          this.drawActiveCircuits(this.circuits, false);
        }
      } else {
        this.selectedUnlocatedCircuit = circuit;
        this.selectedUnlocatedCircuitRouters = this.getCircuitRouters(circuit);
        this.selectedCircuitSegment = null; // Clear segment selection when selecting from list
        // Show only this circuit on the map (no segment highlighting from circuit list)
        this.clearActiveCircuits();
        this.drawActiveCircuits([circuit], false);
      }
    } else {
      // Toggle selection - if already selected, deselect it
      if (this.selectedCircuit?.id === circuit.id) {
        this.selectedCircuit = null;
        this.selectedCircuitRouters = [];
        this.selectedCircuitSegment = null; // Clear segment selection
        // Clear circuit display and show all circuits if they were visible
        this.clearActiveCircuits();
        if (this.activeCircuitsVisible) {
          this.drawActiveCircuits(this.circuits, false);
        }
      } else {
        this.selectedCircuit = circuit;
        this.selectedCircuitRouters = this.getCircuitRouters(circuit);
        this.selectedCircuitSegment = null; // Clear segment selection when selecting from list
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

      // If node already has full details, return it
      if (node.name) {
        return node;
      }

      // Otherwise, try to find the router in our edgeRouters array
      const router = this.edgeRouters.find(r => r.id === routerId);
      if (router) {
        return router;
      }

      // If not found, return basic info
      return {
        id: routerId,
        name: routerId,
        _notFound: true
      };
    });
  }

  findMarkerByItemId(itemId: string, itemType: string): any {
    // Check identity cluster group
    if (itemType === 'identity' && this.identityClusterGroup) {
      const markers = this.identityClusterGroup.getLayers();
      for (const marker of markers) {
        if ((marker as any)._itemData?.id === itemId) {
          return marker;
        }
      }
    }

    // Check router cluster group
    if (itemType === 'routers' && this.routerClusterGroup) {
      const markers = this.routerClusterGroup.getLayers();
      for (const marker of markers) {
        if ((marker as any)._itemData?.id === itemId) {
          return marker;
        }
      }
    }

    return null;
  }

  updateMarkerIcon(marker: any, isSelected: boolean): void {
    if (!marker) return;

    const itemType = (marker as any)._itemType;
    let iconUrl: string;

    if (isSelected) {
      iconUrl = itemType === 'identity'
        ? '/assets/svgs/identity-marker-selected.svg'
        : '/assets/svgs/router-marker-selected.svg';
    } else {
      iconUrl = itemType === 'identity'
        ? '/assets/svgs/identity-marker.svg'
        : '/assets/svgs/router-marker.svg';
    }

    const newIcon = L.icon({
      iconUrl,
      iconRetinaUrl: iconUrl,
      shadowUrl: '/assets/scripts/components/leaflet/images/marker-shadow.png',
      iconSize: [40, 60],
      iconAnchor: [20, 54],
      popupAnchor: [0, -50],
      tooltipAnchor: [16, -28],
      shadowSize: [62, 62]
    });

    marker.setIcon(newIcon);
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
    this.selectedCircuitSegment = {
      circuitId: this.sidePanelData?.circuit?.id,
      segmentIndex: index
    };

    // Store the current circuit data before redrawing
    const currentCircuit = this.sidePanelData.circuit;
    const currentCircuitHops = this.sidePanelData.circuitHops;
    const currentCircuitRouters = this.sidePanelData.circuitRouters;
    const currentPathNodes = this.sidePanelData.pathNodes;
    const currentPathCoordinates = this.sidePanelData.pathCoordinates;
    const currentRouterNames = this.sidePanelData.routerNames;
    const currentEntityIds = this.sidePanelData.entityIds;
    const currentEntityTypes = this.sidePanelData.entityTypes;

    // Redraw the circuit with the new selected segment highlighted
    this.clearActiveCircuits();
    this.drawActiveCircuits([currentCircuit], false);

    // Restore the panel state to circuit type with updated segment
    this.sidePanelType = 'circuit';
    this.sidePanelData = {
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

    // Find the router/identity entity
    if (routerType === 'identity') {
      const identity = this.identities.find(id => id.id === routerId);
      if (identity) {
        this.openIdentityPanel(identity);
      }
    } else if (routerType === 'routers') {
      const router = this.edgeRouters.find(r => r.id === routerId);
      if (router) {
        this.openRouterPanel(router);
      }
    }

    // After opening the router/identity panel, restore the selected circuit display
    // The circuit should remain visible and highlighted on the map
    if (this.selectedCircuit || this.selectedUnlocatedCircuit) {
      // Keep the circuit visible on the map
      setTimeout(() => {
        this.clearActiveCircuits();
        const circuit = this.selectedCircuit || this.selectedUnlocatedCircuit;
        this.drawActiveCircuits([circuit], false);
      }, 0);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
