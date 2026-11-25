import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {ServicePolicyFormComponent} from './service-policy-form.component';
import {FormSegment} from '../form-shell/form-segmented.component';
import {TokenMemo} from '../form-shell/token-memo';
import {AssociatedPager} from '../form-shell/associated-pager';
import {FormSummaryRow} from '../form-shell/form-summary.component';
import {isEqual} from 'lodash';

// Beta redesign of the service policy form; logic is inherited, only the view differs.
@Component({
    selector: 'lib-service-policy-form-v2',
    templateUrl: './service-policy-form-v2.component.html',
    styleUrls: ['./service-policy-form.component.scss', './service-policy-form-v2.component.scss'],
    providers: [
        {
            provide: MatDialogRef,
            useValue: {}
        }
    ],
    standalone: false
})
export class ServicePolicyFormV2Component extends ServicePolicyFormComponent {
  // Associated lists load 5 at a time from the controller; fetched pages stay cached until the selection changes.
  readonly servicesPager = new AssociatedPager((page, size, search) =>
    this.fetchAssociated('services', this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.svc.serviceNamedAttributesMap, page, size, search));
  readonly identitiesPager = new AssociatedPager((page, size, search) =>
    this.fetchAssociated('identities', this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.svc.identityNamedAttributesMap, page, size, search));
  readonly postureChecksPager = new AssociatedPager((page, size, search) =>
    this.fetchAssociated('posture-checks', this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.svc.postureNamedAttributesMap, page, size, search));

  private fetchAssociated(type: string, roles: string[], named: string[], nameToId: any, page: number, size: number, search: string) {
    const ids = (named || []).map((name) => nameToId?.[name]).filter(Boolean);
    return this.svc.getAssociatedPage(type, roles, ids, this.formData?.semantic || 'AnyOf', page, size, search);
  }

  override updateAssociations() {
    this.servicesPager.reset();
    this.identitiesPager.reset();
    this.postureChecksPager.reset();
  }

  override onServiceAttributesChanged(): void {
    this.servicesPager.reset();
    this.emitInputChange('service-attributes-changed');
  }

  override onIdentityAttributesChanged(): void {
    this.identitiesPager.reset();
    this.emitInputChange('identity-attributes-changed');
  }

  readonly attributeTone = (token: string): 'green' | 'blue' => (token.startsWith('@') ? 'green' : 'blue');
  readonly normalizeAttribute = (raw: string): string => {
    const value = (raw ?? '').trim();
    return !value || value.startsWith('@') || value.startsWith('#') ? value : `#${value}`;
  };

  private readonly memo = new TokenMemo();

  // The selected attribute lists are filled asynchronously after load; until then fall back to the saved roles.
  private attributesReady = false;

  override initSelectedAttributes() {
    super.initSelectedAttributes();
    this.attributesReady = true;
  }

  private tokens(id: string, roles: any[], named: any[]): string[] {
    const r = roles || [];
    const n = named || [];
    return this.memo.get(id, r.join('\u0000') + '\u0001' + n.join('\u0000'), () => [...r.map(x => '#' + x), ...n.map(x => '@' + x)]);
  }

  private static split(tokens: string[]): {roles: string[]; named: string[]} {
    const list = tokens || [];
    return {
      roles: list.filter(t => !t.startsWith('@')).map(t => t.replace(/^#/, '')),
      named: list.filter(t => t.startsWith('@')).map(t => t.slice(1)),
    };
  }

  get serviceTokens(): string[] { return this.tokens('svc', this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes); }
  get serviceSuggestions(): string[] { return this.tokens('svcSug', this.svc.serviceRoleAttributes, this.svc.serviceNamedAttributes); }
  get identityTokens(): string[] { return this.tokens('idn', this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes); }
  get identitySuggestions(): string[] { return this.tokens('idnSug', this.svc.identityRoleAttributes, this.svc.identityNamedAttributes); }
  get postureTokens(): string[] { return this.tokens('pst', this.svc.postureRoleAttributes, this.selectedPostureNamedAttributes); }
  get postureSuggestions(): string[] { return this.tokens('pstSug', [], this.svc.postureNamedAttributes); }

  onServiceTokensChange(tokens: string[]) {
    const {roles, named} = ServicePolicyFormV2Component.split(tokens);
    this.selectedServiceRoleAttributes = roles;
    this.selectedServiceNamedAttributes = named;
    this.onServiceAttributesChanged();
  }

  onIdentityTokensChange(tokens: string[]) {
    const {roles, named} = ServicePolicyFormV2Component.split(tokens);
    this.selectedIdentityRoleAttributes = roles;
    this.selectedIdentityNamedAttributes = named;
    this.onIdentityAttributesChanged();
  }

  onPostureTokensChange(tokens: string[]) {
    const {roles, named} = ServicePolicyFormV2Component.split(tokens);
    this.selectedPostureRoleAttributes = roles;
    this.svc.postureRoleAttributes = roles;
    this.selectedPostureNamedAttributes = named;
    this.postureChecksPager.reset();
  }

  readonly viewOptions: FormSegment[] = [
    {value: 'simple', label: 'Form'},
    {value: 'raw', label: 'JSON'},
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
    const s = d.id ? (this.initData || {}) : null;
    const idToName = (nameToId: any) => Object.entries(nameToId || {}).reduce((acc: any, [name, id]) => (acc[id as string] = name, acc), {});
    // Saved roles hold '#role' and '@id'; map the ids back to names so they compare with the live selection.
    const savedTokens = (roles: string[], nameToId: any): string[] => {
      const byId = idToName(nameToId);
      return (roles || []).map((r) => r.startsWith('@') ? (byId[r.slice(1)] ? '@' + byId[r.slice(1)] : '') : r).filter(Boolean);
    };
    const liveTokens = (roles: string[], named: string[], saved: string[]): string[] =>
      this.attributesReady ? [...(roles || []).map((x) => '#' + x), ...(named || []).filter(Boolean).map((x) => '@' + x)] : saved;
    const tagList = (o: any) => Object.entries(o?.tags || {}).map(([k, v]) => (v === '' || v == null ? k : `${k}: ${v}`));
    const attrRow = (label: string, selRoles: string[], selNamed: string[], roles: string[], nameToId: any): FormSummaryRow => {
      const saved = savedTokens(roles, nameToId);
      return {label, value: '', list: liveTokens(selRoles, selNamed, saved), savedList: s ? saved : undefined};
    };
    return [
      {label: 'Name', value: d.name || '-', saved: s ? (s.name || '-') : undefined},
      {label: 'Type', value: d.type || '-', tone: 'primary', saved: s ? (s.type || '-') : undefined},
      {label: 'Semantic', value: d.semantic || '-', saved: s ? (s.semantic || '-') : undefined},
      attrRow('Service attributes', this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, s ? s.serviceRoles : d.serviceRoles, this.svc.serviceNamedAttributesMap),
      attrRow('Identity attributes', this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, s ? s.identityRoles : d.identityRoles, this.svc.identityNamedAttributesMap),
      attrRow('Posture attributes', this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, s ? s.postureCheckRoles : d.postureCheckRoles, this.svc.postureNamedAttributesMap),
      {label: 'Custom Tags', value: '', list: tagList(d), savedList: s ? tagList(s) : undefined},
    ];
  }
}
