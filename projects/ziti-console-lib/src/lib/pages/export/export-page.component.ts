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

import { Component } from '@angular/core';
import { ExportPageService } from './export-page.service';
import { RegularPageComponent } from '../../shared/regular-page-component.class';

interface EntityType {
  id: string;
  label: string;
  tooltip?: string;
}

@Component({
  selector: 'lib-export-page',
  templateUrl: './export-page.component.html',
  styleUrls: ['./export-page.component.scss'],
})
export class ExportPageComponent extends RegularPageComponent {
  /** Header */
  title = 'Import / Export';
  tabs = [
    { url: '/import', label: 'Import' },
    { url: '/export', label: 'Export' },
  ];
  selectedTab: 'import' | 'export' = 'export';

  /** Checkbox data */
  entityTypes: EntityType[] = [
    { id: 'all', label: 'All', tooltip: 'Every supported entity' },
    { id: 'ca', label: 'Certificate Authorities', tooltip: 'certificate-authority' },
    { id: 'identity', label: 'Identities' },
    { id: 'edge-router', label: 'Edge Routers' },
    { id: 'service', label: 'Services' },
    { id: 'config', label: 'Configs' },
    { id: 'config-type', label: 'Config Types' },
    { id: 'service-policy', label: 'Service Policies' },
    { id: 'edge-router-policy', label: 'Edge-Router Policies' },
    { id: 'service-edge-router-policy', label: 'Service-Edge-Router Policies' },
    { id: 'external-jwt-signer', label: 'External JWT Signers' },
    { id: 'auth-policy', label: 'Auth Policies' },
    { id: 'posture-check', label: 'Posture Checks' },
  ];

  /** Selected map */
  selected: Record<string, boolean> = this.entityTypes.reduce((acc, t) => {
    acc[t.id] = true;
    return acc;
  }, {} as Record<string, boolean>);

  isLoading = false;

  constructor(
    public override svc: ExportPageService,
  ) {
    super(svc);
  }

  init() {

  }

  /** Checkbox handler */
  onToggle(id: string) {
    if (id === 'all') {
      const val = this.selected['all'];
      this.entityTypes
        .filter((t) => t.id !== 'all')
        .forEach((t) => (this.selected[t.id] = val));
    } else if (!this.selected[id]) {
      // If any individual unchecked, also uncheck master box
      this.selected['all'] = false;
    }
  }

  /** Whether at least one specific type is chosen */
  hasSelection(): boolean {
    return Object.keys(this.selected).some((k) => k !== 'all' && this.selected[k]);
  }

  /** Trigger export */
  downloadSelected(format: string = 'json') {
    const chosen = Object.keys(this.selected).filter((k) => this.selected[k]);
    const types = chosen.length && !this.selected['all'] ? chosen : ['all'];

    this.isLoading = true;
    this.svc
      .exportByTypes(types, format)
      .finally(() => (this.isLoading = false));
  }
}