import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Component({
  selector: 'lib-side-panel-container',
  templateUrl: './side-panel-container.component.html',
  styleUrls: ['./side-panel-container.component.scss'],
  standalone: false
})
export class SidePanelContainerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() panelType: 'marker' | 'link' | 'circuit' | 'unlocated' | 'entityList' | 'servicesWithCircuits' | null = null;
  @Input() panelData: any = null;

  // Panel-specific inputs (passed through to child components)
  @Input() sidePanelCircuits: any[] = [];
  @Input() selectedCircuit: any = null;
  @Input() selectedCircuitRouters: any[] = [];
  @Input() selectedCircuitSegment: any = null;
  @Input() selectedRouterInPath: string | null = null;
  @Input() circuitPreviewEntity: any = null;
  @Input() circuitPreviewEntityType: string = '';

  // Entity list inputs
  @Input() entityListType: string = '';
  @Input() entityListSearch: string = '';
  @Input() entityListPage: number = 1;
  @Input() entityListPageSize: number = 20;
  @Input() entityListTotal: number = 0;
  @Input() filteredEntityList: any[] = [];
  @Input() entityListPreview: any = null;
  @Input() entityListLocationFilter: 'all' | 'located' | 'unlocated' = 'located';

  // Unlocated panel inputs
  @Input() filteredUnlocatedIdentities: any[] = [];
  @Input() filteredUnlocatedRouters: any[] = [];
  @Input() unlocatedIdentitiesSearch: string = '';
  @Input() unlocatedRoutersSearch: string = '';
  @Input() unlocatedPreviewEntity: any = null;
  @Input() unlocatedPreviewType: string = '';
  @Input() unlocatedPreviewCircuits: any[] = [];
  @Input() unlocatedPreviewHasUnsavedLocation: boolean = false;
  @Input() selectedUnlocatedCircuit: any = null;
  @Input() selectedUnlocatedCircuitRouters: any[] = [];

  // Services with circuits inputs
  @Input() allCircuits: any[] = [];
  @Input() allIdentities: any[] = [];
  @Input() allRouters: any[] = [];
  @Input() allTerminators: any[] = [];
  @Input() servicesWithCircuitsSearch: string = '';

  // Outputs
  @Output() closed = new EventEmitter<void>();

  // Marker panel outputs
  @Output() circuitSelected = new EventEmitter<any>();
  @Output() routerInPathSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() saveLocationChanges = new EventEmitter<{item: any, type: string}>();
  @Output() navigateToDetails = new EventEmitter<{type: string, id: string}>();
  @Output() circuitPreviewOpened = new EventEmitter<any>();
  @Output() roleAttributeNavigated = new EventEmitter<string>();

  // Circuit panel outputs
  @Output() hopSelected = new EventEmitter<{hop: any, index: number}>();
  @Output() routerSelected = new EventEmitter<{routerId: string, routerType: string}>();
  @Output() entityClicked = new EventEmitter<{entityId: string, entityType: string}>();
  @Output() serviceClicked = new EventEmitter<any>();
  @Output() circuitPreviewClosed = new EventEmitter<void>();
  @Output() entityPanelOpened = new EventEmitter<{entityId: string, entityType: string}>();

  // Link panel outputs
  @Output() routerClicked = new EventEmitter<any>();

  // Entity list panel outputs
  @Output() entityListSearchChanged = new EventEmitter<string>();
  @Output() entityListPageChanged = new EventEmitter<number>();
  @Output() entityListSortChanged = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();
  @Output() entityListLocationFilterChanged = new EventEmitter<'all' | 'located' | 'unlocated'>();
  @Output() entityListEntityClicked = new EventEmitter<any>();
  @Output() entityListPreviewClosed = new EventEmitter<void>();

  // Unlocated panel outputs
  @Output() unlocatedIdentitiesSearchChanged = new EventEmitter<string>();
  @Output() unlocatedRoutersSearchChanged = new EventEmitter<string>();
  @Output() unlocatedEntityDragStarted = new EventEmitter<{event: DragEvent, entity: any, type: string}>();
  @Output() unlocatedEntityClicked = new EventEmitter<{entity: any, type: string}>();
  @Output() unlocatedPreviewClosed = new EventEmitter<void>();
  @Output() unlocatedSaveLocationClicked = new EventEmitter<void>();

  // Services panel outputs
  @Output() servicesSearchChanged = new EventEmitter<string>();

  // Resize state
  sidePanelWidth = 35; // in rem, default width
  isResizing = false;
  minPanelWidth = 20;
  maxPanelWidth = 60;
  startX = 0;
  startWidth = 0;

  private mouseMoveSubscription?: Subscription;
  private mouseUpSubscription?: Subscription;

  // Expose Math to template
  Math = Math;

  ngOnInit(): void {
    // Set initial CSS variable
    this.updatePanelWidth();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update panel width when isOpen changes
    if (changes['isOpen']) {
      this.updatePanelWidth();
    }
  }

  ngOnDestroy(): void {
    this.cleanupMouseListeners();
  }

  /**
   * Get header class based on panel type and data
   */
  getHeaderClass(): string {
    if (this.panelType === 'marker') {
      if (this.panelData?.type === 'identity') return 'header-identity';
      if (this.panelData?.type === 'services') return 'header-service';
      return 'header-router';
    } else if (this.panelType === 'entityList') {
      if (this.entityListType === 'identities') return 'header-identity';
      if (this.entityListType === 'routers') return 'header-router';
      if (this.entityListType === 'services') return 'header-service';
    } else if (this.panelType === 'servicesWithCircuits') {
      return 'header-service';
    } else if (this.panelType === 'circuit') {
      return 'header-circuit';
    } else if (this.panelType === 'link') {
      // Check link latency and return appropriate class
      const link = this.panelData?.link;
      if (link) {
        const latencyNs = Math.max(link.sourceLatency || 0, link.destLatency || 0);
        const latencyMs = latencyNs / 1000000;
        const GOOD_LATENCY = 50;
        const ACCEPTABLE_LATENCY = 100;

        if (latencyMs < GOOD_LATENCY) {
          return 'header-link-good';
        } else if (latencyMs < ACCEPTABLE_LATENCY) {
          return 'header-link-elevated';
        } else {
          return 'header-link-poor';
        }
      }
      return 'header-link';
    } else if (this.panelType === 'unlocated') {
      return 'header-unlocated';
    }
    return '';
  }

  /**
   * Get panel title based on panel type and data
   */
  getPanelTitle(): string {
    switch (this.panelType) {
      case 'marker':
        return this.panelData?.item?.name || '';
      case 'link':
        return 'Router Link';
      case 'circuit':
        return 'Active Service';
      case 'unlocated':
        return 'Unlocated Entities';
      case 'entityList':
        const filterText = this.entityListLocationFilter === 'located' ? 'Located' :
                          this.entityListLocationFilter === 'unlocated' ? 'Unlocated' : 'All';
        if (this.entityListType === 'identities') return `${filterText} Identities`;
        if (this.entityListType === 'routers') return `${filterText} Routers`;
        if (this.entityListType === 'services') return 'All Services';
        return '';
      case 'servicesWithCircuits':
        return 'Active Services';
      default:
        return '';
    }
  }

  /**
   * Get title icon class based on panel type
   */
  getTitleIconClass(): string {
    if (this.panelType === 'marker') {
      if (this.panelData?.type === 'identity') return 'icon-identity';
      if (this.panelData?.type === 'services') return 'icon-services';
      return 'icon-routers';
    } else if (this.panelType === 'entityList') {
      // Show location filter icon instead of entity type icon
      if (this.entityListLocationFilter === 'located') return 'icon-Location';
      if (this.entityListLocationFilter === 'unlocated') return 'icon-unlocated';
      // For 'all' filter, show entity type icon
      if (this.entityListType === 'identities') return 'icon-identity';
      if (this.entityListType === 'routers') return 'icon-routers';
      if (this.entityListType === 'services') return 'icon-services';
    } else if (this.panelType === 'link') {
      return 'icon-routers';
    } else if (this.panelType === 'circuit' || this.panelType === 'servicesWithCircuits') {
      return 'icon-services';
    } else if (this.panelType === 'unlocated') {
      return 'icon-unlocated';
    }
    return '';
  }

  /**
   * Close the side panel
   */
  closePanel(): void {
    this.closed.emit();
  }

  /**
   * Handle resize mouse down
   */
  onResizerMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.sidePanelWidth;

    // Subscribe to mouse move events (throttled to 60fps)
    this.mouseMoveSubscription = fromEvent<MouseEvent>(document, 'mousemove')
      .pipe(throttleTime(16)) // ~60fps
      .subscribe((e) => this.onMouseMove(e));

    // Subscribe to mouse up event
    this.mouseUpSubscription = fromEvent<MouseEvent>(document, 'mouseup')
      .subscribe((e) => this.onMouseUp(e));
  }

  /**
   * Handle mouse move during resize
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = this.startX - event.clientX;
    const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const deltaRem = deltaX / remSize;
    const newWidth = this.startWidth + deltaRem;

    // Clamp to min/max
    this.sidePanelWidth = Math.max(this.minPanelWidth, Math.min(this.maxPanelWidth, newWidth));

    this.updatePanelWidth();
  }

  /**
   * Handle mouse up after resize
   */
  private onMouseUp(event: MouseEvent): void {
    this.isResizing = false;
    this.cleanupMouseListeners();
  }

  /**
   * Update CSS variable for panel width
   */
  private updatePanelWidth(): void {
    const width = this.isOpen ? this.sidePanelWidth : 0;
    document.documentElement.style.setProperty('--side-panel-width', `${width}rem`);
  }

  /**
   * Cleanup mouse event listeners
   */
  private cleanupMouseListeners(): void {
    if (this.mouseMoveSubscription) {
      this.mouseMoveSubscription.unsubscribe();
      this.mouseMoveSubscription = undefined;
    }
    if (this.mouseUpSubscription) {
      this.mouseUpSubscription.unsubscribe();
      this.mouseUpSubscription = undefined;
    }
  }
}
