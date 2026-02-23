import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'lib-chips-input',
  templateUrl: './chips-input.component.html',
  styleUrls: ['./chips-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipsInputComponent),
      multi: true
    }
  ],
  host: {
    class: 'p-chips p-component p-input-wrapper',
    '[class.p-focus]': 'focused',
    '[class.error]': 'invalid'
  },
  standalone: false
})
export class ChipsInputComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() inputId?: string;
  @Input() addOnBlur = true;
  @Input() allowDuplicate = false;
  @Input() separator = ',';
  @Input() invalid = false;

  @Output() onAdd = new EventEmitter<any>();
  @Output() onRemove = new EventEmitter<any>();
  @Output() onModelChange = new EventEmitter<string[]>();
  @Output() onBlur = new EventEmitter<FocusEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  @ViewChild('chipInput', { static: true }) chipInput!: ElementRef<HTMLInputElement>;

  value: string[] = [];
  disabled = false;
  focused = false;

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: any): void {
    if (!val) {
      this.value = [];
      return;
    }
    if (Array.isArray(val)) {
      this.value = [...val];
      return;
    }
    // fallback: accept string -> split into tokens
    this.value = this.splitIntoTokens(String(val));
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  focusInput() {
    if (this.disabled) return;
    this.chipInput?.nativeElement?.focus();
  }

  onFocus() {
    this.focused = true;
  }

  handleBlur(event?: FocusEvent) {
    this.focused = false;
    this.onTouched();
    if (this.addOnBlur) {
      this.commitFromInput();
    }
    this.onBlur.emit(event as any);
  }

  onPaste(event: ClipboardEvent) {
    if (this.disabled) return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;
    event.preventDefault();
    this.addTokens(this.splitIntoTokens(text));
    this.clearInput();
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    const input = this.chipInput?.nativeElement;
    const current = input?.value ?? '';
    const key = event.key?.toLowerCase();

    if (key === 'backspace' && !current) {
      if (this.value.length) {
        this.removeAtIndex(this.value.length - 1, event);
      }
      return;
    }

    const isSeparatorKey =
      key === 'enter' ||
      key === ' ' ||
      (this.separator === ',' && key === ',') ||
      (this.separator === ';' && key === ';');

    if (isSeparatorKey) {
      event.preventDefault();
      event.stopPropagation();
      this.commitFromInput();
    }
  }

  removeAtIndex(index: number, event?: Event) {
    if (this.disabled) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (index < 0 || index >= this.value.length) return;
    const removed = this.value[index];
    this.value = this.value.filter((_, i) => i !== index);
    this.propagateModel();
    this.onRemove.emit({ value: removed, index });
    this.focusInput();
  }

  private commitFromInput() {
    const input = this.chipInput?.nativeElement;
    const raw = input?.value ?? '';
    const tokens = this.splitIntoTokens(raw);
    if (tokens.length) {
      this.addTokens(tokens);
    }
    this.clearInput();
  }

  private addTokens(tokens: string[]) {
    const added: string[] = [];
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      if (!this.allowDuplicate && this.value.includes(trimmed)) continue;
      this.value = [...this.value, trimmed];
      added.push(trimmed);
    }
    if (added.length) {
      this.propagateModel();
      // mimic PrimeNG-ish event shape
      this.onAdd.emit({ value: added.length === 1 ? added[0] : added });
    }
  }

  private propagateModel() {
    const next = [...this.value];
    this.onChange(next);
    this.onModelChange.emit(next);
  }

  private clearInput() {
    const input = this.chipInput?.nativeElement;
    if (input) input.value = '';
  }

  private splitIntoTokens(text: string): string[] {
    if (!text) return [];
    // support whitespace + commas regardless of `separator` to match prior UX (e.g. "80 120-125 443,8080")
    return text
      .split(/[,\s]+/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

