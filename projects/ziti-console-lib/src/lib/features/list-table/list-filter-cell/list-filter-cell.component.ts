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

import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import _ from 'lodash';
import moment from 'moment';
import {Subscription} from 'rxjs';
import {MatDateRangePicker} from '@angular/material/datepicker';
import {DataTableFilterService, FilterObj} from '../../data-table/data-table-filter.service';
import {ListColumn} from '../list-column';
import {ListTableService} from '../list-table.service';

type FilterMode = 'text' | 'single' | 'multi' | 'daterange';

interface FilterOption {
    label: string;
    value: any;
    /** Optional class(es) to render the option as a colored chip/badge (e.g. Type). */
    chipClass?: string;
}

const DATE_PRESETS: FilterOption[] = [
    {label: 'Any time', value: ''},
    {label: 'Last Hour', value: 'hour'},
    {label: 'Last Day', value: 'day'},
    {label: 'Last Week', value: 'week'},
    {label: 'Last Month', value: 'month'},
];

/**
 * A single control in the table's filter row. Renders the right widget for the
 * column's `filterType` (text input / single-select / multi-select / date-range)
 * and pushes changes through {@link DataTableFilterService}, whose value contract the
 * controller query-builder already understands (icontains / = / anyOf() / datetime range).
 */
@Component({
    selector: 'lib-list-filter-cell',
    templateUrl: './list-filter-cell.component.html',
    styleUrls: ['./list-filter-cell.component.scss'],
    standalone: false,
})
export class ListFilterCellComponent implements OnInit, OnDestroy {
    @Input() column!: ListColumn;

    mode: FilterMode = 'text';
    options: FilterOption[] = [];

    textValue = '';
    selectedValue: any = '';
    selectedValues: string[] = [];
    /** In-dropdown search text for the multi-select attribute combo. */
    attrSearch = '';

    open = false;
    menuLeft = 0;
    menuTop = 0;
    menuWidth = 0;

    @ViewChild('trigger') trigger?: ElementRef<HTMLElement>;
    @ViewChild('rangePicker') rangePicker?: MatDateRangePicker<Date>;

    // custom date range (daterange mode)
    dateRangeStart: Date | null = null;
    dateRangeEnd: Date | null = null;

    private sub = new Subscription();
    private textDebounced = _.debounce(() => this.emitText(), 400);

    constructor(
        private filterService: DataTableFilterService,
        private listSvc: ListTableService
    ) {}

