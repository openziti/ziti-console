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

  abstract post(type, model): Promise<any>;
  abstract patch(type, model, id): Promise<any>;
  abstract get(type: string, paging: any, filters: FilterObj[], url?): Promise<any>;
  abstract getSubdata(entityType: string, id: any, dataType: string): Promise<any>;
  abstract saveSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract deleteSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any>;
  abstract delete(type: string, id: string): Promise<any>;
  abstract call(url: string): Promise<any>;
  abstract resetEnrollment(id: string, any: string): Promise<any>;
}
