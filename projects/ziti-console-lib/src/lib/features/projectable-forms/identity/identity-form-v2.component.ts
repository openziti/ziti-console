import {Component, Input} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {IdentityFormComponent} from './identity-form.component';
import {TokenMemo} from '../form-shell/token-memo';
import {AssociatedPager} from '../form-shell/associated-pager';
import {FormSummaryRow} from '../form-shell/form-summary.component';
import {isEqual} from 'lodash';

// Beta redesign of the identity form; logic is inherited, only the view differs.
@Component({
    selector: 'lib-identity-form-v2',
    templateUrl: './identity-form-v2.component.html',
    styleUrls: ['./identity-form.component.scss', './identity-form-v2.component.scss'],
    providers: [
        {
            provide: MatDialogRef,
            useValue: {}
        }
    ],
    standalone: false
})
export class IdentityFormV2Component extends IdentityFormComponent {
  // A host that shows other tabs (events, metrics...) hides the Form/JSON toggle and Save while one is open.
  @Input() hideHeaderActions = false;

  private readonly memo = new TokenMemo();

  // Associated lists load 5 at a time from the controller; fetched pages stay cached until the form reloads.
  readonly servicesPager = new AssociatedPager(
    (page, size, search) => this.fetchAssociated('services', page, size, search),
    (items) => this.associatedServices = items,
  );
  readonly servicePoliciesPager = new AssociatedPager(
    (page, size, search) => this.fetchAssociated('service-policies', page, size, search),
    (items) => this.associatedServicePolicies = items,
  );

  override getAssociatedServices() {
    if (this.formData?.id) {
      this.servicesPager.reset();
    }
  }

  override getAssociatedServicePolicies() {
    if (this.formData?.id) {
      this.servicePoliciesPager.reset();
    }
  }

  private async fetchAssociated(type: string, page: number, size: number, search: string) {
    const filters: any[] = search
      ? [{columnId: 'name', value: search, label: search, filterName: 'Name', type: 'TEXTINPUT', verb: 'icontains'}]
      : [];
    const paging = {...this.zitiService.DEFAULT_PAGING, page, total: size, noSearch: filters.length === 0};
    const result: any = await this.zitiService.getSubdata('identities', this.formData.id, type, paging, undefined, filters);
    const items = result?.data || [];
    return {items, total: result?.meta?.pagination?.totalCount ?? items.length};
  }

  readonly attributeTone = (): 'blue' => 'blue';
  readonly normalizeAttribute = (raw: string): string => {
    const value = (raw ?? '').trim();
    return !value || value.startsWith('#') ? value : `#${value}`;
  };

  get attributeTokens(): string[] {
    const attrs: string[] = this.formData?.roleAttributes || [];
    return this.memo.get('tokens', attrs.join('\u0000'), () => attrs.map(a => '#' + a));
  }

  get attributeSuggestions(): string[] {
    const attrs: string[] = this.identityRoleAttributes || [];
    return this.memo.get('suggestions', attrs.join('\u0000'), () => attrs.map(a => '#' + a));
  }

