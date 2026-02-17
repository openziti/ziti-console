import { Injectable } from '@angular/core';

export interface CircuitHop {
  from: string;
  fromType: string;
  fromId: string;
  fromHasLocation: boolean;
  to: string;
  toType: string;
  toId: string;
  toHasLocation: boolean;
  isVisible: boolean;
}

export interface CircuitPathData {
  pathNodes: any[];
  pathCoordinates: [number, number][];
  routerNames: string[];
  entityIds: string[];
  entityTypes: string[];
  circuitHops: CircuitHop[]; // All logical hops with 'isVisible' flag
  circuitRouters: any[];
  clientId: string | null;
  clientName: string;
  hostId: string | null;
  hostName: string;
  hasCompleteGeolocation: boolean; // Whether all entities have geolocation data
  missingLocations: string[]; // List of entity names missing geolocation
  visibleSegmentToHopIndex: Map<number, number>; // Maps visual segment index to logical hop index
}

@Injectable({
  providedIn: 'root'
})
export class CircuitPathBuilderService {
  /**
   * Builds complete circuit path data structure with coordinates, hops, and router details
   * @param circuit - The circuit object
   * @param routerLocations - Map of router IDs to location data
   * @param identityLocations - Map of identity IDs to location data
   * @param routers - Array of all router objects
   * @param identities - Array of all identity objects
   * @returns Complete circuit path data or null if path cannot be built
   */
  buildCircuitPathData(
    circuit: any,
    routerLocations: Map<string, any>,
    identityLocations: Map<string, any>,
    routers: any[],
    identities: any[]
  ): CircuitPathData | null {
    // Extract path nodes (handle both string IDs and objects with id property)
    const rawPathNodes = circuit.path?.nodes || circuit.path || [];
    const pathNodes = rawPathNodes.map((node: any) => node.id || node);
    const pathCoordinates: [number, number][] = [];
    const routerNames: string[] = [];
    const entityIds: string[] = [];
    const entityTypes: string[] = [];
    const missingLocations: string[] = [];

    // Extract client and host information
    const clientId = circuit.tags?.clientId || circuit.clientId || circuit.client?.id || circuit.sourceId || circuit.initiator?.id;
    const hostId = circuit.tags?.hostId || circuit.host?.id;

    // Find client and host names
    const clientIdentity = identities.find(id => id.id === clientId);
    const clientName = clientIdentity?.name || 'Unknown Client';

    const hostIdentity = identities.find(id => id.id === hostId);
    const hostName = hostIdentity?.name || 'Unknown Host';

    // Get client location (continue even if not found)
    const clientLocation = identityLocations.get(clientId);
    if (!clientLocation) {
      missingLocations.push(clientName);
    } else {
      // Add client identity as first node
      pathCoordinates.push([clientLocation.lat, clientLocation.lng]);
      entityIds.push(clientId);
      entityTypes.push('identity');
    }

    // Add router nodes to path
    for (const routerId of pathNodes) {
      const router = routers.find(r => r.id === routerId);
      const routerName = router?.name || routerId;
      const routerLocation = routerLocations.get(routerId);
      if (routerLocation) {
        pathCoordinates.push([routerLocation.lat, routerLocation.lng]);
        routerNames.push(routerLocation.name);
        entityIds.push(routerId);
        entityTypes.push('routers');
      } else {
        missingLocations.push(routerName);
      }
    }

    // Get host location (continue even if not found)
    const hostLocation = identityLocations.get(hostId);
    if (!hostLocation) {
      missingLocations.push(hostName);
    } else {
      // Add host identity as last node
      pathCoordinates.push([hostLocation.lat, hostLocation.lng]);
      entityIds.push(hostId);
      entityTypes.push('identity');
    }

    // Build circuit hops for display (from/to pairs for each segment)
    // Include all entities (even those without geolocation) for complete circuit info
    const circuitHops: CircuitHop[] = [];
    const allNodeNames: string[] = [];
    const allNodeIds: string[] = [];
    const allNodeTypes: string[] = [];
    const allNodeHasLocation: boolean[] = [];

    // Add client (always, even without geolocation)
    allNodeNames.push(clientName);
    allNodeIds.push(clientId || '');
    allNodeTypes.push('identity');
    allNodeHasLocation.push(!!clientLocation);

    // Add routers from path
    for (const routerId of pathNodes) {
      const router = routers.find(r => r.id === routerId);
      const routerName = router?.name || routerId;
      const routerLocation = routerLocations.get(routerId);

      allNodeNames.push(routerLocation?.name || routerName);
      allNodeIds.push(routerId);
      allNodeTypes.push('routers');
      allNodeHasLocation.push(!!routerLocation);
    }

    // Add host (always, even without geolocation)
    allNodeNames.push(hostName);
    allNodeIds.push(hostId || '');
    allNodeTypes.push('identity');
    allNodeHasLocation.push(!!hostLocation);

    // Build hops from complete node lists and track which are visible on the map
    // A hop is visible if both its endpoints have geolocation data
    const visibleSegmentToHopIndex = new Map<number, number>();
    let visibleSegmentIndex = 0;

    for (let i = 0; i < allNodeNames.length - 1; i++) {
      const fromHasLocation = allNodeHasLocation[i];
      const toHasLocation = allNodeHasLocation[i + 1];
      const isVisible = fromHasLocation && toHasLocation;

      circuitHops.push({
        from: allNodeNames[i],
        to: allNodeNames[i + 1],
        fromId: allNodeIds[i],
        toId: allNodeIds[i + 1],
        fromType: allNodeTypes[i],
        toType: allNodeTypes[i + 1],
        isVisible: isVisible,
        fromHasLocation: fromHasLocation,
        toHasLocation: toHasLocation
      });

      // Map visual segment index to logical hop index for visible segments
      if (isVisible) {
        visibleSegmentToHopIndex.set(visibleSegmentIndex, i);
        visibleSegmentIndex++;
      }
    }

    // Build detailed router list for circuit path display
    const circuitRouters: any[] = [];
    for (const routerId of pathNodes) {
      const router = routers.find(r => r.id === routerId);
      const routerLocation = routerLocations.get(routerId);

      if (router) {
        circuitRouters.push({
          id: router.id,
          name: routerLocation?.name || router.name || routerId,
          type: 'routers',
          connected: router.connected ?? router.isOnline ?? false,
          _notFound: false
        });
      } else {
        // Router not found in our data
        circuitRouters.push({
          id: routerId,
          name: routerLocation?.name || routerId,
          type: 'routers',
          connected: false,
          _notFound: true
        });
      }
    }

    return {
      pathNodes,
      pathCoordinates,
      routerNames,
      entityIds,
      entityTypes,
      circuitHops,
      circuitRouters,
      clientId,
      clientName,
      hostId,
      hostName,
      hasCompleteGeolocation: missingLocations.length === 0,
      missingLocations,
      visibleSegmentToHopIndex
    };
  }

