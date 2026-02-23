import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import moment from 'moment';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDatepickerModule } from '@angular/material/datepicker';

@Component({
  selector: 'lib-date-time-picker',
  templateUrl: './date-time-picker.component.html',
  styleUrls: ['./date-time-picker.component.scss'],
  imports: [CommonModule, OverlayModule, MatDatepickerModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
  ],
  standalone: true,
})
export class DateTimePickerComponent implements ControlValueAccessor {
  @Input() minDate: Date | null = null;
  @Input() placeholder = 'MM/DD/YYYY HH:mm';
  @Input() displayFormat = 'MM/DD/YYYY HH:mm';
  @Input() ariaLabel = 'Open date & time picker';
  @Input() closeOnDateSelect = true;
  /** CSS length, e.g. "22rem" or "420px" */
  @Input() panelWidth = '22rem';

  open = false;
  disabled = false;

  value: Date = new Date();
  hour = this.value.getHours();
  minute = this.value.getMinutes();

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  get displayValue() {
    return this.value ? moment(this.value).local().format(this.displayFormat) : '';
  }

  writeValue(value: Date | null): void {
    this.value = value ? new Date(value) : new Date();
    this.syncTimeFromDate();
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.disabled) {
      this.open = false;
    }
  }

  toggle() {
    if (this.disabled) {
      return;
    }
    this.open = !this.open;
    if (this.open) {
      this.syncTimeFromDate();
    } else {
      this.onTouched();
    }
  }

  close() {
    this.open = false;
    this.onTouched();
  }

  onDateSelected(newDate: Date | null) {
    if (!newDate) {
      return;
    }
    const d = new Date(newDate);
    const current = this.value ? new Date(this.value) : new Date();
    d.setHours(this.hour, this.minute, current.getSeconds() + 5, current.getMilliseconds());
    this.value = d;
    this.onChange(this.value);
    if (this.closeOnDateSelect) {
      this.close();
    }
  }

  adjustHour(delta: number) {
    this.hour = (this.hour + delta + 24) % 24;
    this.applyTimeToDate();
  }

  adjustMinute(delta: number) {
    this.minute = (this.minute + delta + 60) % 60;
    this.applyTimeToDate();
  }

  twoDigit(n: number) {
    return String(Number.isFinite(n) ? n : 0).padStart(2, '0');
  }

  private syncTimeFromDate() {
    const d = this.value ? new Date(this.value) : new Date();
    this.hour = d.getHours();
    this.minute = d.getMinutes();
  }

  private applyTimeToDate() {
    const d = this.value ? new Date(this.value) : new Date();
    d.setHours(this.hour, this.minute, d.getSeconds() + 5, d.getMilliseconds());
    this.value = d;
    this.onChange(this.value);
  }
}

