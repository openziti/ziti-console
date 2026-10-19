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

import {Component, Input} from '@angular/core';
import {DataTableFilterService, FilterObj} from '../../data-table/data-table-filter.service';

interface AttrChip {
    label: string;   // display form, e.g. "#sales" or "@device-01"
    raw: string;     // the source value, prefix intact (what the filter matches on)
    bare: string;    // the name without the leading # or @ (what copy puts on the clipboard)
    isNamed: boolean;
    copied?: boolean;
}

/**
 * Role/attribute chips for list-table attribute columns. Each chip reveals two
 * controls on hover: copy (puts the bare name on the clipboard) and filter (adds
 * the attribute to this column's filter). Filtering goes through the shared
 * DataTableFilterService so it stacks with, and stays in sync with, the column
 * header's filter dropdown.
 */
@Component({
    selector: 'lib-attribute-cell',
    templateUrl: './attribute-cell.component.html',
    styleUrls: ['./attribute-cell.component.scss'],
    standalone: false,
})
export class AttributeCellComponent {
    @Input() set attributes(value: any) {
        this.chips = this.toChips(value);
    }

    /** Column field; used as the filter's columnId so the filter icon drives the
     *  same filter as the column header dropdown. */
    @Input() field = '';
    /** Column label, shown on the applied-filter tag. */
    @Input() filterLabel = '';

    chips: AttrChip[] = [];

    constructor(private filterService: DataTableFilterService) {}

    private toChips(value: any): AttrChip[] {
        const list = Array.isArray(value) ? value : (value ? [value] : []);
        return list.reduce((chips: AttrChip[], attr: any) => {
            const raw = String(attr?.name ?? attr ?? '').trim();
            if (raw) {
                const first = raw.charAt(0);
                const isNamed = first === '@';
                const bare = first === '#' || first === '@' ? raw.slice(1) : raw;
                const label = isNamed || first === '#' ? raw : '#' + raw;
                chips.push({label, raw, bare, isNamed});
            }
            return chips;
        }, []);
    }

    async copy(chip: AttrChip, event: MouseEvent): Promise<void> {
        event.stopPropagation();
        try {
            await navigator.clipboard.writeText(chip.bare);
            chip.copied = true;
            setTimeout(() => (chip.copied = false), 1200);
        } catch {
            // clipboard blocked (older browser or insecure context); nothing to do
        }
    }

    filter(chip: AttrChip, event: MouseEvent): void {
        event.stopPropagation();
        if (!this.field) {
            return;
        }
        const existing = this.filterService.filters.find((f) => f.columnId === this.field);
        const values: string[] = Array.isArray(existing?.value)
            ? [...existing.value]
            : (existing?.value ? [existing.value] : []);
        // filter on the source value (prefix intact) so a named @entity does not match a
        // role of the same bare name, and so it stacks with the header dropdown's values
        if (values.includes(chip.raw)) {
            return;
        }
        values.push(chip.raw);
        // keep whatever all-of/any-of the filter already uses so adding a chip does
        // not quietly change the match mode
        const semantic = (existing as any)?.semantic === 'AllOf' ? 'AllOf' : 'AnyOf';
        const filter: FilterObj & {semantic?: string} = {
            filterName: this.filterLabel,
            columnId: this.field,
            value: values,
            label: values.join(', '),
            type: 'ATTRIBUTE',
            semantic,
        };
        this.filterService.updateFilter(filter);
    }
}
