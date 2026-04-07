import { Component, EventEmitter, Input, Output, ViewChild, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'lib-geolocate-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
  standalone: false
})
export class GeolocateFilterBarComponent implements OnChanges {
  @Input() selectedRouterAttributes: any[] = [];
  @Input() selectedIdentityAttributes: any[] = [];
  @Input() selectedIdentityNamedAttributes: any[] = [];
  @Input() selectedServiceAttributes: any[] = [];
  @Input() selectedServiceNamedAttributes: any[] = [];
  @Input() selectedConnectionStatus: string = 'all';
  @Input() routerRoleAttributes: any[] = [];
  @Input() identityRoleAttributes: any[] = [];
  @Input() identityNamedAttributes: any[] = [];
  @Input() serviceRoleAttributes: any[] = [];
  @Input() serviceNamedAttributes: any[] = [];
  @Input() filtersApplied: boolean = false;
  @Input() showRouterFilterSelector: boolean = false;
  @Input() showIdentityFilterSelector: boolean = false;
  @Input() showServiceFilterSelector: boolean = false;
  @Input() showConnectionStatusFilterSelector: boolean = false;

  @Output() routerFilterClicked = new EventEmitter<Event>();
  @Output() identityFilterClicked = new EventEmitter<Event>();
  @Output() serviceFilterClicked = new EventEmitter<Event>();
  @Output() connectionStatusFilterClicked = new EventEmitter<Event>();
  @Output() routerFilterClosed = new EventEmitter<Event>();
  @Output() identityFilterClosed = new EventEmitter<Event>();
  @Output() serviceFilterClosed = new EventEmitter<Event>();
  @Output() connectionStatusFilterClosed = new EventEmitter<Event>();
  @Output() routerRoleAttributesChanged = new EventEmitter<any>();
  @Output() identityNamedAttributesChanged = new EventEmitter<any>();
  @Output() identityRoleAttributesChanged = new EventEmitter<any>();
  @Output() serviceNamedAttributesChanged = new EventEmitter<any>();
  @Output() serviceRoleAttributesChanged = new EventEmitter<any>();
  @Output() connectionStatusChanged = new EventEmitter<any>();
  @Output() identityFilterChanged = new EventEmitter<any>();
  @Output() serviceFilterChanged = new EventEmitter<any>();
  @Output() clearFiltersClicked = new EventEmitter<Event>();
  @Output() selectedRouterAttributesChange = new EventEmitter<any[]>();
  @Output() selectedIdentityAttributesChange = new EventEmitter<any[]>();
  @Output() selectedIdentityNamedAttributesChange = new EventEmitter<any[]>();
  @Output() selectedServiceAttributesChange = new EventEmitter<any[]>();
  @Output() selectedServiceNamedAttributesChange = new EventEmitter<any[]>();
  @Output() selectedConnectionStatusChange = new EventEmitter<string>();

  @ViewChild('routerFilterSelector') routerFilterSelector: any;
  @ViewChild('identityFilterSelector') identityFilterSelector: any;
  @ViewChild('serviceFilterSelector') serviceFilterSelector: any;
  @ViewChild('connectionStatusFilterSelector') connectionStatusFilterSelector: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filtersApplied']) {
      // Force change detection to update the *ngIf directive
      this.cdr.detectChanges();
    }
  }
}
