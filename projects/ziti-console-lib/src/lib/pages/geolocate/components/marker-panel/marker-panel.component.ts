import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CircuitCalculationService } from '../../services/circuit-calculation.service';

interface ServiceGroup {
  serviceName: string;
  serviceId: string;
  circuits: any[];
  expanded: boolean;
  sortBy?: 'created';
  sortDirection?: 'asc' | 'desc';
}

@Component({
  selector: 'lib-marker-panel',
  templateUrl: './marker-panel.component.html',
  styleUrls: ['./marker-panel.component.scss'],
  standalone: false
})
export class MarkerPanelComponent implements OnChanges {
  @Input() markerData: any = null;
  @Input() circuits: any[] = [];
  @Input() selectedCircuit: any = null;
  @Input() selectedCircuitRouters: any[] = [];
  @Input() selectedRouterInPath: string | null = null;
  @Input() allIdentities: any[] = [];
  @Input() allRouters: any[] = [];
  @Input() allTerminators: any[] = [];

  @Output() circuitSelected = new EventEmitter<any>();
  @Output() routerInPathSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() saveLocationChanges = new EventEmitter<{item: any, type: string}>();
  @Output() navigateToDetails = new EventEmitter<{type: string, id: string}>();
  @Output() circuitPreviewOpened = new EventEmitter<any>();
  @Output() roleAttributeNavigated = new EventEmitter<string>();
  @Output() panelClosed = new EventEmitter<void>();

  // Service grouping
  serviceGroups: ServiceGroup[] = [];

