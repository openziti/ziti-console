import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface CircuitRouter {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

@Component({
  selector: 'lib-router-path-table',
  templateUrl: './router-path-table.component.html',
  styleUrls: ['./router-path-table.component.scss']
})
export class RouterPathTableComponent {
  @Input() circuitRouters: CircuitRouter[] = [];
  @Input() selectedRouterId: string | null = null;

  @Output() routerSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() entityPanelOpened = new EventEmitter<{entityId: string, entityType: string}>();

  /**
   * Handle opening entity panel
   */
  onOpenEntityPanel(router: CircuitRouter, event: Event): void {
    event.stopPropagation();
    this.entityPanelOpened.emit({ entityId: router.id, entityType: router.type });
  }
}
