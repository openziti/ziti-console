import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

interface ServiceGroup {
  serviceName: string;
  serviceId: string;
  circuits: any[];
  expanded: boolean;
  sortBy?: 'created';
  sortDirection?: 'asc' | 'desc';
}

@Component({
  selector: 'lib-services-with-circuits-panel',
  templateUrl: './services-with-circuits-panel.component.html',
  styleUrls: ['./services-with-circuits-panel.component.scss']
})
export class ServicesWithCircuitsPanelComponent implements OnChanges {
  @Input() allCircuits: any[] = [];
  @Input() allIdentities: any[] = [];
  @Input() allRouters: any[] = [];
  @Input() searchTerm: string = '';
  @Input() selectedCircuit: any = null;

  @Output() searchChanged = new EventEmitter<string>();
  @Output() circuitSelected = new EventEmitter<any>();
  @Output() circuitPreviewOpened = new EventEmitter<any>();

  serviceGroups: ServiceGroup[] = [];
  totalCircuits: number = 0;
  previewCircuit: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allCircuits'] || changes['allIdentities'] || changes['allRouters'] || changes['searchTerm']) {
      this.updateServiceGroups();
    }
  }

  /**
   * Update service groups - group circuits by service and apply search filter
   */
  updateServiceGroups(): void {
    // Start with all circuits
    let filtered = [...this.allCircuits];

    // Pre-compute client/host info for all circuits to avoid repeated computation in templates
    filtered.forEach(circuit => {
      if (!circuit._clientInfo) {
        circuit._clientInfo = this.computeClientInfo(circuit);
      }
      if (!circuit._hostInfo) {
        circuit._hostInfo = this.computeHostInfo(circuit);
      }
    });

    // Apply search filter if present
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(circuit => {
        const serviceName = circuit.service?.name || '';
        return serviceName.toLowerCase().includes(searchLower);
      });
    }

    // Group circuits by service
    const serviceMap = new Map<string, ServiceGroup>();

    filtered.forEach(circuit => {
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

    this.totalCircuits = this.allCircuits.length;
  }

  /**
   * Handle search input change
   */
  onSearchChange(search: string): void {
    this.searchChanged.emit(search);
  }

  /**
   * Handle circuit row click - opens preview and displays on map
   */
  onCircuitClick(circuit: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.previewCircuit = circuit;
    // Emit to show circuit on map
    this.circuitSelected.emit(circuit);
  }

  /**
   * Close the circuit preview
   */
  closePreview(): void {
    this.previewCircuit = null;
  }

  /**
   * View full circuit details - opens full circuit panel
   */
  viewFullCircuitDetails(): void {
    if (this.previewCircuit) {
      this.circuitPreviewOpened.emit(this.previewCircuit);
    }
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
    // Handle empty strings from API - use explicit checks instead of || operator
    const clientId = (circuit.tags?.clientId && circuit.tags.clientId.trim()) ||
                     circuit.clientId ||
                     circuit.client?.id ||
                     'Unknown';
    return this.getEntityInfo(clientId);
  }

  /**
   * Compute host entity info from circuit (called once during data processing)
   */
  private computeHostInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    // Handle empty strings from API - use explicit checks instead of || operator
    const hostId = (circuit.tags?.hostId && circuit.tags.hostId.trim()) ||
                   circuit.hostId ||
                   circuit.host?.id ||
                   'Unknown';
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
   * Get total circuits across all groups
   */
  getTotalCircuitsInGroups(): number {
    return this.serviceGroups.reduce((sum, group) => sum + group.circuits.length, 0);
  }

  /**
   * Toggle sort for a service group
   */
  toggleSort(group: ServiceGroup): void {
    if (group.sortBy === 'created') {
      // Toggle direction
      group.sortDirection = group.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set to sort by created, default to descending (newest first)
      group.sortBy = 'created';
      group.sortDirection = 'desc';
    }
  }

  /**
   * Get sorted circuits for a group - always dual sort by client name first, then by created date
   */
  getSortedCircuits(group: ServiceGroup): any[] {
    return [...group.circuits].sort((a, b) => {
      // First, sort by client name
      const clientA = this.getClientInfo(a).name.toLowerCase();
      const clientB = this.getClientInfo(b).name.toLowerCase();
      const clientCompare = clientA.localeCompare(clientB);

      if (clientCompare !== 0) {
        return clientCompare;
      }

      // If client names are the same, sort by created date
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      // Apply direction if sort is enabled, otherwise default to descending
      const direction = group.sortBy === 'created' ? group.sortDirection : 'desc';
      if (direction === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  }
}
