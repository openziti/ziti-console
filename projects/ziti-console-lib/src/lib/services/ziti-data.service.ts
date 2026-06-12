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

import { Injectable, Inject, InjectionToken, Injector, inject } from '@angular/core';
import { ManagementPermissionsService } from './management-permissions.service';
import { Router } from "@angular/router";
import {LoggerService} from "../features/messaging/logger.service";
import {GrowlerService} from "../features/messaging/growler.service";
import {SETTINGS_SERVICE, SettingsService} from "./settings.service";
import { HttpClient } from "@angular/common/http";
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

  private readonly injector = inject(Injector);
  /** Resolved lazily to break the circular dependency: ManagementPermissionsService → ZITI_DATA_SERVICE → ManagementPermissionsService. */
  private get managementPermissions(): ManagementPermissionsService {
      return this.injector.get(ManagementPermissionsService);
  }

  /** Empty list response returned when the user lacks read permission for the requested resource. */
  private static readonly EMPTY_READ_RESULT = { data: [], meta: { pagination: { totalCount: 0, offset: 0, limit: 0 } } };

  abstract post(type, model, chained?, contentType?): Promise<any>;
  abstract put(type, model, id, chained?): Promise<any>;
  abstract patch(type, model, id, chained?): Promise<any>;
  abstract doGet(type: string, paging: any, filters: FilterObj[], url?, useClient?): Promise<any>;
  abstract doGetSubdata(entityType: string, id: any, dataType: string, paging?: any, contentType?, filters?): Promise<any>;

  get(type: string, paging: any, filters: FilterObj[], url?, useClient?): Promise<any> {
      if (!this.managementPermissions.canRead(type)) {
          return Promise.resolve(ZitiDataService.EMPTY_READ_RESULT);
      }
      return this.doGet(type, paging, filters, url, useClient);
  }

  getSubdata(entityType: string, id: any, dataType: string, paging?: any, contentType?, filters?): Promise<any> {
      const resourceToCheck = dataType || entityType;
      if (!this.managementPermissions.canRead(resourceToCheck)) {
          return Promise.resolve({ data: [] });
      }
      return this.doGetSubdata(entityType, id, dataType, paging, contentType, filters);
  }
  abstract saveSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract deleteSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract delete(type: string, id: string): Promise<any>;
  abstract call(url: string, prefix?: string): Promise<any>;
  abstract callHAControllers(url: string, prefix?: string): Promise<any>;
  abstract resetEnrollment(id: string, date: string): Promise<any>;
  abstract deleteEnrollment(enrollmentId: string): Promise<any>
  abstract reissueEnrollment(id: string, date: string): Promise<any>;
  abstract resetMFA(id: string): Promise<any>;
  abstract resetPassword(oldPass, newPass, confirmPass): Promise<any>;
  abstract schema(data: any): Promise<any>;

  getRoleFilter(roleAttributes, semantic = 'AnyOf') {
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
          value: roleAttributes,
          semantic
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
