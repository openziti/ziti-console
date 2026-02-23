import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { MatCalendar } from '@angular/material/datepicker';
import { Subscription } from 'rxjs';
import { DateRangeQuickHeaderService, ZitiDateRangeQuickOption } from './date-range-quick-header.service';

@Component({
    selector: 'lib-date-range-quick-header',
    templateUrl: './date-range-quick-header.component.html',
    styleUrls: ['./date-range-quick-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class DateRangeQuickHeaderComponent implements OnDestroy {
    selectedRange = '';
    options: ZitiDateRangeQuickOption[] = [];
    private sub = new Subscription();

    constructor(
        private calendar: MatCalendar<Date>,
        private dateAdapter: DateAdapter<Date>,
        private cdr: ChangeDetectorRef,
        private headerService: DateRangeQuickHeaderService
    ) {
        this.sub.add(
            this.headerService.selectedRange$.subscribe((range) => {
                this.selectedRange = range;
                this.cdr.markForCheck();
            })
        );
        this.sub.add(
            this.headerService.options$.subscribe((options) => {
                this.options = options;
                this.cdr.markForCheck();
            })
        );
        this.sub.add(
            this.calendar.stateChanges.subscribe(() => {
                this.cdr.markForCheck();
            })
        );
    }

    get periodLabel(): string {
        return this.calendar.activeDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }

    previousClicked(): void {
        this.calendar.activeDate = this.dateAdapter.addCalendarMonths(this.calendar.activeDate, -1);
    }

    nextClicked(): void {
        this.calendar.activeDate = this.dateAdapter.addCalendarMonths(this.calendar.activeDate, 1);
    }

    quickRange(id: string) {
        this.headerService.clickRange(id);
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}

