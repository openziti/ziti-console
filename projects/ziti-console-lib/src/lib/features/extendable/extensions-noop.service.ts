import {Injectable, InjectionToken, ViewContainerRef, EventEmitter} from '@angular/core';
import {BehaviorSubject, Subject} from "rxjs";

export const SHAREDZ_EXTENSION = new InjectionToken<any>('SHAREDZ_EXTENSION');

export interface ExtensionService {
  formDataChanged: BehaviorSubject<any>;
  closed: EventEmitter<any>;
  extendAfterViewInits(extentionPoints: any): void;
  updateFormData(data: any): void;
  validateData(): Promise<any>;
  formDataSaved(data: any): Promise<any>;
}

@Injectable({
  providedIn: 'root'
})
export class ExtensionsNoopService implements ExtensionService {

  constructor() { }

  extendAfterViewInits(extentionPoints: any): void {
  }

  updateFormData(data: any): void {
  }

  formDataSaved(data: any): Promise<any> {
    return Promise.resolve(data);
  }

  formDataChanged = new BehaviorSubject<any>({});

  validateData(): Promise<any> {
    return Promise.resolve(true);
  }

  closed: EventEmitter<any> = new EventEmitter<any>();
}
