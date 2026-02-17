import { Injectable, EventEmitter } from '@angular/core';
import { CircuitCalculationService } from './circuit-calculation.service';
import { CircuitPathBuilderService } from './circuit-path-builder.service';
import L from 'leaflet';

/**
 * Service responsible for rendering visual elements on the map
 * Handles circuit lines, router links, and their styling
 */
@Injectable({
  providedIn: 'root'
})
export class MapRenderingService {
  // Line collections
  circuitLines: any[] = [];
  activeCircuitLines: any[] = [];

  // Events for communication with component
  linkClicked = new EventEmitter<any>();
  circuitSegmentClicked = new EventEmitter<any>();

  constructor(
    private circuitCalculationService: CircuitCalculationService,
    private circuitPathBuilderService: CircuitPathBuilderService
  ) {}

  /**
   * Draws router links on the map
   * @param map - Leaflet map instance
   * @param links - Array of router links
   * @param routerLocations - Map of router locations
   * @param edgeRouters - Array of edge routers (for visibility filtering)
   * @param linksVisible - Whether links should be visible
   */
  drawLinks(
    map: any,
    links: any[],
    routerLocations: Map<string, any>,
    edgeRouters: any[],
    linksVisible: boolean
  ): void {
    // Clear existing circuit lines
    this.circuitLines.forEach(line => {
      map.removeLayer(line);
    });
    this.circuitLines = [];

    // Get set of currently visible router IDs
    const visibleRouterIds = new Set<string>();
    edgeRouters.forEach(router => {
      visibleRouterIds.add(router.id);
    });

    links.forEach((link, index) => {
      // Each link has sourceRouter and destRouter
      const sourceRouter = link.sourceRouter;
      const destRouter = link.destRouter;

      if (!sourceRouter || !destRouter) {
        return;
      }

      // Only show link if both routers are visible
      if (!visibleRouterIds.has(sourceRouter.id) || !visibleRouterIds.has(destRouter.id)) {
        return;
      }

      const loc1 = routerLocations.get(sourceRouter.id);
      const loc2 = routerLocations.get(destRouter.id);

      if (loc1 && loc2) {
        // Determine line color based on link state and latency
        let lineColor = '#4A90E2'; // default blue
        let lineOpacity = 0.6;

        if (link.down) {
          lineColor = '#E74C3C'; // red for down links
          lineOpacity = 0.8;
        } else if (link.state === 'Connected') {
          // Check latency thresholds (latency values are in nanoseconds)
          // Use the higher of source/dest latency
          const latencyNs = Math.max(link.sourceLatency || 0, link.destLatency || 0);
          const latencyMs = latencyNs / 1000000; // Convert nanoseconds to milliseconds

          // Define latency thresholds based on industry standards for network infrastructure:
          // - Under 50ms: Excellent/normal latency for network links
          // - 50-100ms: Acceptable but elevated, becomes noticeable in real-time applications
          // - Over 100ms: Poor/problematic, significantly impacts user experience
          const GOOD_LATENCY = 50;  // Green: under 50ms (excellent/normal)
          const ACCEPTABLE_LATENCY = 100;  // Yellow: 50-100ms (elevated/noticeable)
          // Red: over 100ms (poor/problematic)

          if (latencyMs < GOOD_LATENCY) {
            lineColor = '#2ECC71'; // green for excellent latency
            lineOpacity = 0.7;
          } else if (latencyMs < ACCEPTABLE_LATENCY) {
            lineColor = '#F39C12'; // yellow for elevated latency
            lineOpacity = 0.75;
          } else {
            lineColor = '#E74C3C'; // red for problematic latency
            lineOpacity = 0.8;
          }
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
          this.linkClicked.emit({
            link: link,
            sourceRouter: sourceRouter,
            destRouter: destRouter,
            locations: { source: loc1, dest: loc2 }
          });
        });

        line.addTo(map);
        this.circuitLines.push(line);
      }
    });

