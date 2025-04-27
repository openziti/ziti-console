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

import { Inject, Injectable } from '@angular/core';
import { RegularPageServiceClass } from '../../shared/regular-page-service.class';
import { Router } from "@angular/router";
import { SETTINGS_SERVICE } from "../../services/settings.service";
import { SettingsServiceClass } from "../../services/settings-service.class";
import * as yaml from 'js-yaml';

@Injectable({ providedIn: 'root' })
export class ImportPageService extends RegularPageServiceClass {
  constructor(
      @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
      protected override router: Router
    ) {
      super(settings, router);
    }
    
  async importFile(file: File): Promise<any> {
    const text = await file.text();
    let payload: any;

    const isYaml = file.type.includes('yaml');
    if (isYaml) {
      payload = yaml.load(text);
    } else {
      payload = JSON.parse(text);
    }

    const jsonString = JSON.stringify(payload);
    return this.dataService.post('ascode/import', jsonString);
  }
}
