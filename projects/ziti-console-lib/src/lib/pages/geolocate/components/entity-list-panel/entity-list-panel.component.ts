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
  selector: 'lib-entity-list-panel',
  templateUrl: './entity-list-panel.component.html',
  styleUrls: ['./entity-list-panel.component.scss']
})
export class EntityListPanelComponent implements OnChanges {
  @Input() entityType: string = '';
  @Input() entities: any[] = [];
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 20;
  @Input() totalEntities: number = 0;
  @Input() searchTerm: string = '';
  @Input() previewEntity: any = null;
  @Input() previewCircuits: any[] = [];
  @Input() selectedCircuit: any = null;
  @Input() selectedCircuitRouters: any[] = [];
  @Input() selectedRouterInPath: string | null = null;
  @Input() Math: any = Math;
  @Input() allIdentities: any[] = [];
  @Input() allRouters: any[] = [];

  @Output() searchChanged = new EventEmitter<string>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() entityClicked = new EventEmitter<any>();
  @Output() previewClosed = new EventEmitter<void>();
  @Output() circuitSelected = new EventEmitter<any>();
  @Output() routerInPathSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() saveLocationChanges = new EventEmitter<{item: any, type: string}>();
  @Output() navigateToDetails = new EventEmitter<{type: string, id: string}>();
  @Output() circuitPreviewOpened = new EventEmitter<any>();
  @Output() roleAttributeNavigated = new EventEmitter<string>();
  @Output() sortChanged = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Service grouping
  serviceGroups: ServiceGroup[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewCircuits']) {
      this.updateServiceGroups();
    }
  }

  /**
   * Get total pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalEntities / this.pageSize);
  }

  /**
   * Toggle sort for a column
   */
  toggleSort(column: string): void {
    if (this.sortColumn === column) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to descending for circuit count, ascending for others
      this.sortColumn = column;
      this.sortDirection = column === 'activeCircuitCount' ? 'desc' : 'asc';
    }
    this.sortChanged.emit({ column: this.sortColumn, direction: this.sortDirection });
  }

  /**
   * Get page numbers for pagination display
   */
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push(-1, total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }

    return rangeWithDots;
  }

  /**
   * Handle search input change
   */
  onSearchChange(search: string): void {
    this.searchChanged.emit(search);
  }

  /**
   * Handle page change
   */
  onPageChange(page: number): void {
    this.pageChanged.emit(page);
  }

  /**
   * Handle entity row click
   */
  onEntityClick(entity: any): void {
    this.entityClicked.emit(entity);
  }

  /**
   * Close preview pane
   */
  onPreviewClose(): void {
    this.previewClosed.emit();
  }

  /**
   * Get entity online status
   */
  getEntityOnlineStatus(entity: any): boolean {
    if (!entity) return false;
    if (entity.connected !== undefined) {
      return entity.connected === true;
    }
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
   * Open circuit preview
   */
  onCircuitPreviewOpen(circuit: any, event: MouseEvent): void {
    event.stopPropagation();
    this.circuitPreviewOpened.emit(circuit);
  }

  /**
   * Select router in path
   */
  onRouterInPathSelect(routerId: string, routerType: string): void {
    this.routerInPathSelected.emit({ routerId, routerType });
  }

  /**
   * Save location changes
   */
  onSaveLocationChanges(): void {
    this.saveLocationChanges.emit({
      item: this.previewEntity?.item,
      type: this.previewEntity?.type
    });
  }

  /**
   * Navigate to details
   */
  onNavigateToDetails(): void {
    this.navigateToDetails.emit({
      type: this.previewEntity?.type,
      id: this.previewEntity?.item?.id
    });
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
    let processed = [...this.previewCircuits];

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
  toggleCircuitSort(group: ServiceGroup): void {
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
