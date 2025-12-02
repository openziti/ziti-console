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

import { inject, Inject, Injectable } from '@angular/core';
import { ZITI_DATA_SERVICE, ZitiDataService } from "../services/ziti-data.service";
import { SETTINGS_SERVICE } from "../services/settings.service";
import { SettingsServiceClass } from "../services/settings-service.class";
import { isEmpty } from 'lodash';

import { NavigationEnd, Router } from "@angular/router";

export abstract class RegularPageServiceClass {
  dataService: ZitiDataService;
  refreshData: (sort?: { sortBy: string, ordering: string }) => void | undefined;
  currentSettings: any = {};

  basePath: string = '';

  public constructor(
    @Inject(SETTINGS_SERVICE) protected settings: SettingsServiceClass,
    protected router?: Router
  ) {
    this.dataService = inject(ZITI_DATA_SERVICE);
    this.settings.settingsChange.subscribe((settings) => {
      if (!isEmpty(this.settings?.settings?.session?.id) || this.dataService.dataServiceType === ZitiDataService.NODE_DATA_SERVICE_TYPE) {
        if ((this.currentSettings?.session?.id !== settings?.session?.id || this.dataService.dataServiceType === ZitiDataService.NODE_DATA_SERVICE_TYPE) && this.refreshData) {
          this.refreshData();
        }
      }
      this.currentSettings = settings;
    });

    router && router.events.subscribe((event: any) => {
      if (event => event instanceof NavigationEnd) {
        if (!event?.snapshot?.routeConfig?.path) {
          return;
        }
        const pathSegments = event.snapshot.routeConfig.path.split('/');
        this.basePath = pathSegments[0];
      }
    });
  }
}
