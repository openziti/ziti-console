import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lib-unlocated-panel',
  templateUrl: './unlocated-panel.component.html',
  styleUrls: ['./unlocated-panel.component.scss']
})
export class UnlocatedPanelComponent {
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
  onRoleAttributeClick(role: string): void {
    this.roleAttributeNavigated.emit(role);
  }
}
