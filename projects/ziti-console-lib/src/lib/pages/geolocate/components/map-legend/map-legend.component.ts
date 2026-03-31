import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'lib-map-legend',
  templateUrl: './map-legend.component.html',
  styleUrls: ['./map-legend.component.scss'],
  standalone: false
})
export class MapLegendComponent {
  @Input() routersVisible: boolean = true;
  @Input() identitiesVisible: boolean = true;
  @Input() linksVisible: boolean = false;
  @Input() activeCircuitsVisible: boolean = false;
  @Input() clusteringEnabled: boolean = true;
  @Input() isCircuitSelectionActive: boolean = false;

  @Output() routersToggled = new EventEmitter<void>();
  @Output() identitiesToggled = new EventEmitter<void>();
  @Output() linksToggled = new EventEmitter<void>();
  @Output() activeCircuitsToggled = new EventEmitter<void>();
  @Output() clusteringToggled = new EventEmitter<void>();
}
