import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lib-circuit-panel',
  templateUrl: './circuit-panel.component.html',
  styleUrls: ['./circuit-panel.component.scss'],
  standalone: false
})
export class CircuitPanelComponent {
  @Input() circuitData: any = null;
  @Input() selectedSegmentIndex: number | null = null;
  @Input() selectedRouterId: string | null = null;
  @Input() previewEntity: any = null;
  @Input() previewEntityType: string = '';

  @Output() hopSelected = new EventEmitter<{hop: any, index: number}>();
  @Output() routerSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() entityClicked = new EventEmitter<{entityId: string, entityType: string}>();
  @Output() serviceClicked = new EventEmitter<any>();
  @Output() previewClosed = new EventEmitter<void>();
  @Output() navigateToDetails = new EventEmitter<{type: string, id: string}>();
  @Output() entityPanelOpened = new EventEmitter<{entityId: string, entityType: string}>();

  /**
   * Handle hop selection from circuit hops table
   */
  onHopSelected(event: {hop: any, index: number}): void {
    this.hopSelected.emit(event);
  }

  /**
   * Handle router selection from router path table
   */
  onRouterSelected(event: {routerId: string, routerType: string}): void {
    this.routerSelected.emit(event);
  }

  /**
   * Handle entity click (identity/router in circuit endpoints)
   */
  onEntityClick(entityId: string, entityType: string): void {
    this.entityClicked.emit({ entityId, entityType });
  }

  /**
   * Handle service click
   */
  onServiceClick(service: any): void {
    this.serviceClicked.emit(service);
  }

  /**
   * Close the entity preview
   */
  closePreview(): void {
    this.previewClosed.emit();
  }

  /**
   * Handle navigate to details from router path table
   */
  onNavigateToDetails(event: {type: string, id: string}): void {
    this.navigateToDetails.emit(event);
  }

  /**
   * Handle entity panel opening from router path table or preview
   */
  onEntityPanelOpened(event: {entityId: string, entityType: string}): void {
    this.entityPanelOpened.emit(event);
  }
}
