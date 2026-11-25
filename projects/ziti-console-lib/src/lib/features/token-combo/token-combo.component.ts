import {
  booleanAttribute,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

export type TokenTone = 'blue' | 'green' | 'violet' | 'amber' | 'neutral';

// Searchable multi-select: selected values show as removable chips (wrapping), with a themed suggestion list.
// The value is a string[]; the parent supplies `suggestions` in response to the debounced `search` output.
@Component({
    selector: 'lib-token-combo',
    templateUrl: './token-combo.component.html',
    styleUrls: ['./token-combo.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TokenComboComponent),
            multi: true,
        },
    ],
    standalone: false
})
export class TokenComboComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() placeholder = '';
  @Input() suggestions: string[] = [];
  // Debounce before emitting `search`; 0 for local lists, ~250 for an API-backed typeahead.
  @Input() searchDelay = 200;
  @Input() loading = false;
  // Commit whatever is typed as a token (Enter, comma, blur), not only picks from the list.
  @Input({transform: booleanAttribute}) allowCustom = false;
  @Input({transform: booleanAttribute}) disabled = false;
  // Show the dropdown as wrapping chips that match the selected ones.
  @Input({transform: booleanAttribute}) chipOptions = false;
  // Keep chosen options in the list (checked) so picking one again removes it.
  @Input({transform: booleanAttribute}) keepChosenVisible = false;
  // Narrow `suggestions` by the typed text here instead of in the parent.
  @Input({transform: booleanAttribute}) filterSuggestionsLocally = false;
  // Collapse chips beyond this count behind a "+N more" control.
  @Input() maxVisibleChips?: number;
  // Rewrite applied to every committed value (e.g. prefix a bare role with '#'); must be idempotent.
  @Input() normalizeToken?: (raw: string) => string;
  // Per-token chip colour; null for the neutral chip.
  @Input() toneFor?: (token: string) => TokenTone | null;

  @Output() search = new EventEmitter<string>();

  @ViewChild('field', {static: true}) field!: ElementRef<HTMLInputElement>;
  @ViewChild('root', {static: true}) root!: ElementRef<HTMLElement>;

  value: string[] = [];
  query = '';
  open = false;
  focused = false;
  activeIndex = -1;
  searching = false;
  chipsExpanded = false;
  panelUp = false;
  panelMaxHeightPx: number | null = null;

  private searchTimer: any;
  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  get busy(): boolean {
    return this.loading || this.searching;
  }

  toneOf(token: string): TokenTone | null {
    return this.toneFor ? this.toneFor(token) ?? null : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['suggestions']) {
      this.searching = false;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  writeValue(value: any): void {
    this.value = Array.isArray(value) ? [...value] : [];
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

  get visibleTokens(): string[] {
    return this.maxVisibleChips != null && !this.chipsExpanded && this.value.length > this.maxVisibleChips
        ? this.value.slice(0, this.maxVisibleChips)
        : this.value;
  }
  get hiddenTokenCount(): number {
    return this.maxVisibleChips != null && !this.chipsExpanded
        ? Math.max(0, this.value.length - this.maxVisibleChips)
        : 0;
  }
  // Tooltip for the "+N more" pill: the hidden values, so they can be read without expanding.
  get hiddenTitle(): string {
    const hidden = this.value.slice(this.maxVisibleChips ?? this.value.length);
    return hidden.length > 12 ? `${hidden.slice(0, 12).join(', ')}, …` : hidden.join(', ');
  }

  toggleChips(event: Event): void {
    event.stopPropagation();
    this.chipsExpanded = !this.chipsExpanded;
  }

  isChosen(option: string): boolean {
    return this.value.includes(this.normalized(option));
  }

  get visibleSuggestions(): string[] {
    const chosen = new Set(this.value);
    const q = this.filterSuggestionsLocally ? this.query.trim().toLowerCase() : '';
    return (this.suggestions || []).filter((s) => (this.keepChosenVisible || !chosen.has(s)) && (!q || s.toLowerCase().includes(q)));
  }

  // The value the typed text would create, or null if blank, already chosen or an exact suggestion.
  get createCandidate(): string | null {
    if (!this.allowCustom) return null;
    const raw = this.query.trim();
    if (!raw) return null;
    const token = this.normalized(raw);
    if (!token || this.value.includes(token)) return null;
    const lower = token.toLowerCase();
    return this.visibleSuggestions.some((s) => s.toLowerCase() === lower) ? null : token;
  }

  focusField(): void {
    if (this.disabled) return;
    this.field?.nativeElement?.focus();
  }

  onFocus(): void {
    this.focused = true;
    this.openPanel();
    this.debouncedSearch(this.query);
  }

  onInput(text: string): void {
    this.query = text;
    this.openPanel();
    this.debouncedSearch(text);
  }

  togglePanel(): void {
    if (this.disabled) return;
    if (this.open) {
      this.closePanel();
      return;
    }
    this.openPanel();
    this.debouncedSearch(this.query);
    this.focusField();
  }

  private openPanel(): void {
    this.open = true;
    this.activeIndex = -1;
    this.positionPanel();
  }

  // Open upward / cap the height when there is not enough room below the field.
  private positionPanel(): void {
    const box = this.root?.nativeElement?.querySelector('.tc-box') as HTMLElement | null;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const margin = 8;
    const cap = 240;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    this.panelUp = below < Math.min(cap, 160) && above > below;
    const avail = this.panelUp ? above : below;
    this.panelMaxHeightPx = Math.max(120, Math.min(cap, Math.floor(avail)));
  }

  private closePanel(): void {
    this.open = false;
    this.activeIndex = -1;
  }

  private debouncedSearch(query: string): void {
    clearTimeout(this.searchTimer);
    if (!this.filterSuggestionsLocally) {
      this.searching = true;
    }
    this.searchTimer = setTimeout(() => this.search.emit(query ?? ''), this.searchDelay);
  }

  private normalized(raw: string): string {
    const token = (raw ?? '').trim();
    return this.normalizeToken && token ? this.normalizeToken(token) : token;
  }

  private addValue(raw: string): void {
    const token = this.normalized(raw);
    if (!token || this.value.includes(token)) return;
    this.value = [...this.value, token];
    this.onChange([...this.value]);
  }

  private clearQuery(): void {
    this.query = '';
    if (this.field) this.field.nativeElement.value = '';
    this.activeIndex = -1;
  }

  selectSuggestion(suggestion: string): void {
    if (this.keepChosenVisible && this.isChosen(suggestion)) {
      this.remove(this.value.indexOf(this.normalized(suggestion)));
    } else {
      this.addValue(suggestion);
    }
    this.clearQuery();
    this.focusField();
    this.debouncedSearch('');
  }

  createFromQuery(): void {
    const token = this.createCandidate;
    if (!token) return;
    this.addValue(token);
    this.clearQuery();
    this.focusField();
    this.debouncedSearch('');
  }

  // Commit the typed text as tokens; commas/whitespace split a pasted list.
  private commitCustom(): void {
    (this.query || '').split(/[,\s]+/g).filter(Boolean).forEach((part) => this.addValue(part));
    this.clearQuery();
    this.closePanel();
  }

  onPaste(event: ClipboardEvent): void {
    if (!this.allowCustom) return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;
    event.preventDefault();
    this.query = text;
    this.commitCustom();
  }

  remove(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.disabled || index < 0 || index >= this.value.length) return;
    this.value = this.value.filter((_, i) => i !== index);
    this.onChange([...this.value]);
    this.focusField();
  }

  onKeydown(event: KeyboardEvent): void {
    const visible = this.visibleSuggestions;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open) this.openPanel();
        this.activeIndex = Math.min(this.activeIndex + 1, visible.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        break;
      case 'Enter':
        if (this.open && this.activeIndex >= 0 && visible[this.activeIndex]) {
          event.preventDefault();
          this.selectSuggestion(visible[this.activeIndex]);
        } else if (this.allowCustom && this.query.trim()) {
          event.preventDefault();
          this.commitCustom();
        }
        break;
      case ',':
        if (this.allowCustom && this.query.trim()) {
          event.preventDefault();
          this.commitCustom();
        }
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          event.stopPropagation();
          this.closePanel();
        }
        break;
      case 'Backspace':
        if (!this.query && this.value.length) {
          this.remove(this.value.length - 1);
        }
        break;
    }
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
    if (this.allowCustom && this.query.trim()) {
      this.commitCustom();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (this.open && this.root && !this.root.nativeElement.contains(event.target as Node)) {
      this.closePanel();
    }
  }
}
