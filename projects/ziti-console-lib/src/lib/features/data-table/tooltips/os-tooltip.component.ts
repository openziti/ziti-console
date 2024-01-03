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

import {Component} from "@angular/core";
import {ITooltipAngularComp} from "ag-grid-angular";
import {ITooltipParams} from "ag-grid-community";

@Component({
    selector: 'lib-os-tooltip',
    template: `
      <div class="os-tooltip" [style.background-color]="color">
          <p><span>OS:</span> <strong>{{ infoObj?.os || 'Unknown' }}</strong></p>
          <p><span>Release: </span><strong>{{ infoObj?.osRelease || 'Unknown' }}</strong></p>
          <p><span>Arch: </span><strong>{{ infoObj?.arch || 'Unknown' }}</strong></p>
      </div>`,
    styles: [
        `
            .os-tooltip {
                padding: 5px;
                background-color: var(--background);
                border-color: var(--primary);
                border-size: 1px;
                border-style: solid;
            }

            :host {
                position: absolute;
                width: 150px;
                height: 70px;
                pointer-events: none;
                transition: opacity 1s;
            }

            :host.ag-tooltip-hiding {
                opacity: 0;
            }

            .os-tooltip p {
                margin: 5px;
                white-space: nowrap;
            }
        `
    ]
})
export class OSTooltipComponent implements ITooltipAngularComp {
    private params!: {color: string} & ITooltipParams;
    public data!: any;
    public infoObj: any = {};
    public color!: string;

    agInit(params: {color: string} & ITooltipParams): void {
        this.params = params;

        this.data = params.api.getDisplayedRowAtIndex(params.rowIndex).data;
        this.infoObj = this.data.envInfo || this.data.versionInfo || {};
    }
}
