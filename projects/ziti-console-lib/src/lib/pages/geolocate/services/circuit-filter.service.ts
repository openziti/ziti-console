import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CircuitFilterService {
  /**
   * Gets filtered identity IDs based on selected service and identity filters
   * @param identities - All identities
   * @param circuits - All circuits
   * @param terminators - All terminators
   * @param selectedServiceFilters - Selected service filters
   * @param selectedIdentityFilters - Selected identity filters
   * @returns Set of identity IDs that match the filters
   */
  getFilteredIdentityIds(
    identities: any[],
    circuits: any[],
    terminators: any[],
    selectedServiceFilters: any[],
    selectedIdentityFilters: any[]
  ): Set<string> {
    const identityIds = new Set<string>();

    // If no filters are active, return all identities
    if (selectedIdentityFilters.length === 0 && selectedServiceFilters.length === 0) {
      identities.forEach(identity => identityIds.add(identity.id));
      return identityIds;
    }

    const selectedServiceIds = new Set(selectedServiceFilters.map(s => s.id));
    const selectedIdentityIds = new Set(selectedIdentityFilters.map(i => i.id));

    // If both filters are active, start with selected identities
    if (selectedIdentityFilters.length > 0) {
      selectedIdentityFilters.forEach(identity => {
        identityIds.add(identity.id);
      });
    }

    // If service filter is active, add identities that have active or potential access to those services
    if (selectedServiceFilters.length > 0) {
      // Add identities from active circuits for selected services
      circuits.forEach(circuit => {
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
      terminators.forEach(terminator => {
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
      if (selectedIdentityFilters.length === 0) {
        identities.forEach(identity => {
          const hasAccess = terminators.some(terminator => {
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

  /**
   * Gets filtered router IDs based on selected service and identity filters
   * @param identities - All identities
   * @param circuits - All circuits
   * @param terminators - All terminators
   * @param routerLocations - Map of router locations
   * @param selectedServiceFilters - Selected service filters
   * @param selectedIdentityFilters - Selected identity filters
   * @returns Set of router IDs that match the filters
   */
  getFilteredRouterIds(
    identities: any[],
    circuits: any[],
    terminators: any[],
    routerLocations: Map<string, any>,
    selectedServiceFilters: any[],
    selectedIdentityFilters: any[]
  ): Set<string> {
    const routerIds = new Set<string>();

    // If no filters are active, show all routers
    if (selectedServiceFilters.length === 0 && selectedIdentityFilters.length === 0) {
      Array.from(routerLocations.keys()).forEach(id => routerIds.add(id));
      return routerIds;
    }

    const selectedServiceIds = new Set(selectedServiceFilters.map(s => s.id));
    const selectedIdentityIds = new Set(selectedIdentityFilters.map(i => i.id));

    // Get filtered identities first
    const filteredIdentityIds = this.getFilteredIdentityIds(
      identities,
      circuits,
      terminators,
      selectedServiceFilters,
      selectedIdentityFilters
    );

    // Add all routers from active circuits that match the filters
    circuits.forEach(circuit => {
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
      terminators.forEach(terminator => {
        const terminatorServiceId = terminator.serviceId || terminator.service?.id;
        if (selectedServiceIds.has(terminatorServiceId)) {
          routerIds.add(terminator.routerId);
        }
      });
    }

    // Add edge routers for filtered identities (routers the identities connect to)
    identities.forEach(identity => {
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
}
