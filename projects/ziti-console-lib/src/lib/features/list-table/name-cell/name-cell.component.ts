import {Component, Input} from '@angular/core';
import {Router} from '@angular/router';
import {isEmpty, isFunction, get} from 'lodash';

/**
 * Name cell for {@link ListTableComponent}: a link to the entity's detail route,
 * with optional identity/router status circles and a prefix icon. Inputs come from
 * the column's `cellInputs(ctx)`: `{ row, cellValue, cellConfig }`, where
 * `cellConfig` carries `pathRoot`, `itemProp?`, `showIdentityIcons?`,
 * `showRouterIcons?`, `getNamePrefix?`, `cellNamePreCheck?`.
 */
@Component({
    selector: 'lib-name-cell',
    templateUrl: './name-cell.component.html',
    styleUrls: ['./name-cell.component.scss'],
    standalone: false,
})
export class NameCellComponent {
    cellParams: any = {};
    item: any;
    value: any;

    @Input() set row(v: any) {
        this.item = v;
    }

    @Input() set cellValue(v: any) {
        this.value = v;
    }

    @Input() set cellConfig(cfg: any) {
        this.cellParams = cfg || {};
    }

    constructor(private router: Router) {}

    get namePrefix(): {iconClass?: string; tooltip?: string} | null {
        const fn = this.cellParams?.getNamePrefix;
        if (typeof fn !== 'function') {
            return null;
        }
        const result = fn(this.item);
        if (!result?.show) {
            return null;
        }
        return result;
    }

    linkClicked(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        if (isFunction(this.cellParams?.cellNamePreCheck)) {
            this.cellParams?.cellNamePreCheck(this.item).then((result: any) => {
                if (!result?.confirmed) {
                    return;
                }
                this.navigate();
            });
            return;
        }
        this.navigate();
    }

    private navigate(): void {
        this.router.navigateByUrl(
            `${this.cellParams.pathRoot}/${get(this.item, this.cellParams.itemProp, this.item.id)}`
        );
    }

    get cellText(): any {
        let val = this.value;
        if (isEmpty(val)) {
            val = this.item?.name;
        }
        return val;
    }
}
