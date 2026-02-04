import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lib-marker-panel',
  templateUrl: './marker-panel.component.html',
  styleUrls: ['./marker-panel.component.scss']
})
export class MarkerPanelComponent {
  @Input() markerData: any = null;
  @Input() circuits: any[] = [];
  @Input() selectedCircuit: any = null;
  @Input() selectedCircuitRouters: any[] = [];
  @Input() selectedRouterInPath: string | null = null;

  @Output() circuitSelected = new EventEmitter<any>();
  @Output() routerInPathSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() saveLocationChanges = new EventEmitter<{item: any, type: string}>();
  @Output() navigateToDetails = new EventEmitter<{type: string, id: string}>();
  @Output() circuitPreviewOpened = new EventEmitter<any>();
  @Output() roleAttributeNavigated = new EventEmitter<string>();

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
   * Navigate to role attribute
   */
  onRoleAttributeClick(role: string): void {
    this.roleAttributeNavigated.emit(role);
  }
}
