import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Centralized state management service for the geolocate map component
 * Manages visibility toggles, filter state, side panel state, and entity locations
 */
@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  // ========== Visibility Toggles ==========
  private _clusteringEnabled$ = new BehaviorSubject<boolean>(true);
  private _linksVisible$ = new BehaviorSubject<boolean>(false);
  private _activeCircuitsVisible$ = new BehaviorSubject<boolean>(false);
  private _routersVisible$ = new BehaviorSubject<boolean>(true);
  private _identitiesVisible$ = new BehaviorSubject<boolean>(true);

  // ========== Location Maps ==========
  private _routerLocations = new Map<string, {lat: number, lng: number, name: string}>();
  private _identityLocations = new Map<string, {lat: number, lng: number, name: string}>();

  // ========== Router Type Tracking ==========
  private _routerTypes = new Map<string, string>();

  // ========== Side Panel State ==========
  private _sidePanelOpen$ = new BehaviorSubject<boolean>(false);
  private _sidePanelType$ = new BehaviorSubject<'marker' | 'link' | 'circuit' | 'unlocated' | 'entityList' | 'servicesWithCircuits' | null>(null);
  private _sidePanelData$ = new BehaviorSubject<any>(null);
  private _sidePanelCircuits$ = new BehaviorSubject<any[]>([]);
  private _sidePanelWidth$ = new BehaviorSubject<number>(35); // in rem

  // ========== Selected Circuit State ==========
  private _selectedCircuit$ = new BehaviorSubject<any>(null);
  private _selectedCircuitRouters$ = new BehaviorSubject<any[]>([]);
  private _selectedCircuitSegment$ = new BehaviorSubject<any>(null);
  private _selectedUnlocatedCircuit$ = new BehaviorSubject<any>(null);
  private _selectedUnlocatedCircuitRouters$ = new BehaviorSubject<any[]>([]);

  // ========== Filter State ==========
  private _selectedServiceAttributes$ = new BehaviorSubject<any[]>([]);
  private _selectedServiceNamedAttributes$ = new BehaviorSubject<any[]>([]);
  private _selectedIdentityAttributes$ = new BehaviorSubject<any[]>([]);
  private _selectedIdentityNamedAttributes$ = new BehaviorSubject<any[]>([]);
  private _selectedRouterAttributes$ = new BehaviorSubject<any[]>([]);
  private _selectedConnectionStatus$ = new BehaviorSubject<string>('all');
  private _filtersApplied$ = new BehaviorSubject<boolean>(false);

  // ========== Filter Dropdown State ==========
  private _showServiceDropdown$ = new BehaviorSubject<boolean>(false);
  private _showIdentityDropdown$ = new BehaviorSubject<boolean>(false);
  private _showConnectionStatusFilterSelector$ = new BehaviorSubject<boolean>(false);

  // ========== Public Observables ==========
  clusteringEnabled$ = this._clusteringEnabled$.asObservable();
  linksVisible$ = this._linksVisible$.asObservable();
  activeCircuitsVisible$ = this._activeCircuitsVisible$.asObservable();
  routersVisible$ = this._routersVisible$.asObservable();
  identitiesVisible$ = this._identitiesVisible$.asObservable();

  sidePanelOpen$ = this._sidePanelOpen$.asObservable();
  sidePanelType$ = this._sidePanelType$.asObservable();
  sidePanelData$ = this._sidePanelData$.asObservable();
  sidePanelCircuits$ = this._sidePanelCircuits$.asObservable();
  sidePanelWidth$ = this._sidePanelWidth$.asObservable();

  selectedCircuit$ = this._selectedCircuit$.asObservable();
  selectedCircuitRouters$ = this._selectedCircuitRouters$.asObservable();
  selectedCircuitSegment$ = this._selectedCircuitSegment$.asObservable();
  selectedUnlocatedCircuit$ = this._selectedUnlocatedCircuit$.asObservable();
  selectedUnlocatedCircuitRouters$ = this._selectedUnlocatedCircuitRouters$.asObservable();

  selectedServiceAttributes$ = this._selectedServiceAttributes$.asObservable();
  selectedServiceNamedAttributes$ = this._selectedServiceNamedAttributes$.asObservable();
  selectedIdentityAttributes$ = this._selectedIdentityAttributes$.asObservable();
  selectedIdentityNamedAttributes$ = this._selectedIdentityNamedAttributes$.asObservable();
  selectedRouterAttributes$ = this._selectedRouterAttributes$.asObservable();
  selectedConnectionStatus$ = this._selectedConnectionStatus$.asObservable();
  filtersApplied$ = this._filtersApplied$.asObservable();

  showServiceDropdown$ = this._showServiceDropdown$.asObservable();
  showIdentityDropdown$ = this._showIdentityDropdown$.asObservable();
  showConnectionStatusFilterSelector$ = this._showConnectionStatusFilterSelector$.asObservable();

  constructor() {}

  // ========== Visibility Toggle Methods ==========
  get clusteringEnabled(): boolean {
    return this._clusteringEnabled$.value;
  }

  set clusteringEnabled(value: boolean) {
    this._clusteringEnabled$.next(value);
  }

  toggleClustering(): void {
    this.clusteringEnabled = !this.clusteringEnabled;
  }

  get linksVisible(): boolean {
    return this._linksVisible$.value;
  }

  set linksVisible(value: boolean) {
    this._linksVisible$.next(value);
  }

  toggleLinks(): void {
    this.linksVisible = !this.linksVisible;
  }

  get activeCircuitsVisible(): boolean {
    return this._activeCircuitsVisible$.value;
  }

  set activeCircuitsVisible(value: boolean) {
    this._activeCircuitsVisible$.next(value);
  }

  toggleActiveCircuits(): void {
    this.activeCircuitsVisible = !this.activeCircuitsVisible;
  }

  get routersVisible(): boolean {
    return this._routersVisible$.value;
  }

  set routersVisible(value: boolean) {
    this._routersVisible$.next(value);
  }

  toggleRouters(): void {
    this.routersVisible = !this.routersVisible;
  }

  get identitiesVisible(): boolean {
    return this._identitiesVisible$.value;
  }

  set identitiesVisible(value: boolean) {
    this._identitiesVisible$.next(value);
  }

  toggleIdentities(): void {
    this.identitiesVisible = !this.identitiesVisible;
  }

  // ========== Location Map Methods ==========
  get routerLocations(): Map<string, {lat: number, lng: number, name: string}> {
    return this._routerLocations;
  }

  setRouterLocation(id: string, location: {lat: number, lng: number, name: string}): void {
    this._routerLocations.set(id, location);
  }

  removeRouterLocation(id: string): void {
    this._routerLocations.delete(id);
  }

  clearRouterLocations(): void {
    this._routerLocations.clear();
  }

  get identityLocations(): Map<string, {lat: number, lng: number, name: string}> {
    return this._identityLocations;
  }

  setIdentityLocation(id: string, location: {lat: number, lng: number, name: string}): void {
    this._identityLocations.set(id, location);
  }

  removeIdentityLocation(id: string): void {
    this._identityLocations.delete(id);
  }

  clearIdentityLocations(): void {
    this._identityLocations.clear();
  }

  // ========== Router Type Methods ==========
  get routerTypes(): Map<string, string> {
    return this._routerTypes;
  }

  setRouterTypes(routerTypes: Map<string, string>): void {
    this._routerTypes = routerTypes;
  }

  getRouterType(id: string): string | undefined {
    return this._routerTypes.get(id);
  }

  // ========== Side Panel Methods ==========
  get sidePanelOpen(): boolean {
    return this._sidePanelOpen$.value;
  }

  set sidePanelOpen(value: boolean) {
    this._sidePanelOpen$.next(value);
  }

  get sidePanelType(): 'marker' | 'link' | 'circuit' | 'unlocated' | 'entityList' | 'servicesWithCircuits' | null {
    return this._sidePanelType$.value;
  }

  set sidePanelType(value: 'marker' | 'link' | 'circuit' | 'unlocated' | 'entityList' | 'servicesWithCircuits' | null) {
    this._sidePanelType$.next(value);
  }

  get sidePanelData(): any {
    return this._sidePanelData$.value;
  }

  set sidePanelData(value: any) {
    this._sidePanelData$.next(value);
  }

  get sidePanelCircuits(): any[] {
    return this._sidePanelCircuits$.value;
  }

  set sidePanelCircuits(value: any[]) {
    this._sidePanelCircuits$.next(value);
  }

  get sidePanelWidth(): number {
    return this._sidePanelWidth$.value;
  }

  set sidePanelWidth(value: number) {
    this._sidePanelWidth$.next(value);
  }

  openSidePanel(type: 'marker' | 'link' | 'circuit' | 'unlocated' | 'entityList' | 'servicesWithCircuits', data: any): void {
    this.sidePanelType = type;
    this.sidePanelData = data;
    this.sidePanelOpen = true;
  }

  closeSidePanel(): void {
    this.sidePanelOpen = false;
    this.sidePanelType = null;
    this.sidePanelData = null;
  }

  // ========== Selected Circuit Methods ==========
  get selectedCircuit(): any {
    return this._selectedCircuit$.value;
  }

  set selectedCircuit(value: any) {
    this._selectedCircuit$.next(value);
  }

  get selectedCircuitRouters(): any[] {
    return this._selectedCircuitRouters$.value;
  }

  set selectedCircuitRouters(value: any[]) {
    this._selectedCircuitRouters$.next(value);
  }

  get selectedCircuitSegment(): any {
    return this._selectedCircuitSegment$.value;
  }

  set selectedCircuitSegment(value: any) {
    this._selectedCircuitSegment$.next(value);
  }

  get selectedUnlocatedCircuit(): any {
    return this._selectedUnlocatedCircuit$.value;
  }

  set selectedUnlocatedCircuit(value: any) {
    this._selectedUnlocatedCircuit$.next(value);
  }

  get selectedUnlocatedCircuitRouters(): any[] {
    return this._selectedUnlocatedCircuitRouters$.value;
  }

  set selectedUnlocatedCircuitRouters(value: any[]) {
    this._selectedUnlocatedCircuitRouters$.next(value);
  }

  clearSelectedCircuit(): void {
    this.selectedCircuit = null;
    this.selectedCircuitRouters = [];
    this.selectedCircuitSegment = null;
  }

  clearSelectedUnlocatedCircuit(): void {
    this.selectedUnlocatedCircuit = null;
    this.selectedUnlocatedCircuitRouters = [];
  }

  isCircuitSelectionActive(): boolean {
    return !!(this.selectedCircuit || this.selectedUnlocatedCircuit);
  }

  // ========== Filter Methods ==========
  get selectedServiceAttributes(): any[] {
    return this._selectedServiceAttributes$.value;
  }

  set selectedServiceAttributes(value: any[]) {
    this._selectedServiceAttributes$.next(value);
  }

  get selectedServiceNamedAttributes(): any[] {
    return this._selectedServiceNamedAttributes$.value;
  }

  set selectedServiceNamedAttributes(value: any[]) {
    this._selectedServiceNamedAttributes$.next(value);
  }

  get selectedIdentityAttributes(): any[] {
    return this._selectedIdentityAttributes$.value;
  }

  set selectedIdentityAttributes(value: any[]) {
    this._selectedIdentityAttributes$.next(value);
  }

  get selectedIdentityNamedAttributes(): any[] {
    return this._selectedIdentityNamedAttributes$.value;
  }

  set selectedIdentityNamedAttributes(value: any[]) {
    this._selectedIdentityNamedAttributes$.next(value);
  }

  get selectedRouterAttributes(): any[] {
    return this._selectedRouterAttributes$.value;
  }

  set selectedRouterAttributes(value: any[]) {
    this._selectedRouterAttributes$.next(value);
  }

  get selectedConnectionStatus(): string {
    return this._selectedConnectionStatus$.value;
  }

  set selectedConnectionStatus(value: string) {
    this._selectedConnectionStatus$.next(value);
  }

  get filtersApplied(): boolean {
    return this._filtersApplied$.value;
  }

  set filtersApplied(value: boolean) {
    this._filtersApplied$.next(value);
  }

  clearAllFilters(): void {
    this.selectedServiceAttributes = [];
    this.selectedServiceNamedAttributes = [];
    this.selectedIdentityAttributes = [];
    this.selectedIdentityNamedAttributes = [];
    this.selectedRouterAttributes = [];
    this.selectedConnectionStatus = 'all';
    this.filtersApplied = false;
  }

  hasActiveFilters(): boolean {
    return this.selectedServiceAttributes.length > 0 ||
           this.selectedServiceNamedAttributes.length > 0 ||
           this.selectedIdentityAttributes.length > 0 ||
           this.selectedIdentityNamedAttributes.length > 0 ||
           this.selectedRouterAttributes.length > 0 ||
           this.selectedConnectionStatus !== 'all';
  }

  // ========== Filter Dropdown Methods ==========
  get showServiceDropdown(): boolean {
    return this._showServiceDropdown$.value;
  }

  set showServiceDropdown(value: boolean) {
    this._showServiceDropdown$.next(value);
  }

  get showIdentityDropdown(): boolean {
    return this._showIdentityDropdown$.value;
  }

  set showIdentityDropdown(value: boolean) {
    this._showIdentityDropdown$.next(value);
  }

  get showConnectionStatusFilterSelector(): boolean {
    return this._showConnectionStatusFilterSelector$.value;
  }

  set showConnectionStatusFilterSelector(value: boolean) {
    this._showConnectionStatusFilterSelector$.next(value);
  }

  closeAllDropdowns(): void {
    this.showServiceDropdown = false;
    this.showIdentityDropdown = false;
    this.showConnectionStatusFilterSelector = false;
  }

  // ========== Utility Methods ==========
  /**
   * Resets all state to initial values
   */
  resetState(): void {
    this.clusteringEnabled = true;
    this.linksVisible = false;
    this.activeCircuitsVisible = false;
    this.routersVisible = true;
    this.identitiesVisible = true;

    this.clearRouterLocations();
    this.clearIdentityLocations();
    this._routerTypes.clear();

    this.closeSidePanel();
    this.sidePanelCircuits = [];
    this.sidePanelWidth = 35;

    this.clearSelectedCircuit();
    this.clearSelectedUnlocatedCircuit();

    this.clearAllFilters();
    this.closeAllDropdowns();
  }
}
