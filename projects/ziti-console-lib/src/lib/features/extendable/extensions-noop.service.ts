/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { Injectable, InjectionToken, ViewContainerRef, EventEmitter } from '@angular/core';
import {BehaviorSubject, Subject} from "rxjs";

export const SHAREDZ_EXTENSION = new InjectionToken<any>('SHAREDZ_EXTENSION');

export type ExtensionEventType =
  | 'formDataUpdated'
  | 'attributesChanged'
  | 'conflictInputChanged'
  | 'tableDataUpdated'
  | string;

export interface ExtensionEvent<TData = any, TResult = any> {
  type: ExtensionEventType;
  data?: TData;
  result?: TResult;
  /**
   * If set by a subscriber, callers can `await` this
   * to get an async result (e.g. table preprocessing).
   */
  waitFor?: Promise<TResult>;
}

export interface ExtensionService {
  formDataChanged: BehaviorSubject<any>;
  closed: EventEmitter<any>;
  extensionEvent?: EventEmitter<ExtensionEvent>;
  closeAfterSave: boolean;
  moreActions?: any[];
  listActions?: any[];
  consoleActionTriggered?: EventEmitter<any>;
  disabledComponents?: any[];
  extendOnInit(): void;
  extendAfterViewInits(extentionPoints: any): void;
  updateFormData(data: any): void;
  validateData(): Promise<any>;
  formDataSaved(data: any): Promise<any>;
  processTableColumns(tableColumns: any): any[];
}

@Injectable({
  providedIn: 'root'
})
export class ExtensionsNoopService implements ExtensionService {

  formDataChanged = new BehaviorSubject<any>({isEmpty: true});
  closed: EventEmitter<any> = new EventEmitter<any>();
  consoleActionTriggered: EventEmitter<any> = new EventEmitter<any>();
  extensionEvent: EventEmitter<ExtensionEvent> = new EventEmitter<ExtensionEvent>();
  closeAfterSave = true;
  moreActions = [];
  disabledComponents = [];

  constructor() { }

  extendOnInit(): void {
  }

  extendAfterViewInits(extentionPoints: any): void {
  }

  updateFormData(data: any): void {
  }

  formDataSaved(data: any): Promise<any> {
    return Promise.resolve(data);
  }

  validateData(): Promise<any> {
    return Promise.resolve(true);
  }

  processTableColumns(tableColumns: any): any[] {
    return tableColumns;
  }

}
