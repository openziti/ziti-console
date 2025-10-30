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
import { saveAs } from 'file-saver';
import { RegularPageServiceClass } from '../../shared/regular-page-service.class';
import { Router } from '@angular/router';
import { SETTINGS_SERVICE } from '../../services/settings.service';
import { SettingsServiceClass } from '../../services/settings-service.class';

@Injectable({ providedIn: 'root' })
export class ExportPageService extends RegularPageServiceClass {
  constructor(
    @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
    protected override router: Router,
  ) {
    super(settings, router);
  }

  private get api() {
    return this.dataService;
  }

  /** ───────────────────────── Export ───────────────────────── */
  async exportByTypes(types: string[], outputFileExtension: string = 'json'): Promise<void> {
    const body = { types: types.join(','), format: outputFileExtension };
    return this.api
      .post('ascode/export', JSON.stringify(body), null, 'application/json', 'blob')
      .then(response => {
        const blob = new Blob([response], { type: `application/${outputFileExtension}` });
        const name = `ziti-export-${new Date().toISOString()}.${outputFileExtension}`;
        saveAs(blob, name);
    });
  }
}