    ngOnInit(): void {
        this.mode = this.resolveMode();
        this.options = this.resolveOptions();
        this.sub.add(
            this.filterService.filtersChanged.subscribe((filters) => this.syncFromFilters(filters))
        );
        // close this menu whenever another dropdown opens
        this.sub.add(
            this.listSvc.menuOpened$.subscribe((owner) => {
                if (owner !== this) {
                    this.open = false;
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    // ------------------------------------------------------------------ config
    get field(): string {
        return this.column.filterField || this.column.field || this.column.key;
    }

    get placeholder(): string {
        return this.column.filterPlaceholder || 'All';
    }

    /** True only for the Ziti role-attribute flavor of multi-select (adds #/@ prefixing). */
    get isAttributeMode(): boolean {
        return this.column.filterType === 'ATTRIBUTE';
    }

    private resolveMode(): FilterMode {
        switch (this.column.filterType) {
            case 'TEXTINPUT':
                return 'text';
            case 'ATTRIBUTE':
            case 'MULTISELECT':
                return 'multi';
            case 'DATETIME':
                return 'daterange';
            default:
                return 'single';
        }
    }

    private resolveOptions(): FilterOption[] {
        if (this.mode === 'daterange') {
            return DATE_PRESETS;
        }
        if (this.mode === 'multi') {
            let raw: any[];
            if (this.isAttributeMode) {
                const getAttrs = this.column.headerParams?.['getRoleAttributes'];
                raw = (typeof getAttrs === 'function' ? getAttrs() : null) || this.column.filterOptions || [];
            } else {
                raw = this.column.getFilterOptions ? this.column.getFilterOptions() : (this.column.filterOptions || []);
            }
            return raw.map((a: any) => (typeof a === 'string' ? {label: a, value: a} : a));
        }
        const raw = this.column.getFilterOptions ? this.column.getFilterOptions() : this.column.filterOptions || [];
        return raw as FilterOption[];
    }

    // ------------------------------------------------------------------ display
    /** Short display of the current selection, shown after the field label when set. */
    get valueLabel(): string {
        if (this.mode === 'multi') {
            if (this.selectedValues.length === 1) {
                return this.selectedValues[0];
            }
            return `${this.selectedValues.length}`;
        }
        if (this.mode === 'daterange') {
            if (this.selectedValue === 'custom' && this.dateRangeStart) {
                const start = moment(this.dateRangeStart).format('M/D/YY');
                const end = this.dateRangeEnd ? moment(this.dateRangeEnd).format('M/D/YY') : '';
                return end ? `${start} – ${end}` : start;
            }
            const found = this.options.find((o) => o.value === this.selectedValue);
            return found && found.value ? found.label : '';
        }
        const match = this.options.find((o) => `${o.value}` === `${this.selectedValue}`);
        return match && match.value !== '' && match.value != null ? match.label : '';
    }

    get hasValue(): boolean {
        if (this.mode === 'multi') {
            return this.selectedValues.length > 0;
        }
        return this.selectedValue !== '' && this.selectedValue != null;
    }

    isOptionSelected(opt: FilterOption): boolean {
        if (this.mode === 'multi') {
            return this.selectedValues.includes(opt.value);
        }
        return `${opt.value}` === `${this.selectedValue}`;
    }

    /** Attribute options filtered by the in-dropdown search box (multi mode). */
    get filteredOptions(): FilterOption[] {
        if (this.mode !== 'multi' || !this.attrSearch) {
            return this.options;
        }
        const q = this.attrSearch.toLowerCase();
        return this.options.filter((o) => `${o.label ?? o.value}`.toLowerCase().includes(q));
    }

    /** A named attribute (rendered with @ + secondary color) vs a role attribute (# + primary). */
    isNamedOption(opt: FilterOption): boolean {
        return this.isAttributeMode && String(opt?.value ?? opt?.label ?? '').charAt(0) === '@';
    }

    /** Option label. The attribute flavor prefixes # (role) / keeps @ (named); others render plain. */
    optionLabel(opt: FilterOption): string {
        const raw = String(opt?.label ?? opt?.value ?? '');
        if (!this.isAttributeMode) {
            return raw;
        }
        if (raw.charAt(0) === '@' || raw.charAt(0) === '#') {
            return raw;
        }
        return '#' + raw;
    }

    // ------------------------------------------------------------------ open/close
    toggleMenu(event: MouseEvent): void {
        event.stopPropagation();
        if (this.open) {
            this.open = false;
            return;
        }
        const rect = this.trigger?.nativeElement.getBoundingClientRect();
        if (rect) {
            this.menuLeft = rect.left;
            this.menuTop = rect.bottom + 4;
            this.menuWidth = Math.max(rect.width, this.mode === 'multi' ? 220 : 160);
        }
        // refresh dynamic option sources (e.g. role attributes) each open
        this.options = this.resolveOptions();
        this.attrSearch = '';
        this.open = true;
        this.listSvc.notifyMenuOpened(this);
    }

    closeMenu(): void {
        this.open = false;
    }

    // ------------------------------------------------------------------ text
    onTextInput(): void {
        this.textDebounced();
    }

    private emitText(): void {
        this.filterService.updateFilter({
            filterName: this.column.label,
            columnId: this.field,
            value: this.textValue,
            label: this.textValue,
            type: 'TEXTINPUT',
        });
    }

    // ------------------------------------------------------------------ single
    selectOption(opt: FilterOption): void {
        this.selectedValue = opt.value;
        this.open = false;
        if (opt.value === '' || opt.value == null) {
            this.removeThis();
            return;
        }
        this.filterService.updateFilter({
            filterName: this.column.label,
            columnId: this.field,
            value: opt.value,
            label: opt.label,
            type: (this.column.filterType as string) || 'SELECT',
        });
    }

    // ------------------------------------------------------------------ multi
    toggleOption(opt: FilterOption): void {
        const idx = this.selectedValues.indexOf(opt.value);
        if (idx >= 0) {
            this.selectedValues.splice(idx, 1);
        } else {
            this.selectedValues.push(opt.value);
        }
        this.emitMulti();
    }

    private emitMulti(): void {
        if (!this.selectedValues.length) {
            this.removeThis();
            return;
        }
        const filter: FilterObj & {semantic?: string} = {
            filterName: this.column.label,
            columnId: this.field,
            value: [...this.selectedValues],
            label: this.selectedValues.join(', '),
            type: this.isAttributeMode ? 'ATTRIBUTE' : 'MULTISELECT',
            semantic: 'AnyOf',
        };
        this.filterService.updateFilter(filter);
    }

    // ------------------------------------------------------------------ date range
    selectDatePreset(opt: FilterOption): void {
        this.selectedValue = opt.value;
        this.dateRangeStart = null;
        this.dateRangeEnd = null;
        this.open = false;
        if (!opt.value) {
            this.removeThis();
            return;
        }
        const end = moment();
        let start;
        switch (opt.value) {
            case 'hour': start = moment().subtract(1, 'hours'); break;
            case 'week': start = moment().subtract(7, 'days'); break;
            case 'month': start = moment().subtract(1, 'month'); break;
            case 'day':
            default: start = moment().subtract(24, 'hours'); break;
        }
        this.filterService.updateFilter({
            filterName: this.column.label,
            columnId: this.field,
            value: [encodeURIComponent(start.toISOString()), encodeURIComponent(end.toISOString())],
            label: opt.label,
            type: 'DATETIME',
        });
    }

    openCustomRange(event: MouseEvent): void {
        event.stopPropagation();
        this.open = false;
        // open the Material calendar on the next tick (after the menu closes)
        _.delay(() => this.rangePicker?.open(), 0);
    }

    onRangeStartChanged(date: Date | null): void {
        this.dateRangeStart = date;
        this.emitCustomRange();
    }

    onRangeEndChanged(date: Date | null): void {
        this.dateRangeEnd = date;
        this.emitCustomRange();
    }

    private emitCustomRange(): void {
        if (!this.dateRangeStart || !this.dateRangeEnd) {
            return;
        }
        this.selectedValue = 'custom';
        const start = moment(this.dateRangeStart).startOf('day');
        const end = moment(this.dateRangeEnd).endOf('day');
        this.filterService.updateFilter({
            filterName: this.column.label,
            columnId: this.field,
            value: [encodeURIComponent(start.toISOString()), encodeURIComponent(end.toISOString())],
            label: `${start.format('M/D/YY')} – ${end.format('M/D/YY')}`,
            type: 'DATETIME',
        });
    }

    // ------------------------------------------------------------------ clear
    clear(event: MouseEvent): void {
        event.stopPropagation();
        this.selectedValue = '';
        this.selectedValues = [];
        this.textValue = '';
        this.dateRangeStart = null;
        this.dateRangeEnd = null;
        this.removeThis();
    }

    private removeThis(): void {
        this.filterService.removeFilter({
            filterName: this.column.label,
            columnId: this.field,
            value: '',
            label: '',
        });
    }

    // ------------------------------------------------------------------ sync
    private syncFromFilters(filters: FilterObj[]): void {
        const match = filters.find((f) => f.columnId === this.field);
        if (!match) {
            this.textValue = '';
            this.selectedValue = '';
            this.selectedValues = [];
            this.dateRangeStart = null;
            this.dateRangeEnd = null;
            return;
        }
        if (this.mode === 'text') {
            this.textValue = match.value ?? '';
        } else if (this.mode === 'multi') {
            this.selectedValues = _.isArray(match.value) ? [...match.value] : [match.value];
        } else if (this.mode === 'daterange') {
            // keep the locally chosen preset label; match.value is the raw [start,end] range
        } else {
            this.selectedValue = match.value;
        }
    }
}
