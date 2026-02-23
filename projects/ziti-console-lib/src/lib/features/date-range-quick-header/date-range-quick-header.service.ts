import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type ZitiDateRangeQuickOption = {
    id: string;
    label: string;
};

@Injectable()
export class DateRangeQuickHeaderService {
    readonly rangeClick$ = new Subject<string>();
    readonly selectedRange$ = new BehaviorSubject<string>('');
    readonly options$ = new BehaviorSubject<ZitiDateRangeQuickOption[]>([
        { id: 'hour', label: 'Last Hour' },
        { id: 'day', label: 'Last Day' },
        { id: 'week', label: 'Last Week' },
        { id: 'month', label: 'Last Month' },
    ]);

    clickRange(id: string) {
        this.rangeClick$.next(id);
    }

    setSelectedRange(id: string) {
        this.selectedRange$.next(id);
    }

    setOptions(options: ZitiDateRangeQuickOption[]) {
        this.options$.next(options);
    }
}

