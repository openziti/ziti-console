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
  selector: 'lib-unlocated-panel',
  templateUrl: './unlocated-panel.component.html',
  styleUrls: ['./unlocated-panel.component.scss'],
  standalone: false
})
export class UnlocatedPanelComponent implements OnChanges {
  @Input() unlocatedData: any = null;
  @Input() filteredIdentities: any[] = [];
  @Input() filteredRouters: any[] = [];
  @Input() identitiesSearch: string = '';
  @Input() routersSearch: string = '';
  @Input() previewEntity: any = null;
  @Input() previewType: string = '';
  @Input() previewCircuits: any[] = [];
  @Input() previewHasUnsavedLocation: boolean = false;
  @Input() selectedCircuit: any = null;
  @Input() selectedCircuitRouters: any[] = [];
  @Input() selectedRouterInPath: string | null = null;
  @Input() allIdentities: any[] = [];
  @Input() allRouters: any[] = [];

  @Output() identitiesSearchChanged = new EventEmitter<string>();
  @Output() routersSearchChanged = new EventEmitter<string>();
  @Output() entityDragStarted = new EventEmitter<{event: DragEvent, entity: any, type: string}>();
  @Output() entityClicked = new EventEmitter<{entity: any, type: string}>();
  @Output() previewClosed = new EventEmitter<void>();
  @Output() saveLocationClicked = new EventEmitter<void>();
  @Output() circuitSelected = new EventEmitter<any>();
  @Output() routerInPathSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() navigateToDetails = new EventEmitter<{type: string, id: string}>();
  @Output() circuitPreviewOpened = new EventEmitter<any>();
  @Output() roleAttributeNavigated = new EventEmitter<string>();

  // Service grouping
  serviceGroups: ServiceGroup[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewCircuits']) {
      this.updateServiceGroups();
    }
  }

  /**
   * Handle identities search change
   */
  onIdentitiesSearchChange(search: string): void {
    this.identitiesSearchChanged.emit(search);
  }

  /**
   * Handle routers search change
   */
  onRoutersSearchChange(search: string): void {
    this.routersSearchChanged.emit(search);
  }

  /**
   * Handle drag start
   */
  onDragStart(event: DragEvent, entity: any, type: string): void {
    this.entityDragStarted.emit({ event, entity, type });
  }

  /**
   * Handle entity click
   */
  onEntityClick(entity: any, type: string): void {
    this.entityClicked.emit({ entity, type });
  }

  /**
   * Close preview
   */
  onPreviewClose(): void {
    this.previewClosed.emit();
  }

  /**
   * Save location
   */
  onSaveLocation(): void {
    this.saveLocationClicked.emit();
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
   * Navigate to details
   */
  onNavigateToDetails(): void {
    this.navigateToDetails.emit({
      type: this.previewType,
      id: this.previewEntity?.id
    });
  }

  /**
   * Navigate to role attribute
   */
  onRoleAttributeClick(role: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.roleAttributeNavigated.emit(role);
  }

  /**
   * Update service groups - group circuits by service and apply filtering
   */
  updateServiceGroups(): void {
    let processed = [...this.previewCircuits];

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
   * Get client entity info from circuit
   */
  getClientInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    const clientId = circuit.tags?.clientId || circuit.clientId || circuit.client?.id || 'Unknown';
    return this.getEntityInfo(clientId);
  }

  /**
   * Get host entity info from circuit
   */
  getHostInfo(circuit: any): { name: string; type: 'identity' | 'router' } {
    const hostId = circuit.tags?.hostId || circuit.hostId || circuit.host?.id || 'Unknown';
    return this.getEntityInfo(hostId);
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
