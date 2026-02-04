import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lib-entity-list-panel',
  templateUrl: './entity-list-panel.component.html',
  styleUrls: ['./entity-list-panel.component.scss']
})
export class EntityListPanelComponent {
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
}
