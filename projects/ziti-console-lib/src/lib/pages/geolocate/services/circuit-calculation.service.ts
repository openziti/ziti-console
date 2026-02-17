import { Injectable } from '@angular/core';

export interface CircuitPathNode {
  id: string;
  name: string;
  type: 'identity' | 'routers';
  lat: number;
  lng: number;
}

export interface CircuitPath {
  nodes: CircuitPathNode[];
  coordinates: [number, number][];
}

@Injectable({
  providedIn: 'root'
})
export class CircuitCalculationService {
  constructor() {}

  /**
   * Find the host identity ID for a circuit using various fallback strategies
   */
  findHostIdentityId(
    circuit: any,
    terminators: any[]
  ): string | null {
    // Handle empty strings explicitly - API returns empty strings instead of null/undefined
    const hostIdFromTags = (circuit.tags?.hostId && circuit.tags.hostId.trim()) || null;
    const terminatorIdFromCircuit = circuit.terminator?.id || circuit.terminatorId;
    const serviceId = circuit.service?.id;

    // First try to get hostId from circuit tags
    let hostIdentityId = hostIdFromTags;

    // If not in tags, try to find the specific terminator for this circuit
    if (!hostIdentityId && terminatorIdFromCircuit) {
      const terminator = terminators.find(t => t.id === terminatorIdFromCircuit);
      if (terminator) {
        // Handle empty strings - check for non-empty values explicitly
        // Try: hostId, identity (string ID), identity.id (expanded object), identityId
        hostIdentityId = (terminator.hostId && terminator.hostId.trim()) ||
                         (terminator.identity && typeof terminator.identity === 'string' && terminator.identity.trim()) ||
                         terminator.identity?.id ||
                         terminator.identityId ||
                         null;
      }
    }

    // If still not found, try to find any terminator for this service (fallback)
    if (!hostIdentityId && serviceId) {
      const terminator = terminators.find(t =>
        t.serviceId === serviceId ||
        t.service === serviceId ||
        t.service?.id === serviceId
      );
      if (terminator) {
        // Handle empty strings - check for non-empty values explicitly
        // Try: hostId, identity (string ID), identity.id (expanded object), identityId
        hostIdentityId = (terminator.hostId && terminator.hostId.trim()) ||
                         (terminator.identity && typeof terminator.identity === 'string' && terminator.identity.trim()) ||
                         terminator.identity?.id ||
                         terminator.identityId ||
                         null;
      }
    }

    return hostIdentityId || null;
  }

  /**
   * Build a circuit path data structure (client identity → routers → hosting identity)
   * Returns null if the path cannot be built (missing locations, etc.)
   */
  buildCircuitPath(
    circuit: any,
    identities: any[],
    identityLocations: Map<string, { lat: number; lng: number; name: string }>,
    routerLocations: Map<string, { lat: number; lng: number; name: string }>,
    terminators: any[]
  ): CircuitPath | null {
    // Handle both old format (path array) and new format (path.nodes array)
    const pathNodes = circuit.path?.nodes || circuit.path;

    if (!pathNodes || pathNodes.length < 1) {
      return null;
    }

    const nodes: CircuitPathNode[] = [];
    const coordinates: [number, number][] = [];

    // 1. Add client identity as starting point
    const clientId = circuit.tags?.clientId ||
                     circuit.clientId ||
                     circuit.client?.id ||
                     circuit.sourceId ||
                     circuit.initiator?.id;

    if (clientId) {
      const clientIdentity = identities.find(id => id.id === clientId);
      if (clientIdentity) {
        const clientLoc = identityLocations.get(clientIdentity.id);
        if (clientLoc) {
          nodes.push({
            id: clientIdentity.id,
            name: clientIdentity.name || 'Client',
            type: 'identity',
            lat: clientLoc.lat,
            lng: clientLoc.lng
          });
          coordinates.push([clientLoc.lat, clientLoc.lng]);
        }
      }
    }

    // 2. Add all routers in the circuit path
    for (const node of pathNodes) {
      const routerId = node.id || node.routerId || node;
      const routerName = node.name || routerId;
      const loc = routerLocations.get(routerId);

      if (loc) {
        nodes.push({
          id: routerId,
          name: routerName,
          type: 'routers',
          lat: loc.lat,
          lng: loc.lng
        });
        coordinates.push([loc.lat, loc.lng]);
      }
    }

    // 3. Add hosting identity as endpoint
    const hostIdentityId = this.findHostIdentityId(circuit, terminators);

    if (hostIdentityId) {
      const hostIdentity = identities.find(id => id.id === hostIdentityId);
      if (hostIdentity) {
        const hostLoc = identityLocations.get(hostIdentity.id);
        if (hostLoc) {
          nodes.push({
            id: hostIdentity.id,
            name: hostIdentity.name || 'Host',
            type: 'identity',
            lat: hostLoc.lat,
            lng: hostLoc.lng
          });
          coordinates.push([hostLoc.lat, hostLoc.lng]);
        }
      }
    }

    // Only return path if we have at least 2 nodes
    if (nodes.length < 2) {
      return null;
    }

    return { nodes, coordinates };
  }

  /**
   * Check if all routers in a circuit path are in the visible set
   */
  areAllRoutersVisible(
    circuit: any,
    visibleRouterIds: Set<string>
  ): boolean {
    const pathNodes = circuit.path?.nodes || circuit.path;

    if (!pathNodes || pathNodes.length < 1) {
      return false;
    }

    return pathNodes.every((node: any) => {
      const routerId = node.id || node.routerId || node;
      return visibleRouterIds.has(routerId);
    });
  }

  /**
   * Check if at least one router in a circuit path is in the visible set
   */
  hasAnyVisibleRouter(
    circuit: any,
    visibleRouterIds: Set<string>
  ): boolean {
    const pathNodes = circuit.path?.nodes || circuit.path;

    if (!pathNodes || pathNodes.length < 1) {
      return false;
    }

    return pathNodes.some((node: any) => {
      const routerId = node.id || node.routerId || node;
      return visibleRouterIds.has(routerId);
    });
  }

  /**
   * Filter a circuit path to only include visible entities
   * (all identities + only visible routers)
   */
  filterCircuitPathToVisible(
    circuitPath: CircuitPath,
    visibleRouterIds: Set<string>
  ): CircuitPath {
    const filteredNodes: CircuitPathNode[] = [];
    const filteredCoordinates: [number, number][] = [];

    circuitPath.nodes.forEach(node => {
      // Include all identities or visible routers
      if (node.type === 'identity' || visibleRouterIds.has(node.id)) {
        filteredNodes.push(node);
        filteredCoordinates.push([node.lat, node.lng]);
      }
    });

    return {
      nodes: filteredNodes,
      coordinates: filteredCoordinates
    };
  }

  /**
   * Check if a circuit's service is in the visible set
   */
  isCircuitServiceVisible(
    circuit: any,
    visibleServiceIds: Set<string>,
    hasServiceFilters: boolean
  ): boolean {
    const circuitServiceId = circuit.service?.id;

    // If service filters are applied, check if circuit's service is visible
    if (hasServiceFilters) {
      if (!circuitServiceId || !visibleServiceIds.has(circuitServiceId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate the count of unique services that have active circuits
   */
  calculateServicesWithActiveCircuits(circuits: any[]): number {
    const uniqueServiceIds = new Set<string>();
    circuits.forEach(circuit => {
      const serviceId = circuit.service?.id || circuit.serviceId;
      if (serviceId) {
        uniqueServiceIds.add(serviceId);
      }
    });
    return uniqueServiceIds.size;
  }
}
