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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataTableFilterService } from '../../features/data-table/data-table-filter.service';
import { GrowlerModel } from "../../features/messaging/growler.model";
import { GrowlerService } from "../../features/messaging/growler.service";
import { ImportPageService } from './import-page.service';
import { RegularPageComponent } from '../../shared/regular-page-component.class';
import * as yaml from 'js-yaml';

@Component({
  selector: 'lib-import-page',
  templateUrl: './import-page.component.html',
  styleUrls: ['./import-page.component.scss'],
})
export class ImportPageComponent extends RegularPageComponent implements OnInit, OnDestroy {
  title = 'Import / Export';
  tabs = [
    { url: '/import', label: 'Import' },
    { url: '/export', label: 'Export' },
  ];
  selectedTab: 'import' | 'export' = 'import';

  file: File | null = null;
  importResult: any;
  parsedData: { [key: string]: any[] } | null = null;
  isLoading = false;

  constructor(
    public override svc: ImportPageService,
    public filterService: DataTableFilterService,
    public growlerService: GrowlerService,
  ) {
    super(svc);
  }

  init() {}

  reset() {
    this.isLoading = false;
    this.parsedData = null;
    this.file = null;
  }

  /** ─────────────── Tab Handling ─────────────── */
  onTabChange(event: Event) {
    const value = (event.target as HTMLSelectElement)?.value;
    this.selectedTab = value as 'import' | 'export';
  }

  /** ─────────────── File Handling ─────────────── */
  fileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files && input.files[0] ? input.files[0] : null;
    if (this.file) this.parseFile(this.file);
  }

  fileDropped(event: DragEvent) {
    event.preventDefault();
    this.file = event.dataTransfer?.files[0] || null;
    if (this.file) this.parseFile(this.file);
  }

  dragOver(event: DragEvent) {
    event.preventDefault();
  }

  /** ─────────────── Import ─────────────── */
  upload() {
    if (!this.file) return;
    this.isLoading = true;
    this.svc
      .importFile(this.file)
      .then((_result) => {
        const growlerData = new GrowlerModel(
          'success',
          'Success',
          `Resources imported`,
          `A total of x items were imported.`,
        );
        this.growlerService.show(growlerData);
      })
      .catch((_error) => {
        const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Resources were not imported`,
          `Ensure your file follows a similar structure to <a _target="blank" href="https://github.com/openziti/ziti/blob/main/ziti/cmd/ascode/test.yaml">this example file</a>.`,
        );
        this.growlerService.show(growlerData);
      })
      .finally(() => {
        this.reset();
      });
  }

  /** ─────────────── File Parser ─────────────── */
  parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const isYaml = file.name.endsWith('.yaml') || file.name.endsWith('.yml');
        const parsed = isYaml ? yaml.load(text) : JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null) {
          this.parsedData = parsed as { [key: string]: any[] };
        } else {
          this.parsedData = null;
        }
      } catch (e) {
        console.error('Could not parse file:', e);
        this.parsedData = null;
      }
    };
    reader.readAsText(file);
  }

  get resourceTypes(): string[] {
    return this.parsedData
      ? Object.keys(this.parsedData).filter((k) => Array.isArray(this.parsedData![k]))
      : [];
  }

  getColumnDefsFor(resourceType: string): any[] {
    switch (resourceType) {
      case 'identities':
        return [
          {
            colId: 'name',
            field: 'name',
            headerName: 'Name',
            sortable: true,
            resizable: true,
          },
          {
            colId: 'typeId',
            field: 'typeId',
            headerName: 'Type',
            sortable: true,
            resizable: true,
          },
          {
            colId: 'roleAttributes',
            field: 'roleAttributes',
            headerName: 'Roles',
            resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          },
          {
            colId: 'isAdmin',
            field: 'isAdmin',
            headerName: 'Admin',
            resizable: true,
          },
          {
            colId: 'authPolicy',
            field: 'authPolicy',
            headerName: 'Auth Policy',
            resizable: true,
          }
        ];
  
      case 'services':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', sortable: true, resizable: true },
          { colId: 'configIds', field: 'configIds', headerName: 'Configs', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          },
          { colId: 'roleAttributes', field: 'roleAttributes', headerName: 'Roles', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          }
        ];
  
      case 'configs':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'configTypeId', field: 'configTypeId', headerName: 'Type', resizable: true },
          { colId: 'data', field: 'data', headerName: 'Data', resizable: true,
            cellRenderer: (params) => JSON.stringify(params.value, null, 1)
          }
        ];
  
      case 'edgeRouters':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'roleAttributes', field: 'roleAttributes', headerName: 'Roles', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          },
          { colId: 'isTunnelerEnabled', field: 'isTunnelerEnabled', headerName: 'Tunneler', resizable: true },
          { colId: 'hostname', field: 'hostname', headerName: 'Host', resizable: true },
        ];
  
      case 'servicePolicies':
      case 'edgeRouterPolicies':
      case 'serviceEdgeRouterPolicies':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'policyType', field: 'policyType', headerName: 'Type', resizable: true },
          { colId: 'semantic', field: 'semantic', headerName: 'Semantic', resizable: true },
          { colId: 'identityRoles', field: 'identityRoles', headerName: 'Identities', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          },
          { colId: 'serviceRoles', field: 'serviceRoles', headerName: 'Services', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          },
          { colId: 'edgeRouterRoles', field: 'edgeRouterRoles', headerName: 'Routers', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          }
        ];
  
      case 'authPolicies':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'primaryAuthenticator', field: 'primaryAuthenticator', headerName: 'Primary', resizable: true },
          { colId: 'secondaryAuthenticators', field: 'secondaryAuthenticators', headerName: 'Secondary', resizable: true,
            cellRenderer: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value
          },
          { colId: 'mfaRequired', field: 'mfa.required', headerName: 'MFA Required', resizable: true }
        ];
  
      case 'certificateAuthorities':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'isVerified', field: 'isVerified', headerName: 'Verified', resizable: true },
          { colId: 'certPem', field: 'certPem', headerName: 'Cert', resizable: true,
            cellRenderer: () => '•••'
          }
        ];
  
      case 'externalJwtSigners':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'kid', field: 'kid', headerName: 'Key ID', resizable: true },
          { colId: 'issuer', field: 'issuer', headerName: 'Issuer', resizable: true },
        ];
  
      case 'configTypes':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'schema', field: 'schema', headerName: 'Schema', resizable: true,
            cellRenderer: () => '•••'
          },
          { colId: 'encryptionRequired', field: 'encryptionRequired', headerName: 'Encrypted', resizable: true },
        ];
  
      case 'postureChecks':
        return [
          { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
          { colId: 'typeId', field: 'typeId', headerName: 'Type', resizable: true },
          { colId: 'params', field: 'params', headerName: 'Params', resizable: true,
            cellRenderer: (params) => JSON.stringify(params.value, null, 1)
          },
        ];
  
      default:
        return this.parsedData && this.parsedData[resourceType]
          ? Object.keys(this.parsedData[resourceType][0] || {}).slice(0, 5).map((field) => ({
              colId: field,
              field,
              headerName: field,
              resizable: true
            }))
          : [];
    }
  }  
}
