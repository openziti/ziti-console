import {Injectable, InjectionToken, ViewContainerRef} from '@angular/core';
export const SHAREDZ_EXTENSION = new InjectionToken<any>('SHAREDZ_EXTENSION');


export interface ExtensionService {
  extendAfterViewInits(extentionPoints: any): void;
}

@Injectable({
  providedIn: 'root'
})
export class ExtensionsNoopService implements ExtensionService{

  constructor() { }

  extendAfterViewInits(extentionPoints: any): void {
  }
}