  constructor(private circuitCalculationService: CircuitCalculationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['circuits']) {
      this.updateServiceGroups();
    }
  }

  /**
   * Get entity online status
   */
  getEntityOnlineStatus(entity: any): boolean {
    if (!entity) return false;
    // For routers, check 'connected' property
    if (entity.connected !== undefined) {
      return entity.connected === true;
    }
    // For identities, check 'isOnline' property
    if (entity.isOnline !== undefined) {
      return entity.isOnline === true;
    }
    return false;
  }

  /**
   * Check if entity has unsaved location changes
   */
  hasUnsavedLocationChanges(item: any): boolean {
    if (!item || !item._unsavedLocation) return false;
    return true;
  }

  /**
   * Select a circuit
   */
  onCircuitSelect(circuit: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.circuitSelected.emit(circuit);
  }

  /**
   * Open circuit preview (detail view)
   */
  onCircuitPreviewOpen(circuit: any, event: MouseEvent): void {
    event.stopPropagation();
    this.circuitPreviewOpened.emit(circuit);
  }

  /**
   * Select a router in the circuit path
   */
  onRouterInPathSelect(routerId: string, routerType: string): void {
    this.routerInPathSelected.emit({ routerId, routerType });
  }

  /**
   * Save location changes for the entity
   */
  onSaveLocationChanges(): void {
    this.saveLocationChanges.emit({
      item: this.markerData?.item,
      type: this.markerData?.type
    });
  }

  /**
   * Navigate to entity details page
   */
  onNavigateToDetails(): void {
    this.navigateToDetails.emit({
      type: this.markerData?.type,
      id: this.markerData?.item?.id
    });
  }

  /**
   * Close the marker panel
   */
  onCancel(): void {
    this.panelClosed.emit();
  }

  /**
   * Navigate to role attribute
   */
  onRoleAttributeClick(role: string): void {
    this.roleAttributeNavigated.emit(role);
  }

  /**
   * Update service groups - group circuits by service and apply filtering
   */
  updateServiceGroups(): void {
    let processed = [...this.circuits];

    // Pre-compute client/host info for all circuits to avoid repeated computation in templates
    processed.forEach(circuit => {
      if (!circuit._clientInfo) {
        circuit._clientInfo = this.computeClientInfo(circuit);
      }
      if (!circuit._hostInfo) {
        circuit._hostInfo = this.computeHostInfo(circuit);
      }
    });

    // Group circuits by service
    const serviceMap = new Map<string, ServiceGroup>();

    processed.forEach(circuit => {
      const serviceId = circuit.service?.id || 'unknown';
      const serviceName = circuit.service?.name || 'Unknown Service';

      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          serviceName,
          serviceId,
          circuits: [],
          expanded: false
        });
      }

      serviceMap.get(serviceId)!.circuits.push(circuit);
    });

    // Convert to array and sort by service name
    this.serviceGroups = Array.from(serviceMap.values()).sort((a, b) =>
      a.serviceName.localeCompare(b.serviceName)
    );
  }

  /**
   * Toggle service group expansion
   */
  toggleGroup(group: ServiceGroup, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    group.expanded = !group.expanded;
  }

  /**
   * Toggle sort for a service group
   */
  toggleSort(group: ServiceGroup): void {
    if (group.sortBy === 'created') {
      group.sortDirection = group.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      group.sortBy = 'created';
      group.sortDirection = 'desc';
    }
  }

  /**
   * Get entity name and type from ID
   */
  getEntityInfo(entityId: string): { name: string; type: 'identity' | 'router' } {
    // Try to find in identities first
    const identity = this.allIdentities.find(i => i.id === entityId);
    if (identity) {
      // Check if this identity is a router type
      const type = identity.typeId === 'Router' ? 'router' : 'identity';
      return { name: identity.name || entityId, type };
    }

    // Try to find in routers
    const router = this.allRouters.find(r => r.id === entityId);
    if (router) {
      return { name: router.name || entityId, type: 'router' };
    }

    // Unknown entity
    return { name: entityId, type: 'identity' };
  }

  /**
   * Compute client entity info from circuit (called once during data processing)
   */
  private computeClientInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    // Try to get client ID from various circuit fields
    // Note: Fabric API circuits typically don't include client identity information
    const clientId = (circuit.tags?.clientId && circuit.tags.clientId.trim()) ||
                     circuit.clientId ||
                     circuit.client?.id ||
                     circuit.sourceId ||
                     circuit.initiator?.id ||
                     null;

    if (!clientId) {
      // Client identity is not available from Fabric API circuit data
      // This is expected behavior - the Fabric API doesn't track client identities
      return { name: 'N/A', type: 'identity' };
    }

    return this.getEntityInfo(clientId);
  }

  /**
   * Compute host entity info from circuit (called once during data processing)
   */
  private computeHostInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    // Use CircuitCalculationService to find host identity from terminators
    let hostId = this.circuitCalculationService.findHostIdentityId(circuit, this.allTerminators);

    // Fallback to checking circuit fields directly
    if (!hostId) {
      hostId = (circuit.tags?.hostId && circuit.tags.hostId.trim()) ||
               circuit.hostId ||
               circuit.host?.id ||
               null;
    }

    if (!hostId) {
      // No host identity found - check if this is a router-hosted terminator
      const terminatorIdFromCircuit = circuit.terminator?.id || circuit.terminatorId;
      const matchingTerminator = this.allTerminators.find(t => t.id === terminatorIdFromCircuit);

      if (matchingTerminator) {
        // Check if terminator has a router - router-hosted services have empty identity field
        const routerId = matchingTerminator.routerId || matchingTerminator.router?.id;
        if (routerId) {
          // This is a router-hosted terminator - return the router as the host
          const router = this.allRouters.find(r => r.id === routerId);
          if (router) {
            return { name: router.name || routerId, type: 'router' };
          }
          return { name: routerId, type: 'router' };
        }
      }

      return { name: 'Unknown', type: 'identity' };
    }

    return this.getEntityInfo(hostId);
  }

  /**
   * Get cached client entity info from circuit (used in templates)
   */
  getClientInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    return circuit._clientInfo || this.computeClientInfo(circuit);
  }

  /**
   * Get cached host entity info from circuit (used in templates)
   */
  getHostInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    return circuit._hostInfo || this.computeHostInfo(circuit);
  }

  /**
   * Get sorted circuits for a group - dual sort with created date as primary when active
   */
  getSortedCircuits(group: ServiceGroup): any[] {
    return [...group.circuits].sort((a, b) => {
      // If created sort is active, use it as primary sort
      if (group.sortBy === 'created') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        const dateCompare = group.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;

        if (dateCompare !== 0) {
          return dateCompare;
        }

        // If dates are the same, sort by client name as secondary
        const clientA = this.getClientInfo(a).name.toLowerCase();
        const clientB = this.getClientInfo(b).name.toLowerCase();
        return clientA.localeCompare(clientB);
      }

      // Default: sort by client name first, then by created date
      const clientA = this.getClientInfo(a).name.toLowerCase();
      const clientB = this.getClientInfo(b).name.toLowerCase();
      const clientCompare = clientA.localeCompare(clientB);

      if (clientCompare !== 0) {
        return clientCompare;
      }

      // If client names are the same, sort by created date (descending)
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }
}
