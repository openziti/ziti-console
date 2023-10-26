import {Component} from "@angular/core";
import {ITooltipAngularComp} from "ag-grid-angular";
import {ITooltipParams} from "ag-grid-community";

@Component({
    selector: 'lib-os-tooltip',
    template: `
      <div class="os-tooltip" [style.background-color]="color">
          <p><span>OS:</span> <strong>{{ data.envInfo?.os || 'Unknown' }}</strong></p>
          <p><span>Release: </span><strong>{{ data.envInfo?.osRelease || 'Unknown' }}</strong></p>
          <p><span>Arch: </span><strong>{{ data.envInfo.arch || 'Unknown' }}</strong></p>
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
    public color!: string;

    agInit(params: {color: string} & ITooltipParams): void {
        this.params = params;

        this.data = params.api.getDisplayedRowAtIndex(params.rowIndex).data;
    }
}