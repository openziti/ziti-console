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

export const ZITI_DATA_SERVICE = new InjectionToken<ZitiDataService>('ZITI_DATA_SERVICE');

@Injectable({
  providedIn: 'root'
})
export abstract class ZitiDataService {

  constructor(protected logger: LoggerService,
              protected growler: GrowlerService,
              protected settingsService: SettingsService,
              protected httpClient: HttpClient,
              protected router: Router
  ) {}

  abstract post(type, model, chained?): Promise<any>;
  abstract patch(type, model, id, chained?): Promise<any>;
  abstract get(type: string, paging: any, filters: FilterObj[], url?): Promise<any>;
  abstract getSubdata(entityType: string, id: any, dataType: string): Promise<any>;
  abstract saveSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract deleteSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract delete(type: string, id: string): Promise<any>;
  abstract call(url: string): Promise<any>;
  abstract resetEnrollment(id: string, date: string): Promise<any>;
  abstract reissueEnrollment(id: string, date: string): Promise<any>;
  abstract schema(data: any): Promise<any>;
}
