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

import { Injectable, Inject, InjectionToken } from '@angular/core';
import { Router } from "@angular/router";
import {LoggerService} from "../features/messaging/logger.service";
import {GrowlerService} from "../features/messaging/growler.service";
import {SETTINGS_SERVICE, SettingsService} from "./settings.service";
import {HttpClient} from "@angular/common/http";
import {FilterObj} from "../features/data-table/data-table-filter.service";
import { LoginServiceClass } from './login-service.class';

import {cloneDeep, isEmpty, sortedUniq, isString} from "lodash";
import {SettingsServiceClass} from "./settings-service.class";

export const ZITI_DATA_SERVICE = new InjectionToken<ZitiDataService>('ZITI_DATA_SERVICE');

@Injectable({
  providedIn: 'root'
})
export abstract class ZitiDataService {

  static NODE_DATA_SERVICE_TYPE = 'node';
  static CONTROLLER_DATA_SERVICE_TYPE = 'controller';

  dataServiceType = '';

  public get DEFAULT_PAGING() {
    return cloneDeep({
      filter: "",
      noSearch: true,
      order: "asc",
      page: 1,
      searchOn: "name",
      sort: "name",
      total: 100
    })
  }

  constructor(protected logger: LoggerService,
              protected growler: GrowlerService,
              protected settingsService: SettingsServiceClass,
              protected httpClient: HttpClient,
              protected router: Router
  ) {}

  abstract post(type, model, chained?, contentType?): Promise<any>;
  abstract put(type, model, id, chained?): Promise<any>;
  abstract patch(type, model, id, chained?): Promise<any>;
  abstract get(type: string, paging: any, filters: FilterObj[], url?, useClient?): Promise<any>;
  abstract getSubdata(entityType: string, id: any, dataType: string, paging?: any, contentType?, filters?): Promise<any>;
  abstract saveSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract deleteSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract delete(type: string, id: string): Promise<any>;
  abstract call(url: string): Promise<any>;
  abstract resetEnrollment(id: string, date: string): Promise<any>;
  abstract reissueEnrollment(id: string, date: string): Promise<any>;
  abstract resetMFA(id: string): Promise<any>;
  abstract resetPassword(oldPass, newPass, confirmPass): Promise<any>;
  abstract schema(data: any): Promise<any>;

  getRoleFilter(roleAttributes) {
    let hasAll = false;
    roleAttributes.forEach((attr) => {
      if (attr === 'all') {
        hasAll = true;
      }
    });
    let filters = [];
    if (!hasAll) {
      filters = [
        {
          columnId: "roleAttributes",
          filterName: "Attributes",
          label: "",
          type: "ATTRIBUTE",
          value: roleAttributes
        }
      ];
    }
    return filters;
  }

  getErrorMessage(resp) {
    let errorMessage;

    if (resp?.error?.error?.cause?.message) {
      errorMessage = resp?.error?.error?.cause?.message;
    } else if (resp?.error?.error?.cause?.reason) {
      errorMessage = resp?.error?.error?.cause?.reason;
    } else if (resp?.error?.message) {
      errorMessage = resp?.error?.message;
    } else if (resp?.error?.error?.message) {
      errorMessage = resp?.error?.error?.message;
    } else if (isString(resp?.error)) {
      errorMessage = resp?.error;
    } else {
      errorMessage = 'An unknown error occurred';
    }
    return errorMessage;
  }
}