  /**
   * Builds a simplified circuit path for rendering (coordinates only)
   * @param circuit - The circuit object
   * @param routerLocations - Map of router IDs to location data
   * @param identityLocations - Map of identity IDs to location data
   * @returns Array of coordinates or null if path cannot be built
   */
  buildSimpleCircuitPath(
    circuit: any,
    routerLocations: Map<string, any>,
    identityLocations: Map<string, any>
  ): [number, number][] | null {
    const pathNodes = circuit.path?.nodes || circuit.path || [];
    const pathCoordinates: [number, number][] = [];

    // Extract client and host IDs
    const clientId = circuit.tags?.clientId || circuit.clientId || circuit.client?.id || circuit.sourceId || circuit.initiator?.id;
    const hostId = circuit.tags?.hostId || circuit.host?.id;

    // Get client location
    const clientLocation = identityLocations.get(clientId);
    if (!clientLocation) {
      return null;
    }
    pathCoordinates.push([clientLocation.lat, clientLocation.lng]);

    // Add router locations
    for (const routerId of pathNodes) {
      const routerLocation = routerLocations.get(routerId);
      if (routerLocation) {
        pathCoordinates.push([routerLocation.lat, routerLocation.lng]);
      }
    }

    // Get host location
    const hostLocation = identityLocations.get(hostId);
    if (!hostLocation) {
      return null;
    }
    pathCoordinates.push([hostLocation.lat, hostLocation.lng]);

    return pathCoordinates.length >= 2 ? pathCoordinates : null;
  }
}