    this.updateLinksVisibility(map, linksVisible);
  }

  /**
   * Draws router links filtered by specific router IDs
   * @param map - Leaflet map instance
   * @param links - Array of all router links
   * @param filteredRouterIds - Set of router IDs to filter by
   * @param routerLocations - Map of router locations
   * @param linksVisible - Whether links should be visible
   */
  drawFilteredLinks(
    map: any,
    links: any[],
    filteredRouterIds: Set<string>,
    routerLocations: Map<string, any>,
    linksVisible: boolean
  ): void {
    links.forEach((link) => {
      const sourceRouter = link.sourceRouter;
      const destRouter = link.destRouter;

      if (!sourceRouter || !destRouter) {
        return;
      }

      // Only show links between filtered routers
      if (!filteredRouterIds.has(sourceRouter.id) || !filteredRouterIds.has(destRouter.id)) {
        return;
      }

      const loc1 = routerLocations.get(sourceRouter.id);
      const loc2 = routerLocations.get(destRouter.id);

      if (loc1 && loc2) {
        // Determine line color based on link state and latency
        let lineColor = '#4A90E2'; // default blue
        let lineOpacity = 0.6;

        if (link.down) {
          lineColor = '#E74C3C'; // red for down links
          lineOpacity = 0.8;
        } else if (link.state === 'Connected') {
          // Check latency thresholds (latency values are in nanoseconds)
          // Use the higher of source/dest latency
          const latencyNs = Math.max(link.sourceLatency || 0, link.destLatency || 0);
          const latencyMs = latencyNs / 1000000; // Convert nanoseconds to milliseconds

          // Define latency thresholds based on industry standards for network infrastructure:
          // - Under 50ms: Excellent/normal latency for network links
          // - 50-100ms: Acceptable but elevated, becomes noticeable in real-time applications
          // - Over 100ms: Poor/problematic, significantly impacts user experience
          const GOOD_LATENCY = 50;  // Green: under 50ms (excellent/normal)
          const ACCEPTABLE_LATENCY = 100;  // Yellow: 50-100ms (elevated/noticeable)
          // Red: over 100ms (poor/problematic)

          if (latencyMs < GOOD_LATENCY) {
            lineColor = '#2ECC71'; // green for excellent latency
            lineOpacity = 0.7;
          } else if (latencyMs < ACCEPTABLE_LATENCY) {
            lineColor = '#F39C12'; // yellow for elevated latency
            lineOpacity = 0.75;
          } else {
            lineColor = '#E74C3C'; // red for problematic latency
            lineOpacity = 0.8;
          }
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
          this.linkClicked.emit({
            link: link,
            sourceRouter: sourceRouter,
            destRouter: destRouter,
            locations: { source: loc1, dest: loc2 }
          });
        });

        if (linksVisible) {
          line.addTo(map);
        }

        this.circuitLines.push(line);
      }
    });
  }

  /**
   * Draws active circuits on the map with complex styling and interactions
   * @param map - Leaflet map instance
   * @param circuits - Array of circuits to draw
   * @param identities - Array of identities
   * @param identityLocations - Map of identity locations
   * @param routerLocations - Map of router locations
   * @param terminators - Array of terminators
   * @param edgeRouters - Array of edge routers
   * @param services - Array of services
   * @param selectedServiceAttributes - Array of selected service attribute filters
   * @param selectedServiceNamedAttributes - Array of selected service named attribute filters
   * @param selectedCircuitSegment - Currently selected circuit segment
   * @param activeCircuitsVisible - Whether active circuits should be visible
   * @param isCircuitSelectionActive - Whether a specific circuit is selected
   * @param scaleCircuitMarkersCallback - Callback to scale circuit markers
   * @returns Set of circuit marker IDs
   */
  drawActiveCircuits(
    map: any,
    circuits: any[],
    identities: any[],
    identityLocations: Map<string, any>,
    routerLocations: Map<string, any>,
    terminators: any[],
    edgeRouters: any[],
    services: any[],
    selectedServiceAttributes: any[],
    selectedServiceNamedAttributes: any[],
    selectedCircuitSegment: any,
    activeCircuitsVisible: boolean,
    isCircuitSelectionActive: boolean,
    scaleCircuitMarkersCallback: (scaleUp: boolean) => void
  ): Set<string> {
    // Clear existing active circuit lines
    this.activeCircuitLines.forEach(line => {
      map.removeLayer(line);
    });
    this.activeCircuitLines = [];

    // Scale down previous circuit markers before clearing the set
    scaleCircuitMarkersCallback(false);

    // Clear and rebuild circuit marker IDs
    const newCircuitMarkerIds = new Set<string>();

    // Get set of currently visible router IDs
    const visibleRouterIds = new Set<string>();
    edgeRouters.forEach(router => {
      visibleRouterIds.add(router.id);
    });

    // Get set of currently visible service IDs
    const visibleServiceIds = new Set<string>();
    services.forEach(service => {
      visibleServiceIds.add(service.id);
    });

    circuits.forEach((circuit) => {
      // Check if service filter is applied and if this circuit's service matches
      const hasServiceFilters = selectedServiceAttributes.length > 0 || selectedServiceNamedAttributes.length > 0;
      if (!this.circuitCalculationService.isCircuitServiceVisible(circuit, visibleServiceIds, hasServiceFilters)) {
        return;
      }

      // Check if at least one router in this circuit path is visible
      if (!this.circuitCalculationService.hasAnyVisibleRouter(circuit, visibleRouterIds)) {
        return;
      }

      // Build the circuit path data with visibility tracking
      const routers = edgeRouters; // Use edgeRouters as the routers parameter
      const circuitPathData = this.circuitPathBuilderService.buildCircuitPathData(
        circuit,
        routerLocations,
        identityLocations,
        routers,
        identities
      );

      if (!circuitPathData) {
        return;
      }

      // Only proceed if we have at least 2 visible coordinates
      if (circuitPathData.pathCoordinates.length < 2) {
        return;
      }

      const pathCoordinates = circuitPathData.pathCoordinates;
      const routerNames = circuitPathData.routerNames;
      const entityIds = circuitPathData.entityIds;
      const entityTypes = circuitPathData.entityTypes;
      const visibleSegmentToHopIndex = circuitPathData.visibleSegmentToHopIndex;

      // Track circuit marker IDs for entities with coordinates
      entityIds.forEach(id => newCircuitMarkerIds.add(id));

      // Draw individual line segments between each hop in the circuit
      if (pathCoordinates.length >= 2) {
        for (let i = 0; i < pathCoordinates.length - 1; i++) {
          const start = pathCoordinates[i];
          const end = pathCoordinates[i + 1];

          // Get the active circuit color from CSS variables
          const activeCircuitColor = getComputedStyle(document.documentElement).getPropertyValue('--activeCircuitColor').trim() || '#833b82';

          // Map visual segment index to logical hop index for selection checking
          const logicalHopIndex = visibleSegmentToHopIndex.get(i) ?? i;

          // Check if this specific segment is selected (compare against logical hop index)
          const isThisSegmentSelected = selectedCircuitSegment &&
                                        selectedCircuitSegment.circuitId === circuit.id &&
                                        selectedCircuitSegment.segmentIndex === logicalHopIndex;

          // Check if this circuit has a selected segment (but this particular segment is not it)
          const isCircuitWithSelectedSegment = selectedCircuitSegment &&
                                               selectedCircuitSegment.circuitId === circuit.id;
          const isNonSelectedSegmentOfSelectedCircuit = isCircuitWithSelectedSegment && !isThisSegmentSelected;

          // Determine styling based on selection state
          let lineColor: string;
          let lineWeight: number;
          let lineOpacity: number;
          let lineDashArray: string;

          if (isThisSegmentSelected) {
            // This is the selected segment - use active circuit color and enhanced styling
            lineColor = activeCircuitColor;
            lineWeight = 4;
            lineOpacity = 1.0;
            lineDashArray = '15, 5';
          } else if (isNonSelectedSegmentOfSelectedCircuit) {
            // This is part of the selected circuit but not the selected segment - grey and semi-transparent
            lineColor = '#999999';
            lineWeight = 2.5;
            lineOpacity = 0.55;
            lineDashArray = '10, 5';
          } else {
            // Normal segment - use standard active circuit color
            lineColor = activeCircuitColor;
            lineWeight = 3;
            lineOpacity = 0.9;
            lineDashArray = '10, 5';
          }

          // Create an invisible wider line for easier clicking (hitbox)
          const hitboxLine = L.polyline([start, end], {
            color: 'transparent',
            weight: 12,
            opacity: 0,
            smoothFactor: 1,
            pane: 'overlayPane',
            interactive: true,
            className: 'circuit-hitbox'
          });

          const lineOptions: any = {
            color: lineColor,
            weight: lineWeight,
            opacity: lineOpacity,
            smoothFactor: 1,
            pane: 'overlayPane', // Higher z-index to render above router links
            dashArray: lineDashArray,
            className: isThisSegmentSelected ? 'active-circuit-line selected-circuit-line' : 'active-circuit-line',
            interactive: false // Disable interaction on visible line, let hitbox handle it
          };

          const line = L.polyline([start, end], lineOptions);

          // Add click handler to the hitbox line
          hitboxLine.on('click', () => {
            // Map visual segment index to logical hop index
            const logicalHopIndex = visibleSegmentToHopIndex.get(i) ?? i;
            const hop = circuitPathData.circuitHops[logicalHopIndex];

            this.circuitSegmentClicked.emit({
              circuit: circuit,
              segment: {
                index: logicalHopIndex,  // Use logical hop index for correct selection
                total: circuitPathData.circuitHops.length,
                from: hop?.from || routerNames[i],
                to: hop?.to || routerNames[i + 1],
                fromId: hop?.fromId || entityIds[i],
                toId: hop?.toId || entityIds[i + 1],
                fromType: hop?.fromType || entityTypes[i],
                toType: hop?.toType || entityTypes[i + 1],
                isVisible: hop?.isVisible ?? true,
                fromHasLocation: hop?.fromHasLocation ?? true,
                toHasLocation: hop?.toHasLocation ?? true
              },
              pathNodes: circuitPathData.pathNodes,
              pathCoordinates: pathCoordinates,
              routerNames: routerNames,
              entityIds: entityIds,
              entityTypes: entityTypes,
              circuitHops: circuitPathData.circuitHops,
              visibleSegmentToHopIndex: visibleSegmentToHopIndex
            });
          });

          // Add lines to map if circuits are visible OR if a specific circuit is selected (override mode)
          if (activeCircuitsVisible || isCircuitSelectionActive) {
            hitboxLine.addTo(map); // Add hitbox first (behind)
            line.addTo(map);        // Add visible line on top
          }

          // Track both lines for cleanup
          this.activeCircuitLines.push(hitboxLine);
          this.activeCircuitLines.push(line);
        }
      }
    });

    return newCircuitMarkerIds;
  }

  /**
   * Updates visibility of router links
   * @param map - Leaflet map instance
   * @param linksVisible - Whether links should be visible
   */
  updateLinksVisibility(map: any, linksVisible: boolean): void {
    this.circuitLines.forEach(line => {
      if (linksVisible) {
        line.addTo(map);
      } else {
        map.removeLayer(line);
      }
    });
  }

  /**
   * Updates visibility of active circuits
   * @param map - Leaflet map instance
   * @param activeCircuitsVisible - Whether active circuits should be visible
   */
  updateActiveCircuitsVisibility(map: any, activeCircuitsVisible: boolean): void {
    this.activeCircuitLines.forEach(line => {
      if (activeCircuitsVisible) {
        line.addTo(map);
      } else {
        map.removeLayer(line);
      }
    });
  }

  /**
   * Clears all circuit and link lines from the map
   * @param map - Leaflet map instance
   */
  clearAllLines(map: any): void {
    this.circuitLines.forEach(line => map.removeLayer(line));
    this.circuitLines = [];
    this.activeCircuitLines.forEach(line => map.removeLayer(line));
    this.activeCircuitLines = [];
  }

  /**
   * Clears only active circuit lines from the map
   * @param map - Leaflet map instance
   */
  clearActiveCircuitLines(map: any): void {
    this.activeCircuitLines.forEach(line => map.removeLayer(line));
    this.activeCircuitLines = [];
  }

  /**
   * Clears only router link lines from the map
   * @param map - Leaflet map instance
   */
  clearCircuitLines(map: any): void {
    this.circuitLines.forEach(line => map.removeLayer(line));
    this.circuitLines = [];
  }
}
