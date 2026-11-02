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

import {Component} from '@angular/core';
import {ListColumn} from 'ziti-console-lib';

/**
 * Root of the standalone list-table demo. Renders `lib-list-table` in tree mode against static
 * sample data, with no controller session, router or services of its own.
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    standalone: false,
})
export class AppComponent {
    activeTab: 'flat' | 'card' | 'loading' = 'flat';

    // ---- loading-states demo (skeleton on first load, top bar on refresh) ----
    loadColumns: ListColumn[] = [
        {key: 'gateway', label: 'Gateway'},
        {key: 'site', label: 'Site'},
        {key: 'firmware', label: 'Firmware'},
        {key: 'sensors', label: 'Sensors', width: 120},
    ];
    loadRows: any[] = [];
    loading = false;

    /** First load with no rows yet -> skeleton placeholder rows. */
    simulateInitialLoad(): void {
        this.loadRows = [];
        this.loading = true;
    }

    /** Data arrives -> real rows, loading clears. */
    finishLoad(): void {
        this.loadRows = this.rows.map((r) => ({...r}));
        this.loading = false;
    }

    /** Slow reload (1.5s): long enough to clear the show-delay, so the bar appears. */
    simulateSlowRefresh(): void {
        if (!this.loadRows.length) {
            this.finishLoad();
        }
        this.loading = true;
        setTimeout(() => (this.loading = false), 1500);
    }

    /** Fast reload (80ms): under the show-delay, so the debounced bar should never appear. */
    simulateQuickRefresh(): void {
        if (!this.loadRows.length) {
            this.finishLoad();
        }
        this.loading = true;
        setTimeout(() => (this.loading = false), 80);
    }

    // Level-0 columns describe a gateway; the nested level (below) describes its sensors, so
    // the demo shows a tree whose child columns differ from the parent's.
    columns: ListColumn[] = [
        {key: 'gateway', label: 'Gateway', sortable: true, treeColumn: true},
        {key: 'site', label: 'Site'},
        {key: 'firmware', label: 'Firmware'},
        {key: 'sensors', label: 'Sensors', width: 120},
    ];

    childColumnsByLevel: ListColumn[][] = [
        [], // level 0 uses `columns`
        [
            {key: 'sensor', label: 'Sensor', treeColumn: true},
            {key: 'type', label: 'Type'},
            {key: 'reading', label: 'Reading'},
            {key: 'status', label: 'Status', width: 140},
        ],
    ];

    rows: any[] = [
        {
            gateway: 'gateway-01', site: 'Building A', firmware: 'v2.4.1', sensors: 3,
            children: [
                {sensor: 'temp-a1', type: 'Temperature', reading: '21.4 C', status: 'Online', leaf: true},
                {sensor: 'humidity-a1', type: 'Humidity', reading: '48 %RH', status: 'Online', leaf: true},
                {sensor: 'motion-a1', type: 'Motion', reading: 'Idle', status: 'Online', leaf: true},
            ],
        },
        // no inline children: expanding gateway-02 calls loadChildren (shows the spinner)
        {gateway: 'gateway-02', site: 'Building B', firmware: 'v2.4.0', sensors: 2},
        // gateway-03's load rejects, so the toggle shows the failed-load / retry affordance
        {gateway: 'gateway-03', site: 'Warehouse', firmware: 'v2.3.8', sensors: 4},
        {gateway: 'gateway-04', site: 'Rooftop', firmware: 'v2.4.1', sensors: 6, leaf: true},
    ];

    // each table writes tree state onto its own row objects, so the card variant gets a separate copy
    rowsCard: any[] = JSON.parse(JSON.stringify(this.rows));

    selectedCount = 0;

    /** Lazy child loader: resolves after a short delay, or rejects for gateway-03 so the
     *  failed-load / retry affordance is demonstrable. */
    loadChildren = (row: any): Promise<any[]> => new Promise((resolve, reject) => {
        setTimeout(() => {
            if (row.gateway === 'gateway-03') {
                reject(new Error('sensor service unreachable'));
                return;
            }
            resolve([
                {sensor: row.gateway + '-temp', type: 'Temperature', reading: '20.2 C', status: 'Online', leaf: true},
                {sensor: row.gateway + '-door', type: 'Contact', reading: 'Closed', status: 'Online', leaf: true},
            ]);
        }, 900);
    });

    onSelectionChanged(rows: any[]): void {
        this.selectedCount = rows.length;
    }
}
