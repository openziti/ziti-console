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
import {ListColumn, ListDetailPanel, ListTableComponent} from 'ziti-console-lib/table-core';
import {DemoDetailPanelComponent, DemoLegendHeaderComponent, DemoToggleCellComponent} from './demo-detail-cells';

type EmptyMode = 'empty' | 'no-results' | 'access-denied' | 'custom';

/**
 * Root of the standalone list-table demo. Imports only the standalone `ListTableComponent`
 * from the package (not the library NgModule), which is what lets a consumer pull in the table
 * without the module's heavy peer graph (ag-grid, primeng, lottie, etc.). Renders the table in
 * tree mode against static sample data, with no controller session or services of its own.
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    standalone: true,
    imports: [ListTableComponent],
})
export class AppComponent {
    activeTab: 'flat' | 'card' | 'loading' | 'empty' | 'detail' = 'flat';

    // ---- empty-states demo ----
    emptyRows: any[] = [];
    emptyEntity = 'services';
    emptyMode: EmptyMode = 'empty';
    emptyEntities = [
        {key: 'services', label: 'Services'},
        {key: 'identities', label: 'Identities'},
        {key: 'edge-routers', label: 'Edge Routers'},
        {key: 'service-policies', label: 'Service Policies'},
    ];
    emptyModes: {key: EmptyMode; label: string}[] = [
        {key: 'empty', label: 'Empty'},
        {key: 'no-results', label: 'No results'},
        {key: 'access-denied', label: 'Access denied'},
        {key: 'custom', label: 'Custom (projected)'},
    ];

    onEmptyAction(event: any): void {
        console.log('[demo] empty-state action', event);
    }

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

    // ---- detail panels + controlled selection + custom header demo ----
    private detailToggleCell = (ctx: any) => ({
        appsOpen: ctx.isDetailOpen('apps'),
        connOpen: ctx.isDetailOpen('connections'),
        toggleApps: () => ctx.toggleDetail('apps'),
        toggleConn: () => ctx.toggleDetail('connections'),
    });

    detailColumns: ListColumn[] = [
        {key: 'gateway', label: 'Gateway', treeColumn: true, sortable: true},
        {key: 'site', label: 'Site'},
        {key: 'details', label: 'Details', cell: DemoToggleCellComponent, cellInputs: this.detailToggleCell},
        {
            key: 'status',
            label: 'Status',
            width: 220,
            sortable: true,
            // custom header content (a status legend) rendered beside the sort affordance
            headerCell: DemoLegendHeaderComponent,
            headerInputs: (col) => ({label: col.label}),
        },
    ];

    // nested rows get their own toggle cell too, so a detail panel can open at any depth
    detailChildColumns: ListColumn[][] = [
        [],
        [
            {key: 'sensor', label: 'Sensor', treeColumn: true},
            {key: 'type', label: 'Type'},
            {key: 'details', label: 'Details', cell: DemoToggleCellComponent, cellInputs: this.detailToggleCell},
        ],
    ];

    detailRows: any[] = JSON.parse(JSON.stringify(this.rows));

    detailPanels: ListDetailPanel[] = [
        {
            key: 'apps',
            component: DemoDetailPanelComponent,
            inputs: (ctx) => ({title: 'Apps', parentId: ctx.row.gateway ?? ctx.row.sensor, items: ['web-app', 'db-service', 'cache']}),
        },
        {
            key: 'connections',
            component: DemoDetailPanelComponent,
            inputs: (ctx) => ({title: 'Connections', parentId: ctx.row.gateway ?? ctx.row.sensor, items: ['tcp:443 -> edge-1', 'tcp:5432 -> db-2']}),
        },
    ];

    /** Controlled selection: a reference-stable array the host owns, so "Clear" can reset the table. */
    detailSelection: any[] = [];

    onDetailToggled(e: {row: any; key: string; open: boolean}): void {
        console.log('[demo] detailToggled', e.key, e.open, e.row.gateway ?? e.row.sensor);
    }

    onDetailSelectionChanged(rows: any[]): void {
        this.detailSelection = [...rows]; // rebuild on the discrete event; stable between events
    }

    clearDetailSelection(): void {
        this.detailSelection = [];
    }
}
