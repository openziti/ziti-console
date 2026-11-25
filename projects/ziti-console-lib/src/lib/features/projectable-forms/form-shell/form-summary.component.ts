import {Component, DoCheck, Input} from '@angular/core';

export interface FormSummaryRow {
  label: string;
  value: string | number;
  tone?: 'positive' | 'negative' | 'primary' | 'muted';
  saved?: string | number;
  // Multi-value rows (attributes, tags): shown as chips, with added / removed values marked against the saved list.
  list?: string[];
  savedList?: string[];
}

export interface FormSummaryChip {
  text: string;
  state: 'added' | 'removed';
}

@Component({
    selector: 'lib-form-summary',
    templateUrl: './form-summary.component.html',
    styleUrls: ['./form-summary.component.scss'],
    standalone: false
})
export class FormSummaryComponent implements DoCheck {
  @Input() heading = 'Summary';
  @Input() rows: FormSummaryRow[] = [];
  @Input() isNew = false;

  private static readonly CHIP_CAP = 8;
  private expandedRows = new Set<string>();

  isChanged(row: FormSummaryRow): boolean {
    if (row.list) {
      return this.chips(row).length > 0;
    }
    return row.saved !== undefined && String(row.saved) !== String(row.value);
  }

  // Only what changed: values added (flagged) and values saved but now removed. Unchanged values are left out.
  chips(row: FormSummaryRow): FormSummaryChip[] {
    const current = row.list || [];
    const saved = row.savedList;
    if (saved === undefined) {
      return [];
    }
    const out: FormSummaryChip[] = current.filter((text) => !saved.includes(text)).map((text) => ({text, state: 'added' as const}));
    saved.filter((text) => !current.includes(text)).forEach((text) => out.push({text, state: 'removed'}));
    return out;
  }

  shownChips(row: FormSummaryRow): FormSummaryChip[] {
    const all = this.chips(row);
    return this.expandedRows.has(row.label) ? all : all.slice(0, FormSummaryComponent.CHIP_CAP);
  }

  hiddenChips(row: FormSummaryRow): number {
    return this.expandedRows.has(row.label) ? 0 : Math.max(0, this.chips(row).length - FormSummaryComponent.CHIP_CAP);
  }

  canCollapse(row: FormSummaryRow): boolean {
    return this.expandedRows.has(row.label) && this.chips(row).length > FormSummaryComponent.CHIP_CAP;
  }

  toggleChips(row: FormSummaryRow) {
    this.expandedRows.has(row.label) ? this.expandedRows.delete(row.label) : this.expandedRows.add(row.label);
  }

  delta(row: FormSummaryRow): string {
    const chips = this.chips(row);
    const added = chips.filter((c) => c.state === 'added').length;
    const removed = chips.filter((c) => c.state === 'removed').length;
    return [added ? `+${added}` : '', removed ? `−${removed}` : ''].filter(Boolean).join(' ');
  }

  // Only changed rows are listed, and only in edit mode (a new record has nothing saved to compare with).
  get changedRows(): FormSummaryRow[] { return this.isNew ? [] : this.rows.filter((r) => this.isChanged(r)); }

  get changedCount(): number { return this.changedRows.length; }

  get stateLabel(): string { return `${this.changedCount} unsaved ${this.changedCount === 1 ? 'change' : 'changes'}`; }

  expanded = false;

  toggle() { this.expanded = !this.expanded; }

  // Each time the card appears it starts collapsed.
  ngDoCheck() {
    if (!this.changedCount) { this.expanded = false; }
  }
}
