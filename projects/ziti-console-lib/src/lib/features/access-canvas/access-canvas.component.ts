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

import {ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {GrowlerService} from '../messaging/growler.service';
import {GrowlerModel} from '../messaging/growler.model';
import {AccessCanvasService, AcRevert} from './access-canvas.service';
import {
    AcEndpoint, AcGrantResult, AcIdentity, AcKind, AcLayout, AcModel, AcOp, AcStep,
    CONCEPTS, KIND_LABEL, accessSet, advise, applyOps, buildOptions, clients, clone, describeCalls, entitiesOf, groups,
} from './access-canvas.logic';
import {
    Board, BoardFilters, Clip, ClipItem, IntentResult, buildBoard, emptyLayout, freeKey, groupKey, marksFor, moveMember,
    pasteAsNew, pasteIntoGroup, pasteOntoEntities, remapLayout, removeFromGroups,
} from './canvas-board.logic';
import {LayoutStore, layoutFile, parseLayout} from './canvas-layout.store';
import {BoardCommand, CanvasBoardComponent, MemberDrop, NodeDrop, SelItem} from './canvas-board.component';
import {AccessWizardComponent} from './access-wizard.component';
import {WizardPlan} from './access-wizard.logic';

interface Pending { id: string; title: string; summary: string; ops: AcOp[]; calls: string[]; next?: string[]; }
interface Applied { title: string; reverts: AcRevert[]; }
type ProbKind = 'identity' | 'service' | 'router' | 'policy';
/** One row in the problems table: one problem on one item. */
interface ProblemRow {
    id: string; kind: ProbKind; typeLabel: string; name: string;
    problem: string; detail: string; hint: string; node: string; route: any[];
}
type ProbSort = 'type' | 'name' | 'problem';

/** What to do about each kind of problem, in the console's own words. */
const PROBLEM_HINTS: Record<string, string> = {
    'Not enrolled': 'Enroll it with its one-time token (JWT), shown in the Token column on the Identities page. The token expires; create a new one if it has.',
    'No edge router policy': 'Add a Router Policy whose Identity Attributes include this identity (for example #all on #all).',
    'Hosting identity is offline': 'Start the tunneler on the machine that hosts its services, or check its network.',
    'Not hosted': 'Add a Bind service policy whose Service Attributes select this service and whose Identity Attributes select the identity running next to the server.',
    'Host not enrolled': 'Enroll the identity that hosts it (see its Token on the Identities page).',
    'No service edge router policy': 'Add a Service Router Policy whose Service Attributes include this service (for example #all on #all).',
    'Nobody can use it': 'Add a Dial service policy that selects this service, or give the service a role attribute an existing Dial policy already selects.',
    'Offline': 'Check that the router process is running and can reach the controller.',
    'Selects no identities': 'Give the intended identities this role attribute (Roles on the Identities page), or change the policy\'s Identity Attributes.',
    'Selects no services': 'Give the intended services this role attribute (Roles on the Services page), or change the policy\'s Service Attributes.',
    'Selects no routers': 'Give the intended routers this role attribute, or change the policy\'s Router Attributes.',
    'Names a missing identity': 'The @name it refers to no longer exists. Edit the policy.',
    'Names a missing service': 'The @name it refers to no longer exists. Edit the policy.',
    'Names a missing router': 'The @name it refers to no longer exists. Edit the policy.',
};
const POLICY_LABEL: Record<string, string> = {dial: 'Dial policy', bind: 'Bind policy', erp: 'Router Policy', serp: 'Service Router Policy'};
const POLICY_ROUTE: Record<string, string> = {dial: '/service-policies', bind: '/service-policies', erp: '/router-policies', serp: '/service-router-policies'};
const ENTITY_ROUTE: Record<AcKind, string> = {identity: '/identities', service: '/services', router: '/routers'};

const KINDS: AcKind[] = ['identity', 'service', 'router'];

@Component({
    selector: 'lib-access-canvas',
    standalone: true,
    imports: [CommonModule, FormsModule, CanvasBoardComponent, AccessWizardComponent],
    templateUrl: './access-canvas.component.html',
    styleUrls: ['./access-canvas.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AccessCanvasComponent implements OnInit, OnDestroy {
    @ViewChild(CanvasBoardComponent) boardCmp?: CanvasBoardComponent;

    readonly concepts = CONCEPTS;
    readonly kinds = KINDS;
    readonly kindLabel = KIND_LABEL;
    loading = true;
    busy = false;
    loadError = '';
    readOnly = false;

    committed: AcModel | null = null;
    draft: AcModel | null = null;
    pending: Pending[] = [];
    history: Applied[] = [];

    /** Card positions and empty groups. Kept in this browser as soon as they change; never sent to the controller. */
    layoutDraft: AcLayout = emptyLayout();
    private layoutStore!: LayoutStore;
    layoutMenu = false;

    filters: BoardFilters = {types: {identity: true, service: true, router: true}, attrs: [], search: '', problemsOnly: false};
    filterMenu = false;
    attrQuery = '';
    expanded = new Set<string>();
    board: Board = {nodes: [], edges: []};
    problemTotal = 0;
    /** Every problem, one row each, regardless of canvas filters. */
    problemRowsAll: ProblemRow[] = [];
    problemsOpen = false;
    pf: { q: string; kind: ProbKind | 'all'; type: string } = {q: '', kind: 'all', type: ''};
    pSort: { col: ProbSort; dir: 1 | -1 } = {col: 'type', dir: 1};
    clip: Clip | null = null;

    shownConcepts = new Set<string>();
    /** The set-up wizard is open. */
    wizardOpen = false;
    /** What's left to do by hand after applying wizard changes (enrolling new identities). */
    followUps: { title: string; steps: string[] }[] = [];
    helpOpen = false;
    /** The panel floating over the right of the board, if open. */
    drawer: 'pending' | 'advisor' | null = null;
    /** Briefly true after a change is queued, so the pending button draws the eye. */
    pulse = false;
    private pulseTimer?: ReturnType<typeof setTimeout>;
    advisorClients: { attr: string; members: AcIdentity[] }[] = [];
    advisorI = '';
    advisorS = '';
    advice: AcStep[] = [];
    adviceFail: AcStep | null = null;
    advicePosture = false;

    dialog: { src: AcEndpoint; tgt: AcEndpoint | null; result?: AcGrantResult; selected: number; } | null = null;
    dialogTarget = '';
    newGroup: { kind: AcKind; attr: string; at: { x: number; y: number } } | null = null;

    private seq = 1;

    constructor(
        private svc: AccessCanvasService,
        private growler: GrowlerService,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnDestroy(): void { clearTimeout(this.pulseTimer); }

    ngOnInit(): void {
        this.readOnly = !this.svc.canEdit();
        this.layoutStore = this.svc.layoutStore();
        this.layoutDraft = this.layoutStore.load() || emptyLayout();
        this.reload();
    }

    // ------------------------------------------------------------------ data
    async reload(): Promise<void> {
        this.loading = !this.committed;
        this.loadError = '';
        let stage = 'loading the network';
        try {
            this.committed = await this.svc.load();
            stage = 'drawing the canvas';
            this.refresh();
        } catch (err) {
            console.error('[access-canvas] failed while ' + stage, err);
            this.loadError = `${this.svc.errorText(err)} (while ${stage})`;
        } finally {
            this.loading = false;
            this.cdr.markForCheck();
        }
    }

    /** Refresh button: reload from the controller, then fit the board to the screen. */
    async refreshAndFit(): Promise<void> {
        await this.reload();
        requestAnimationFrame(() => this.boardCmp?.fit());
    }

    toggleDrawer(d: 'pending' | 'advisor'): void { this.drawer = this.drawer === d ? null : d; }

    private newId = () => `new-${this.seq++}`;

    refresh(): void {
        if (!this.committed) return;
        const m = this.draft = this.pending.reduce((acc, c) => applyOps(acc, c.ops), clone(this.committed));
        this.board = buildBoard(m, {layout: this.layoutDraft, filters: this.filters, marks: marksFor(this.pending.map(p => p.ops)), expanded: this.expanded});
        this.collectProblems(m);
        this.advisorClients = groups(clients(m)).map(([attr, members]) => ({attr, members}));
        this.runAdvisor();
    }

    // ------------------------------------------------------------------ filters
    get allAttrs(): { attr: string; count: number; kinds: string }[] {
        if (!this.draft) return [];
        const map = new Map<string, { count: number; kinds: Set<AcKind> }>();
        for (const k of KINDS) for (const e of entitiesOf(this.draft, k)) for (const a of e.attrs) {
            if (!map.has(a)) map.set(a, {count: 0, kinds: new Set()});
            const v = map.get(a)!; v.count++; v.kinds.add(k);
        }
        const q = this.attrQuery.trim().toLowerCase().replace(/^#/, '');
        return [...map.entries()].filter(([a]) => !q || a.toLowerCase().includes(q)).sort((a, b) => a[0].localeCompare(b[0]))
            .map(([attr, v]) => ({attr, count: v.count, kinds: [...v.kinds].map(k => KIND_LABEL[k][1]).join(', ')}));
    }
    toggleType(k: AcKind): void { this.filters.types[k] = !this.filters.types[k]; this.refresh(); }
    toggleAttr(a: string): void {
        const s = new Set(this.filters.attrs);
        s.has(a) ? s.delete(a) : s.add(a);
        this.filters.attrs = [...s];
        this.refresh();
    }
    clearFilters(): void {
        this.filters = {types: {identity: true, service: true, router: true}, attrs: [], search: '', problemsOnly: false};
        this.refresh();
    }
    /** How many filters narrow the view (hidden kinds plus picked attributes). */
    get narrowCount(): number { return KINDS.filter(k => !this.filters.types[k]).length + this.filters.attrs.length; }
    get searchMatches(): number {
        return this.board.nodes.reduce((n, x) => n + (x.type === 'group' ? x.members.filter(mb => mb.hit).length + (x.hit && !x.members.some(mb => mb.hit) ? 1 : 0) : x.hit ? 1 : 0), 0);
    }
    /** One row per problem on each identity, service, router or policy (an entity in two groups counts once). */
    private collectProblems(m: AcModel): void {
        const all = buildBoard(m, {
            layout: this.layoutDraft, marks: marksFor([]), expanded: new Set(),
            filters: {types: {identity: true, service: true, router: true}, attrs: [], search: '', problemsOnly: false},
        });
        const rows: ProblemRow[] = [];
        const seen = new Set<string>();
        const push = (base: Omit<ProblemRow, 'id' | 'problem' | 'detail' | 'hint'>, problems: string[]) => {
            for (const text of problems) {
                const i = text.indexOf(': ');
                const problem = i > 0 ? text.slice(0, i) : text, detail = i > 0 ? text.slice(i + 2) : '';
                rows.push({...base, id: `${base.node}|${text}`, problem, detail, hint: PROBLEM_HINTS[problem] || ''});
            }
        };
        const entity = (kind: AcKind, id: string, name: string, node: string, problems: string[]) => {
            if (!problems.length || seen.has(kind + ':' + id)) return;
            seen.add(kind + ':' + id);
            push({kind, typeLabel: KIND_LABEL[kind][0][0].toUpperCase() + KIND_LABEL[kind][0].slice(1), name, node, route: [ENTITY_ROUTE[kind], id]}, problems);
        };
        for (const n of all.nodes) {
            if (n.type === 'group') n.members.forEach(mb => entity(mb.kind, mb.id, mb.name, `m|${n.key}|${mb.id}`, mb.problems));
            else if (n.type === 'free') entity(n.kind!, n.entity!.id, n.entity!.name, n.key, n.problems);
            else if (n.problems.length) {
                const pol = n.policy!;
                push({kind: 'policy', typeLabel: POLICY_LABEL[pol.family], name: pol.name, node: n.key, route: [POLICY_ROUTE[pol.family], pol.id]}, n.problems);
            }
        }
        this.problemRowsAll = rows;
        this.problemTotal = new Set(rows.map(r => r.node.startsWith('m|') ? r.route.join('/') : r.node)).size;
    }

    get probKinds(): { v: ProbKind | 'all'; label: string; n: number }[] {
        const n = (k: ProbKind) => this.problemRowsAll.filter(r => r.kind === k).length;
        return [
            {v: 'all', label: 'All', n: this.problemRowsAll.length},
            {v: 'identity', label: 'Identities', n: n('identity')},
            {v: 'service', label: 'Services', n: n('service')},
            {v: 'router', label: 'Routers', n: n('router')},
            {v: 'policy', label: 'Policies', n: n('policy')},
        ].filter(k => k.v === 'all' || k.n) as any;
    }
    get probTypes(): string[] { return [...new Set(this.problemRowsAll.map(r => r.problem))].sort(); }

    /** Rows after the dialog's filters and sort. */
    get problemRows(): ProblemRow[] {
        const q = this.pf.q.trim().toLowerCase();
        const rows = this.problemRowsAll.filter(r =>
            (this.pf.kind === 'all' || r.kind === this.pf.kind) && (!this.pf.type || r.problem === this.pf.type)
            && (!q || `${r.name} ${r.typeLabel} ${r.problem} ${r.detail}`.toLowerCase().includes(q)));
        const key = (r: ProblemRow) => this.pSort.col === 'type' ? r.typeLabel + ' ' + r.name : this.pSort.col === 'name' ? r.name : r.problem + ' ' + r.name;
        return rows.sort((a, b) => key(a).localeCompare(key(b)) * this.pSort.dir);
    }
    sortProblems(col: ProbSort): void { this.pSort = {col, dir: this.pSort.col === col ? (-this.pSort.dir as 1 | -1) : 1}; }
    sortMark(col: ProbSort): string { return this.pSort.col === col ? (this.pSort.dir === 1 ? '▲' : '▼') : ''; }
    openProblems(): void { this.pf = {q: '', kind: 'all', type: ''}; this.problemsOpen = true; }

    /** Close the dialog and point at the item on the canvas (clearing filters that hide it). */
    showProblem(r: ProblemRow): void {
        this.problemsOpen = false;
        const nodeKey = r.node.startsWith('m|') ? r.node.split('|')[1] : r.node;
        if (!this.board.nodes.some(n => n.key === nodeKey)) this.clearFilters();
        requestAnimationFrame(() => {
            this.boardCmp?.reveal(nodeKey);
            if (r.node.startsWith('m|') && this.boardCmp) { this.boardCmp.selected = new Set([r.node]); this.boardCmp.closeMenu(); }
        });
    }
    openProblem(r: ProblemRow): void {
        if (String(r.route[1]).startsWith('new-')) { this.toast('info', 'Not created yet', 'Apply pending changes first.'); return; }
        this.router.navigate(r.route);
    }
    toggleProblemsOnly(): void {
        this.filters.problemsOnly = !this.filters.problemsOnly;
        this.problemsOpen = false;
        this.refresh();
        requestAnimationFrame(() => this.boardCmp?.fit());
    }

    get filtersActive(): boolean {
        const f = this.filters;
        return !f.types.identity || !f.types.service || !f.types.router || !!f.attrs.length || !!f.search.trim() || f.problemsOnly;
    }
    onSearch(): void { this.refresh(); }
    revealFirstHit(): void {
        const n = this.board.nodes.find(x => x.hit);
        if (n) this.boardCmp?.reveal(n.key);
    }

    // ------------------------------------------------------------------ layout (kept in this browser)
    onMoved(moves: { key: string; x: number; y: number }[]): void {
        if (this.readOnly || !this.committed) return;
        // First move: freeze every automatic position so nothing else jumps around.
        if (Object.keys(this.layoutDraft.nodes).length === 0 || moves.some(mv => !this.layoutDraft.nodes[mv.key])) {
            this.layoutDraft = this.positionsNow();
        }
        for (const mv of moves) this.layoutDraft.nodes[mv.key] = {x: mv.x, y: mv.y};
        this.saveLayout();
    }

    /** The layout with every item placed: saved positions plus the automatic ones. */
    private positionsNow(): AcLayout {
        const out = clone(this.layoutDraft);
        if (!this.draft) return out;
        const all = buildBoard(this.draft, {
            layout: this.layoutDraft, marks: marksFor([]), expanded: this.expanded,
            filters: {types: {identity: true, service: true, router: true}, attrs: [], search: '', problemsOnly: false},
        });
        for (const n of all.nodes) if (!out.nodes[n.key]) out.nodes[n.key] = {x: n.x, y: n.y};
        return out;
    }

    autoArrange(): void {
        this.layoutMenu = false;
        this.layoutDraft = {v: 1, nodes: {}, groups: [...(this.layoutDraft.groups || [])]};
        this.saveLayout();
        requestAnimationFrame(() => this.boardCmp?.fit());
    }

    /** Layout is presentation only, so it's kept at once rather than queued as a pending change. */
    private saveLayout(): void {
        this.layoutStore.save(this.layoutDraft);
        this.refresh();
    }

    /** Downloads the current arrangement as JSON, e.g. to share it with another admin. */
    exportLayout(): void {
        this.layoutMenu = false;
        const controller = this.svc.controllerName();
        const json = JSON.stringify(layoutFile(this.positionsNow(), controller), null, 2);
        const host = (controller.replace(/^https?:\/\//, '').split(/[/:]/)[0] || 'controller').replace(/[^a-z0-9.-]/gi, '_');
        const url = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
        const a = document.createElement('a');
        a.href = url;
        a.download = `access-canvas-layout-${host}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /** Replaces the arrangement with one from an exported file. */
    async importLayout(ev: Event): Promise<void> {
        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        this.layoutMenu = false;
        if (!file) return;
        let data: any = null;
        try { data = JSON.parse(await file.text()); } catch { /* reported below */ }
        const layout = parseLayout(data);
        if (!layout) {
            this.toast('warning', 'Not imported', "That file isn't an Access Canvas layout. Use a file made with Export layout.");
            this.cdr.markForCheck();
            return;
        }
        const known = new Set(Object.keys(this.positionsNow().nodes));
        const matched = Object.keys(layout.nodes).filter(k => known.has(k)).length;
        this.layoutDraft = layout;
        this.saveLayout();
        requestAnimationFrame(() => this.boardCmp?.fit());
        const from = typeof data.controller === 'string' && data.controller && data.controller !== this.svc.controllerName()
            ? ` It was exported from ${data.controller}; items that don't exist here are placed automatically.` : '';
        this.toast('success', 'Layout imported', `${this.plural(matched, 'item', 'items')} placed from ${file.name}.${from}`);
        this.cdr.markForCheck();
    }

    // ------------------------------------------------------------------ board events
    onMemberDrop(ev: MemberDrop): void {
        const m = this.draft;
        if (!m || this.readOnly) return;
        const it = ev.item, t = ev.target;
        const ent = {kind: it.kind!, id: it.id!, name: it.name || ''};
        if (t.type === 'empty') {
            if (it.type === 'member') this.queueIntent(moveMember(m, ent, it.attr, null, false));
            return;
        }
        if (it.kind === 'identity' && t.kind === 'service') {
            this.openGrant({kind: 'identity', id: it.id}, t.type === 'group' ? {kind: 'group', attr: t.attr} : {kind: 'service', id: t.id});
            return;
        }
        if (t.kind !== it.kind) {
            this.toast('warning', "Can't drop there", `Drop ${KIND_LABEL[it.kind!][1]} into an ${KIND_LABEL[it.kind!][0]} group${it.kind === 'identity' ? ', or onto a service to give access' : ''}.`);
            return;
        }
        if (t.type === 'group' || t.type === 'member') {
            this.queueIntent(moveMember(m, ent, it.type === 'member' ? it.attr : undefined, t.attr, ev.copy));
        } else {
            this.toast('info', 'Drop into a group', 'To give it the same access, copy it (⌘C), select the other card and paste (⌘V).');
        }
    }

    onNodeDrop(ev: NodeDrop): void {
        const it = ev.item, t = ev.target;
        if (this.readOnly || t.type === 'empty' || it.kind !== 'identity' || t.kind !== 'service') return;
        const src: AcEndpoint = it.type === 'group' ? {kind: 'group', attr: it.attr} : {kind: 'identity', id: it.id};
        const tgt: AcEndpoint = t.type === 'group' ? {kind: 'group', attr: t.attr} : {kind: 'service', id: t.id};
        this.openGrant(src, tgt);
    }

    onCommand(c: BoardCommand): void {
        const m = this.draft;
        if (!m) return;
        switch (c.cmd) {
            case 'copy': case 'cut': return this.toClipboard(c.cmd, c.items);
            case 'paste': return this.paste(c.items, c.at);
            case 'delete': return this.deleteSelection(c.items);
            case 'give': {
                const i = c.items.find(x => x.kind === 'identity');
                if (i) this.openGrant(i.type === 'group' ? {kind: 'group', attr: i.attr} : {kind: 'identity', id: i.id}, null);
                return;
            }
            case 'advise': return this.adviseFor(c.items[0]);
            case 'open': return this.openItem(c.items[0]);
            case 'select': {
                const g = c.items.find(x => x.type === 'group');
                const n = g && this.board.nodes.find(x => x.key === g.node);
                if (n && this.boardCmp) { this.boardCmp.selected = new Set(n.shown.map(x => `m|${n.key}|${x.id}`)); this.boardCmp.closeMenu(); }
                return;
            }
            case 'undo': {
                const last = this.pending[this.pending.length - 1];
                if (last) { this.discard(last.id); this.toast('info', 'Pending change removed', last.title); }
                return;
            }
            case 'arrange': return this.autoArrange();
            case 'newGroup': if (!this.readOnly) this.newGroup = {kind: 'identity', attr: '', at: c.at}; return;
            case 'expand': {
                this.expanded.has(c.node) ? this.expanded.delete(c.node) : this.expanded.add(c.node);
                return this.refresh();
            }
        }
    }

    // ------------------------------------------------------------------ clipboard
    private clipItems(items: SelItem[]): ClipItem[] {
        const m = this.draft!;
        const out: ClipItem[] = [];
        const add = (kind: AcKind, id: string, fromAttr?: string) => {
            const e = entitiesOf(m, kind).find(x => x.id === id);
            if (e && !out.some(o => o.kind === kind && o.id === id && o.fromAttr === fromAttr)) out.push({kind, id, name: e.name, attrs: [...e.attrs], fromAttr});
        };
        for (const it of items) {
            if (it.type === 'member') add(it.kind!, it.id!, it.attr);
            else if (it.type === 'free') add(it.kind!, it.id!);
            else if (it.type === 'group') {
                const n = this.board.nodes.find(x => x.key === it.node);
                n?.members.forEach(x => add(it.kind!, x.id, it.attr));
            }
        }
        return out;
    }

    private toClipboard(mode: 'copy' | 'cut', items: SelItem[]): void {
        if (mode === 'cut' && this.readOnly) return;
        const ci = this.clipItems(items);
        if (!ci.length) { this.toast('info', 'Nothing to ' + mode, 'Select identities, services or routers (or a group) first.'); return; }
        this.clip = {mode, items: ci};
        this.toast('info', `${mode === 'cut' ? 'Cut' : 'Copied'} ${ci.length === 1 ? ci[0].name : ci.length + ' items'}`,
            'Paste into a group, onto another card (same access), or on empty canvas (a new copy).');
    }

    private paste(targets: SelItem[], at: { x: number; y: number }): void {
        const m = this.draft;
        if (!m || this.readOnly) return;
        if (!this.clip) { this.toast('info', 'Clipboard is empty', 'Copy (⌘C) or cut (⌘X) something first.'); return; }
        const groupsSel = targets.filter(t => t.type === 'group');
        const entities = targets.filter(t => t.type === 'member' || t.type === 'free');
        let res: IntentResult;
        if (groupsSel.length) {
            const ops: AcOp[] = [];
            let first: IntentResult | null = null;
            for (const g of groupsSel) {
                const r = pasteIntoGroup(m, this.clip, g.kind!, g.attr!);
                if ('error' in r) { first = first || r; continue; }
                first = first && !('error' in first) ? first : r;
                ops.push(...r.ops);
            }
            res = ops.length && first && !('error' in first) ? {...first, ops} : (first || {error: 'Nothing to paste.'});
        } else if (entities.length) {
            res = pasteOntoEntities(m, this.clip, entities.map(e => ({kind: e.kind!, id: e.id!})));
        } else {
            const r = pasteAsNew(m, this.clip, this.newId);
            if (!('error' in r)) {
                // New items without attributes would float freely: put them where the user pasted.
                let dy = 0;
                for (const c of r.created || []) {
                    const op = r.ops.find(o => (o.op === 'createIdentity' && o.identity.id === c.id) || (o.op === 'createService' && o.service.id === c.id));
                    const attrs = op?.op === 'createIdentity' ? op.identity.attrs : op?.op === 'createService' ? op.service.attrs : [];
                    if (!attrs.length) { this.layoutDraft.nodes[freeKey(c.kind, c.id)] = {x: Math.round(at.x), y: Math.round(at.y + dy)}; dy += 50; }
                }
            }
            res = r;
        }
        if (this.queueIntent(res) && this.clip.mode === 'cut') this.clip = null;
        this.layoutStore.save(this.layoutDraft);   // positions of pasted free cards
    }

    private deleteSelection(items: SelItem[]): void {
        const m = this.draft;
        if (!m || this.readOnly) return;
        const members = items.filter(i => i.type === 'member').map(i => ({kind: i.kind!, id: i.id!, name: i.name || '', attr: i.attr!}));
        if (members.length) { this.queueIntent(removeFromGroups(m, members)); return; }
        const emptyNew = items.filter(i => i.type === 'group' && (this.layoutDraft.groups || []).includes(`${i.kind}:${i.attr}`)
            && !this.board.nodes.find(n => n.key === i.node)?.members.length);
        if (emptyNew.length) {
            this.layoutDraft.groups = (this.layoutDraft.groups || []).filter(g => !emptyNew.some(i => g === `${i.kind}:${i.attr}`));
            emptyNew.forEach(i => delete this.layoutDraft.nodes[i.node]);
            this.saveLayout();
            return;
        }
        this.toast('info', 'Nothing removed', 'Delete takes selected cards out of their group. A group disappears when nothing uses it; identities and services are never deleted here.');
    }

    // ------------------------------------------------------------------ new group
    createGroup(): void {
        const g = this.newGroup;
        if (!g) return;
        const attr = g.attr.trim().replace(/^#/, '');
        if (!attr || /\s/.test(attr)) { this.toast('warning', 'Invalid name', 'Use a single word without spaces, such as sales or web-servers.'); return; }
        const id = `${g.kind}:${attr}`;
        if (this.board.nodes.some(n => n.key === groupKey(g.kind, attr)) || (this.layoutDraft.groups || []).includes(id)) {
            this.toast('info', 'Already exists', `#${attr} is already on the canvas.`);
        } else {
            this.layoutDraft.groups = [...(this.layoutDraft.groups || []), id];
            this.layoutDraft.nodes[groupKey(g.kind, attr)] = {x: Math.round(g.at.x), y: Math.round(g.at.y)};
            this.saveLayout();
        }
        this.newGroup = null;
    }

    // ------------------------------------------------------------------ advisor / navigation
    private adviseFor(it?: SelItem): void {
        if (!it || !it.id) return;
        if (it.kind === 'identity') this.advisorI = it.id;
        else if (it.kind === 'service') this.advisorS = it.id;
        else return;
        this.runAdvisor();
        this.drawer = 'advisor';
    }

    private openItem(it?: SelItem): void {
        if (!it) return;
        if (it.id && it.id.startsWith('new-')) { this.toast('info', 'Not created yet', 'Apply pending changes first.'); return; }
        if (it.type === 'hub') {
            const fam = it.node.split(':')[1];
            if (it.policy?.startsWith('new-')) { this.toast('info', 'Not created yet', 'Apply pending changes first.'); return; }
            this.router.navigate([fam === 'erp' ? '/router-policies' : fam === 'serp' ? '/service-router-policies' : '/service-policies', it.policy]);
        } else if (it.id) {
            this.router.navigate([it.kind === 'service' ? '/services' : it.kind === 'router' ? '/routers' : '/identities', it.id]);
        }
    }

    // ------------------------------------------------------------------ template helpers
    plural(n: number, one: string, many: string): string { return `${n} ${n === 1 ? one : many}`; }
    toggleConcept(c: string): void { this.shownConcepts.has(c) ? this.shownConcepts.delete(c) : this.shownConcepts.add(c); }
    go(route: string): void { this.router.navigate([route]); }
    get pendingCalls(): number { return this.pending.reduce((n, c) => n + c.ops.length, 0); }
    get clipLabel(): string {
        const c = this.clip;
        return c ? `${c.mode === 'cut' ? 'Cut' : 'Copied'}: ${c.items.length === 1 ? c.items[0].name : c.items.length + ' items'}` : '';
    }

    // ------------------------------------------------------------------ grant dialog
    openGrant(src: AcEndpoint, tgt: AcEndpoint | null): void {
        if (this.readOnly) return;
        this.dialog = {src, tgt, selected: 0};
        this.computeGrant();
    }
    closeGrant(): void { this.dialog = null; }

    get targetChoices(): { value: string; label: string; group: string }[] {
        if (!this.draft) return [];
        return [
            ...groups(this.draft.services).filter(([a]) => a).map(([a]) => ({value: JSON.stringify({kind: 'group', attr: a}), label: '#' + a, group: 'Service groups'})),
            ...this.draft.services.map(s => ({value: JSON.stringify({kind: 'service', id: s.id}), label: s.name, group: 'Services'})),
        ];
    }
    onTargetChange(): void {
        if (!this.dialog || !this.dialogTarget) return;
        this.dialog.tgt = JSON.parse(this.dialogTarget);
        this.computeGrant();
    }
    private computeGrant(): void {
        if (!this.dialog || !this.draft) return;
        const d = this.dialog;
        this.dialogTarget = d.tgt ? JSON.stringify(d.tgt) : '';
        d.result = d.tgt ? buildOptions(this.draft, d.src, d.tgt, this.newId) : undefined;
        d.selected = d.result ? Math.max(0, d.result.opts.findIndex(o => o.recommended)) : 0;
    }
    get dialogSourceLabel(): string {
        const d = this.dialog;
        if (!d || !this.draft) return '';
        return d.src.kind === 'group' ? '#' + d.src.attr : (this.draft.identities.find(i => i.id === d.src.id)?.name || '');
    }
    impactText(o: { impact: { pairs: number; identities: number; services: number } }): string {
        const i = o.impact;
        return i.pairs ? `Grants ${this.plural(i.identities, 'identity', 'identities')} access to ${this.plural(i.services, 'service', 'services')} (${this.plural(i.pairs, 'new pair', 'new pairs')}).` : 'No new access.';
    }
    queueSelected(): void {
        const d = this.dialog;
        if (!d?.result) return;
        const o = d.result.opts[d.selected];
        if (!o) return;
        const r = d.result, i = o.impact;
        this.queue(o.title,
            `${r.srcLabel} → ${r.tgtLabel}. ${i.pairs ? `${this.plural(i.identities, 'identity', 'identities')}, ${this.plural(i.services, 'service', 'services')}` : 'no new access'}${i.outside.length ? `; also ${i.outside.join(', ')}` : ''}${i.noRoute ? `; ${i.noRoute} without routers` : ''}.`,
            o.ops);
        this.dialog = null;
    }

    // ------------------------------------------------------------------ pending changes
    /** Queues an intent from the board; returns false (with a message) when it can't be done. */
    private queueIntent(r: IntentResult): boolean {
        if ('error' in r) { this.toast('warning', 'Not changed', r.error); return false; }
        this.queue(r.title, r.summary, r.ops);
        return true;
    }

    private queue(title: string, summary: string, ops: AcOp[], next?: string[]): void {
        if (!this.draft) return;
        const set: Pending = {id: 'c' + this.seq++, title, summary, ops, calls: describeCalls(this.draft, ops), next};
        this.pending.push(set);
        this.refresh();
        this.pulse = false;
        clearTimeout(this.pulseTimer);
        requestAnimationFrame(() => { this.pulse = true; this.cdr.markForCheck(); });
        this.pulseTimer = setTimeout(() => { this.pulse = false; this.cdr.markForCheck(); }, 1600);
    }

    // ------------------------------------------------------------------ set-up wizard
    /** For the wizard: temporary ids from the page's own counter, so they never collide with other pending ones. */
    readonly wizardId = () => this.newId();

    openWizard(): void { if (!this.readOnly && this.draft) this.wizardOpen = true; }

    onWizardQueued(p: WizardPlan): void {
        this.wizardOpen = false;
        this.queue(p.title, p.summary, p.ops, p.next);
        this.drawer = 'pending';
    }
    dismissFollowUp(i: number): void { this.followUps.splice(i, 1); }

    discard(id: string): void {
        this.pending = this.pending.filter(c => c.id !== id);
        this.refresh();
    }
    discardAll(): void {
        this.pending = [];
        this.refresh();
    }

    async applyAll(): Promise<void> {
        if (!this.committed || !this.pending.length || this.readOnly || this.busy) return;
        this.busy = true;
        const sets = [...this.pending];
        const idMap = new Map<string, string>();
        let done = 0;
        try {
            for (const c of sets) {
                // Re-read between sets so each one patches the latest attributes and roles.
                if (done) this.committed = await this.svc.load();
                try {
                    const reverts = await this.svc.apply(this.committed!, c.ops, idMap);
                    this.history.push({title: c.title, reverts});
                    if (c.next?.length) this.followUps.push({title: c.title, steps: c.next});
                    this.pending = this.pending.filter(p => p.id !== c.id);
                    done++;
                } catch (err: any) {
                    await this.svc.revert(err?.reverts || []).catch(() => undefined);
                    this.toast('error', 'Change not applied', `${c.title}: ${this.svc.errorText(err)}. Nothing from this change set was kept.`);
                    break;
                }
            }
            // Positions of new items were stored under temporary ids: move them to the real ones.
            if (idMap.size) {
                this.layoutDraft = remapLayout(this.layoutDraft, idMap);
                this.layoutStore.save(this.layoutDraft);
            }
            if (done) this.toast('success', 'Applied', `${this.plural(done, 'change set', 'change sets')} sent to the controller.`);
            if (done && this.followUps.length) this.drawer = 'pending';
        } finally {
            this.busy = false;
            await this.reload();
        }
    }

    async undoLast(): Promise<void> {
        const last = this.history[this.history.length - 1];
        if (!last || this.busy) return;
        this.busy = true;
        try {
            await this.svc.revert(last.reverts);
            this.history.pop();
            this.toast('success', 'Undone', last.title);
        } catch (err) {
            this.toast('error', 'Undo failed', this.svc.errorText(err));
        } finally {
            this.busy = false;
            await this.reload();
        }
    }

    // ------------------------------------------------------------------ advisor
    runAdvisor(): void {
        const m = this.draft;
        if (!m) return;
        const cl = clients(m);
        if (!cl.some(i => i.id === this.advisorI)) this.advisorI = cl[0]?.id || '';
        if (!m.services.some(s => s.id === this.advisorS)) this.advisorS = m.services[0]?.id || '';
        const i = m.identities.find(x => x.id === this.advisorI), s = m.services.find(x => x.id === this.advisorS);
        if (!i || !s) { this.advice = []; this.adviceFail = null; return; }
        this.advice = advise(m, i, s);
        this.adviceFail = this.advice.find(x => x.st === 'bad') || null;
        this.advicePosture = this.advice.some(x => x.st === 'info');
    }
    get advisorIdentity() { return this.draft?.identities.find(i => i.id === this.advisorI); }
    get advisorService() { return this.draft?.services.find(s => s.id === this.advisorS); }
    openIdentity(): void { if (this.advisorI && !this.advisorI.startsWith('new-')) this.router.navigate(['/identities', this.advisorI]); }

    // ------------------------------------------------------------------ misc
    private toast(level: string, title: string, content: string): void {
        this.growler.show(new GrowlerModel(level, title, 'Access Canvas', content));
    }

    get accessPairs(): number { return this.draft ? accessSet(this.draft).size : 0; }
}
