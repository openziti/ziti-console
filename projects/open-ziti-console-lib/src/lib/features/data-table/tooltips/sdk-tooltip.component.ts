import {Component} from "@angular/core";
import {ITooltipAngularComp} from "ag-grid-angular";
import {ITooltipParams} from "ag-grid-community";
import {isEmpty} from "lodash";

@Component({
    selector: 'lib-sdk-tooltip',
    template: `
      <div class="os-tooltip" [style.background-color]="color" [ngClass]="{hidden: hasData}">
          <p><span>APP ID: </span> <strong>{{ data.sdkInfo?.appId }}</strong></p>
          <p><span>Version: </span><strong>{{ data.sdkInfo?.appVersion }}</strong></p>
          <p><span>Branch: </span><strong>{{ data.sdkInfo?.branch }}</strong></p>
          <p><span>Revision: </span><strong>{{ data.sdkInfo?.revision }}</strong></p>
          <p><span>Type: </span><strong>{{ data.sdkInfo?.type }}</strong></p>
      </div>`,
    styles: [
        `
            .os-tooltip {
                padding: 5px;
                background-color: var(--navigation);
                border-color: var(--primary);
                border-size: 1px;
                border-style: solid;
            }

            :host {
                position: absolute;
                width: fit-content;
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
export class SDKTooltipComponent implements ITooltipAngularComp {
    private params!: {color: string} & ITooltipParams;
    public data!: any;
    public color!: string;

    agInit(params: {color: string} & ITooltipParams): void {
        this.params = params;

        this.data = params.api.getDisplayedRowAtIndex(params.rowIndex).data;
    }

    get hasData() {
        return isEmpty(this.data?.sdkInfo?.version);
    }
}