import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'lib-entity-count-legend',
  templateUrl: './entity-count-legend.component.html',
  styleUrls: ['./entity-count-legend.component.scss'],
  standalone: false
})
export class EntityCountLegendComponent {
  @Input() geolocatedIdentities: number = 0;
  @Input() unlocatedIdentities: number = 0;
  @Input() geolocatedRouters: number = 0;
  @Input() unlocatedRouters: number = 0;
  @Input() totalServices: number = 0;
  @Input() servicesWithActiveCircuits: number = 0;
  @Input() totalActiveCircuits: number = 0;

  @Output() showLocatedIdentitiesClicked = new EventEmitter<void>();
  @Output() showUnlocatedIdentitiesClicked = new EventEmitter<void>();
  @Output() showLocatedRoutersClicked = new EventEmitter<void>();
  @Output() showUnlocatedRoutersClicked = new EventEmitter<void>();
  @Output() showAllServicesClicked = new EventEmitter<void>();
  @Output() showServicesWithActiveCircuitsClicked = new EventEmitter<void>();

  get totalIdentities(): number {
    return this.geolocatedIdentities + this.unlocatedIdentities;
  }

  get totalRouters(): number {
    return this.geolocatedRouters + this.unlocatedRouters;
  }
}
