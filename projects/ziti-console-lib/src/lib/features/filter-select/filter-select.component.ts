import {
    ContentChild,
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnDestroy,
    Output,
    ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { FilterSelectOptionTemplateDirective, FilterSelectTriggerTemplateDirective } from './filter-select-templates.directive';

@Component({
    selector: 'lib-filter-select',
    templateUrl: './filter-select.component.html',
    styleUrls: ['./filter-select.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FilterSelectComponent),
            multi: true,
        },
    ],
    standalone: false,
})
export class FilterSelectComponent implements ControlValueAccessor, OnDestroy {
    @Input() id?: string;
    @Input() placeholder = '';
    /**
     * Classes applied to the Material select overlay panel (useful for per-instance styling).
     * Note: the panel is rendered in an overlay container, outside this component's DOM.
     */
    @Input() panelClass?: string | string[];

    /** Array of raw option objects */
    @Input() options: any[] = [];

    /** Property name to use for labels/values when options are objects */
    @Input() optionLabel = 'name';
    @Input() optionValue = 'id';

    /** Show a search input inside the dropdown panel */
    @Input() searchable = true;
    @Input() searchPlaceholder = 'Filter';

    /**
     * If true, filters `options` locally. If false, emits `filterChange` so the parent can do remote filtering.
     */
    @Input() localFilter = false;

    /** If true, opening the control via keyboard focus will auto-open the panel (matches prior p-select UX) */
    @Input() openOnFocus = false;

    /** Show a clear (X) button to clear the current selection */
    @Input() showClear = true;

    /** Emits when selection changes */
    @Output() selectionChange = new EventEmitter<any>();

    /** Emits (debounced) as the user types in the search box */
    @Output() filterChange = new EventEmitter<string>();

    @ViewChild(MatSelect) matSelect?: MatSelect;
    @ContentChild(FilterSelectOptionTemplateDirective) optionTemplate?: FilterSelectOptionTemplateDirective;
    @ContentChild(FilterSelectTriggerTemplateDirective) triggerTemplate?: FilterSelectTriggerTemplateDirective;

    value: any = undefined;
    disabled = false;

    filterText = '';

    /** Ensure our overlay panel always carries a stable class for global styling. */
    get resolvedPanelClass(): string[] {
        const base = ['lib-filter-select-panel'];
        const provided = this.panelClass;
        if (!provided) {
            return base;
        }
        if (Array.isArray(provided)) {
            return [...base, ...provided];
        }
        return [...base, provided];
    }

    private readonly destroyed$ = new Subject<void>();
    private readonly filterText$ = new Subject<string>();

    // ControlValueAccessor
    private onChange: (value: any) => void = () => {};
    private onTouched: () => void = () => {};

    constructor() {
        this.filterText$
            .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroyed$))
            .subscribe((text) => {
                this.filterChange.emit(text);
            });
    }

    ngOnDestroy(): void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    writeValue(value: any): void {
        this.value = value;
    }

    registerOnChange(fn: (value: any) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    // Public API (keeps parity with existing p-select calls in the codebase)
    show(): void {
        this.matSelect?.open();
    }

    hide(): void {
        this.matSelect?.close();
    }

    clear(evt?: Event): void {
        if (evt) {
            evt.stopPropagation();
            evt.preventDefault();
        }
        this.value = undefined;
        this.onChange(this.value);
        this.selectionChange.emit(this.value);
    }

    /**
     * Clears the search text. By default does NOT emit `filterChange` (callers can reload explicitly).
     */
    resetFilter(emit = false): void {
        this.filterText = '';
        if (emit) {
            this.filterText$.next('');
        }
    }

    handleFocus(): void {
        this.onTouched();
        if (this.openOnFocus) {
            // Defer to next tick so focus processing finishes before opening.
            setTimeout(() => this.show(), 0);
        }
    }

    onMatSelectionChange(nextValue: any): void {
        this.value = nextValue;
        this.onChange(nextValue);
        this.selectionChange.emit(nextValue);
    }

    onFilterTextChanged(text: string): void {
        this.filterText = text ?? '';
        if (!this.localFilter) {
            this.filterText$.next(this.filterText);
        }
    }

    clearFilter(evt: Event): void {
        evt.stopPropagation();
        evt.preventDefault();
        this.resetFilter(true);
    }

    get displayedOptions(): any[] {
        if (!this.localFilter) {
            return this.options ?? [];
        }
        const q = (this.filterText || '').toLowerCase().trim();
        if (!q) {
            return this.options ?? [];
        }
        return (this.options ?? []).filter((o) => {
            const label = String(this.getOptionLabel(o) ?? '').toLowerCase();
            return label.includes(q);
        });
    }

    get selectedOption(): any {
        const opts = this.options ?? [];
        return opts.find((o) => this.getOptionValue(o) === this.value);
    }

    get isValueEmpty(): boolean {
        return this.value === undefined || this.value === null || this.value === '';
    }

    getOptionLabel(option: any): any {
        if (option === undefined || option === null) {
            return '';
        }
        if (typeof option === 'string' || typeof option === 'number') {
            return option;
        }
        return option?.[this.optionLabel];
    }

    getOptionValue(option: any): any {
        if (option === undefined || option === null) {
            return undefined;
        }
        if (typeof option === 'string' || typeof option === 'number') {
            return option;
        }
        return option?.[this.optionValue];
    }

    trackByOption = (_: number, option: any) => this.getOptionValue(option);
}

