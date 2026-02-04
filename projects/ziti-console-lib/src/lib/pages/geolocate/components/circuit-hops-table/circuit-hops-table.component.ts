import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

export interface CircuitHop {
  from: string;
  fromType: string;
  to: string;
  toType: string;
  [key: string]: any;
}

@Component({
  selector: 'lib-circuit-hops-table',
  templateUrl: './circuit-hops-table.component.html',
  styleUrls: ['./circuit-hops-table.component.scss']
})
export class CircuitHopsTableComponent implements OnChanges {
  @Input() circuitHops: CircuitHop[] = [];
  @Input() selectedSegmentIndex: number | null = null;

  @Output() hopSelected = new EventEmitter<{hop: CircuitHop, index: number}>();

  ngOnChanges(changes: SimpleChanges): void {
    // Component updates when circuitHops input changes
  }
}