  onAttributeTokensChange(tokens: string[]) {
    this.roleAttributesChanged((tokens || []).map(t => t.replace(/^#/, '')));
  }

  readonly enrollmentOptions = [
    {value: 'ott', label: 'One-time token'},
    {value: 'CA', label: 'Certificate authority'},
    {value: 'updb', label: 'UPDB'},
    {value: 'none', label: 'None'},
  ];

  readonly viewOptions = [
    {value: 'simple', label: 'Form'},
    {value: 'raw', label: 'JSON'},
  ];

  readonly adminOptions = [
    {value: false, label: 'No'},
    {value: true, label: 'Yes'},
  ];

  get enrollmentSecondLabel(): string {
    return this.enrollmentType === 'CA' ? 'Certificate Authority' : 'UPDB Username';
  }

  onAdminChange(isAdmin: boolean) {
    if (!!this.formData.isAdmin !== !!isAdmin) {
      this.toggleIsAdmin();
    }
  }

  readonly precedenceOptions = [
    {value: 'default', label: 'Default'},
    {value: 'required', label: 'Required'},
    {value: 'failed', label: 'Failed'},
  ];

  private summaryCache: FormSummaryRow[] = [];

  // Same array instance until the content changes, so the summary only re-renders on real changes.
  get summaryRows(): FormSummaryRow[] {
    const next = this.buildSummaryRows();
    if (!isEqual(next, this.summaryCache)) {
      this.summaryCache = next;
    }
    return this.summaryCache;
  }

  private buildSummaryRows(): FormSummaryRow[] {
    const d = this.formData || {};
    const s = this.isEdit ? (this.initData || {}) : null;
    const authName = (id) => (this.authPolicies || []).find((p) => p.id === id)?.name || '-';
    const precedence = (v) => this.precedenceOptions.find((o) => o.value === v)?.label || '-';
    const hashed = (attrs: string[]) => (attrs || []).map((a) => '#' + a);
    const tagList = (o: any) => Object.entries(o?.tags || {}).map(([k, v]) => (v === '' || v == null ? k : `${k}: ${v}`));
    const rows: FormSummaryRow[] = [
      {label: 'Name', value: d.name || '-', saved: s ? (s.name || '-') : undefined},
    ];
    const typeOf = (enrollment: any) => enrollment?.ott ? 'ott' : enrollment?.updb ? 'updb' : enrollment?.ottca ? 'CA' : 'none';
    const typeLabel = (type: string) => this.enrollmentOptions.find(o => o.value === type)?.label || '-';
    rows.push({label: 'Enrollment', value: typeLabel(this.enrollmentType), saved: s ? typeLabel(typeOf(s.enrollment)) : undefined});
    const caName = (id: string) => (this.cas || []).find((c) => c.id === id)?.name || '-';
    if (this.enrollmentType === 'CA' || (s && typeOf(s.enrollment) === 'CA')) {
      rows.push({label: 'Certificate Authority', value: this.enrollmentType === 'CA' ? caName(d.enrollment?.ottca) : '-', saved: s ? (typeOf(s.enrollment) === 'CA' ? caName(s.enrollment?.ottca) : '-') : undefined});
    }
    if (this.enrollmentType === 'updb' || (s && typeOf(s.enrollment) === 'updb')) {
      rows.push({label: 'UPDB Username', value: this.enrollmentType === 'updb' ? (d.enrollment?.updb || '-') : '-', saved: s ? (typeOf(s.enrollment) === 'updb' ? (s.enrollment?.updb || '-') : '-') : undefined});
    }
    rows.push({label: 'Admin', value: d.isAdmin ? 'Yes' : 'No', tone: d.isAdmin ? 'primary' : 'muted', saved: s ? (s.isAdmin ? 'Yes' : 'No') : undefined});
    rows.push({label: 'Attributes', value: '', list: hashed(d.roleAttributes), savedList: s ? hashed(s.roleAttributes) : undefined});
    rows.push({label: 'Auth Policy', value: authName(d.authPolicyId), saved: s ? authName(s.authPolicyId) : undefined});
    if (d.externalId || s?.externalId) {
      rows.push({label: 'External ID', value: d.externalId || '-', saved: s ? (s.externalId || '-') : undefined});
    }
    rows.push({label: 'Hosting Cost', value: d.defaultHostingCost ?? 0, saved: s ? (s.defaultHostingCost ?? 0) : undefined});
    rows.push({label: 'Precedence', value: precedence(d.defaultHostingPrecedence), saved: s ? precedence(s.defaultHostingPrecedence) : undefined});
    rows.push({label: 'Custom Tags', value: '', list: tagList(d), savedList: s ? tagList(s) : undefined});
    return rows;
  }
}
