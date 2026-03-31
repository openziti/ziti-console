import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

export interface CircuitRouter {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

@Component({
  selector: 'lib-router-path-table',
  templateUrl: './router-path-table.component.html',
  styleUrls: ['./router-path-table.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default
})
export class RouterPathTableComponent implements OnChanges {
  @Input() circuitRouters: CircuitRouter[] = [];
  @Input() selectedRouterId: string | null = null;

  @Output() routerSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() entityPanelOpened = new EventEmitter<{entityId: string, entityType: string}>();

  displayRouters: CircuitRouter[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['circuitRouters']) {
      // Create a shallow copy to trigger change detection
      this.displayRouters = this.circuitRouters ? [...this.circuitRouters] : [];

      // Debug logging
      if (this.displayRouters.length > 0) {
        console.log('Router Path Table - Received routers:', this.displayRouters.length);
        console.log('Router Path Table - First router:', this.displayRouters[0]);
      } else {
        console.warn('Router Path Table - No routers received');
      }

      this.cdr.markForCheck();
    }
  }

  /**
   * Handle opening entity panel
   */
  onOpenEntityPanel(router: CircuitRouter, event: Event): void {
    event.stopPropagation();
    this.entityPanelOpened.emit({ entityId: router.id, entityType: router.type });
  }
}
