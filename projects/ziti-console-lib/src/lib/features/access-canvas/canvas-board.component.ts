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

import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, NgZone,
    OnChanges, OnDestroy, Output, ViewChild, ViewEncapsulation,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AcKind} from './access-canvas.logic';
import {Board, BoardEdge, BoardMember, BoardNode, GEO, boardBounds, edgePath} from './canvas-board.logic';

/** One selected thing, resolved for the page: a box, a free card, a policy pill or a card in a group. */
export interface SelItem {
    type: 'group' | 'free' | 'hub' | 'member';
    node: string;
    kind?: AcKind; id?: string; name?: string; attr?: string; policy?: string;
}
export type DropTarget =
    | { type: 'group'; node: string; kind: AcKind; attr: string }
    | { type: 'member'; node: string; kind: AcKind; id: string; attr: string }
    | { type: 'free'; node: string; kind: AcKind; id: string }
    | { type: 'empty'; at: { x: number; y: number } };
export interface MemberDrop { item: SelItem; target: DropTarget; copy: boolean; }
export interface NodeDrop { item: SelItem; target: DropTarget; }
export type BoardCommand =
    | { cmd: 'copy' | 'cut' | 'delete' | 'give' | 'advise' | 'open' | 'select'; items: SelItem[] }
    | { cmd: 'paste'; items: SelItem[]; at: { x: number; y: number } }
    | { cmd: 'undo' | 'arrange' }
    | { cmd: 'newGroup'; at: { x: number; y: number } }
    | { cmd: 'expand'; node: string };

interface PathVm { id: string; d: string; cls: string; }
interface Menu { x: number; y: number; at: { x: number; y: number }; items: SelItem[]; }

type Gesture =
    | { kind: 'pan'; sx: number; sy: number; tx: number; ty: number; moved: boolean }
    | { kind: 'marquee'; sx: number; sy: number; x0: number; y0: number; moved: boolean; add: boolean }
    | { kind: 'nodes'; sx: number; sy: number; start: Map<string, { x: number; y: number }>; primary: string; moved: boolean }
    | { kind: 'member'; sx: number; sy: number; item: SelItem; moved: boolean; copy: boolean };

const memberKey = (node: string, id: string) => `m|${node}|${id}`;

@Component({
    selector: 'lib-canvas-board',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './canvas-board.component.html',
    styleUrls: ['./canvas-board.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        'tabindex': '0', 'role': 'application',
        'aria-label': 'Access canvas. Scroll or pinch to zoom, plus and minus keys to zoom, 0 to fit. Drag boxes to arrange them, drag cards between groups, Cmd or Ctrl with C, X and V to copy, cut and paste access, Delete to remove from a group, right-click for more.',
    },
})
export class CanvasBoardComponent implements OnChanges, OnDestroy {
    @Input() board: Board = {nodes: [], edges: []};
    @Input() readOnly = false;
    @Input() hasClip = false;

    @Output() moved = new EventEmitter<{ key: string; x: number; y: number }[]>();
    @Output() memberDrop = new EventEmitter<MemberDrop>();
    @Output() nodeDrop = new EventEmitter<NodeDrop>();
    @Output() command = new EventEmitter<BoardCommand>();

    @ViewChild('viewport', {static: true}) viewportRef!: ElementRef<HTMLElement>;

    readonly geo = GEO;
    tx = 40; ty = 40; z = 1;
    selected = new Set<string>();
    hot = new Set<string>();       // highlighted node keys while hovering
    hotEdges = new Set<string>();
    paths: PathVm[] = [];
    marquee: { x: number; y: number; w: number; h: number } | null = null;
    ghost: { x: number; y: number; label: string; copy: boolean } | null = null;
    dropKey = '';
    menu: Menu | null = null;

    private nodeMap = new Map<string, BoardNode>();
    private gesture: Gesture | null = null;
    private raf = 0;
    private lastWorld = {x: 0, y: 0};
    private fitted = false;

    constructor(private zone: NgZone, private cdr: ChangeDetectorRef, private host: ElementRef<HTMLElement>) {}

    ngOnChanges(): void {
        this.nodeMap = new Map(this.board.nodes.map(n => [n.key, n]));
        // Selection survives refreshes as long as the things still exist.
        for (const k of [...this.selected]) {
            const [, node, id] = k.startsWith('m|') ? k.split('|') : ['', k, ''];
            const n = this.nodeMap.get(node);
            if (!n || (id && !n.shown.some(x => x.id === id))) this.selected.delete(k);
        }
        this.rebuildPaths();
        if (!this.fitted && this.board.nodes.length) {
            this.fitted = true;
            requestAnimationFrame(() => { this.fit(); this.cdr.markForCheck(); });
        }
    }

    ngOnDestroy(): void { cancelAnimationFrame(this.raf); }

    // ------------------------------------------------------------------ rendering helpers
    trackNode = (_: number, n: BoardNode) => n.key;
    trackMember = (_: number, m: BoardMember) => m.id;
    trackPath = (_: number, p: PathVm) => p.id;
    mk(node: string, id: string): string { return memberKey(node, id); }
    kindLetter(k?: AcKind): string { return k === 'service' ? 'S' : k === 'router' ? 'R' : 'I'; }
    famLabel(n: BoardNode): string { return {dial: 'Dial', bind: 'Bind', erp: 'Routers', serp: 'Svc routers'}[n.policy!.family]; }

    private rebuildPaths(): void {
        this.paths = this.board.edges.map(e => ({id: e.id, d: edgePath(this.nodeMap, e), cls: this.edgeCls(e)})).filter(p => p.d);
    }
    private edgeCls(e: BoardEdge): string {
        return ['ab-edge', e.family, e.pending ? 'pending' : '', e.byName ? 'byname' : '', this.hotEdges.has(e.id) ? 'hot' : ''].join(' ');
    }
    private schedule(): void {
        if (this.raf) return;
        this.raf = requestAnimationFrame(() => { this.raf = 0; this.cdr.detectChanges(); });
    }

    get worldTransform(): string { return `translate(${this.tx}px, ${this.ty}px) scale(${this.z})`; }
    get zoomPct(): number { return Math.round(this.z * 100); }

    // ------------------------------------------------------------------ coordinates
    private toWorld(cx: number, cy: number): { x: number; y: number } {
        const r = this.viewportRef.nativeElement.getBoundingClientRect();
        return {x: (cx - r.left - this.tx) / this.z, y: (cy - r.top - this.ty) / this.z};
    }

    zoomBy(f: number, cx?: number, cy?: number): void {
        const r = this.viewportRef.nativeElement.getBoundingClientRect();
        const px = cx ?? r.left + r.width / 2, py = cy ?? r.top + r.height / 2;
        const w = this.toWorld(px, py);
        this.z = Math.min(2.5, Math.max(0.15, this.z * f));
        this.tx = px - r.left - w.x * this.z;
        this.ty = py - r.top - w.y * this.z;
        this.cdr.markForCheck();
    }

    fit(): void {
        const b = boardBounds(this.board.nodes);
        const r = this.viewportRef.nativeElement.getBoundingClientRect();
        if (!b.w || !r.width) return;
        this.z = Math.min(1.2, Math.max(0.15, Math.min((r.width - 60) / b.w, (r.height - 60) / b.h)));
        this.tx = (r.width - b.w * this.z) / 2 - b.x * this.z;
        this.ty = (r.height - b.h * this.z) / 2 - b.y * this.z;
        this.cdr.markForCheck();
    }

    /** Scrolls so a node is in view (used by search). */
    reveal(key: string): void {
        const n = this.nodeMap.get(key);
        const r = this.viewportRef.nativeElement.getBoundingClientRect();
        if (!n) return;
        this.tx = r.width / 2 - (n.x + n.w / 2) * this.z;
        this.ty = r.height / 3 - n.y * this.z;
        this.selected = new Set([key]);
        this.cdr.markForCheck();
    }

    /**
     * Wheel, as in most diagram tools: a mouse wheel zooms at the pointer; a trackpad pans with
     * two fingers and zooms with a pinch (browsers report pinch as Ctrl+wheel). Cmd/Ctrl+wheel
     * always zooms, Shift+wheel pans sideways.
     */
    onWheel(ev: WheelEvent): void {
        ev.preventDefault();
        const unit = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1;
        const dx = ev.deltaX * unit, dy = ev.deltaY * unit;
        if (ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
            this.tx -= dx || dy;
            this.cdr.markForCheck();
        } else if (ev.ctrlKey || ev.metaKey) {
            // Pinch sends many small deltas; a Ctrl+mouse wheel sends a few large ones.
            this.zoomBy(Math.exp(-Math.max(-60, Math.min(60, dy)) * 0.01), ev.clientX, ev.clientY);
        } else if (this.isMouseWheel(ev, dx)) {
            this.zoomBy(Math.exp(-Math.sign(dy) * Math.min(Math.abs(dy), 120) * 0.0018), ev.clientX, ev.clientY);
        } else {
            this.tx -= dx; this.ty -= dy;
            this.cdr.markForCheck();
        }
    }

    /** A notched mouse wheel scrolls in lines, or in steps of 120 (legacy wheelDelta), with no sideways part. */
    private isMouseWheel(ev: WheelEvent, dx: number): boolean {
        if (ev.deltaMode !== 0) return true;
        const legacy = (ev as any).wheelDeltaY as number | undefined;
        return !dx && !!legacy && legacy % 120 === 0 && Math.abs(ev.deltaY) >= 50;
    }

    // ------------------------------------------------------------------ selection
    private resolve(key: string): SelItem | null {
        if (key.startsWith('m|')) {
            const [, node, id] = key.split('|');
            const n = this.nodeMap.get(node), m = n?.members.find(x => x.id === id);
            return n && m ? {type: 'member', node, kind: n.kind, id, name: m.name, attr: n.attr} : null;
        }
        const n = this.nodeMap.get(key);
        if (!n) return null;
        if (n.type === 'group') return {type: 'group', node: key, kind: n.kind, attr: n.attr, name: '#' + n.attr};
        if (n.type === 'free') return {type: 'free', node: key, kind: n.kind, id: n.entity!.id, name: n.entity!.name};
        return {type: 'hub', node: key, policy: n.policy!.id, name: n.policy!.name};
    }
    selection(): SelItem[] { return [...this.selected].map(k => this.resolve(k)).filter(Boolean) as SelItem[]; }

    private pick(key: string, ev: PointerEvent | MouseEvent): void {
        const multi = ev.shiftKey || ev.metaKey || ev.ctrlKey;
        if (multi) this.selected.has(key) ? this.selected.delete(key) : this.selected.add(key);
        else if (!this.selected.has(key)) this.selected = new Set([key]);
    }

    selectAll(): void { this.selected = new Set(this.board.nodes.map(n => n.key)); this.cdr.markForCheck(); }

    // ------------------------------------------------------------------ hover highlight
    hover(key: string | null): void {
        if (this.gesture) return;
        this.hot.clear(); this.hotEdges.clear();
        if (key) {
            const hubs = new Set<string>();
            for (const e of this.board.edges) if (e.from.node === key || e.to.node === key) hubs.add(e.from.node.startsWith('p:') ? e.from.node : e.to.node);
            if (key.startsWith('p:')) hubs.add(key);
            for (const e of this.board.edges) if (hubs.has(e.from.node) || hubs.has(e.to.node)) {
                this.hotEdges.add(e.id); this.hot.add(e.from.node); this.hot.add(e.to.node);
            }
        }
        this.rebuildPaths();
        this.cdr.markForCheck();
    }

    // ------------------------------------------------------------------ pointer gestures
    onBgDown(ev: PointerEvent): void {
        if (ev.button !== 0) return;
        this.menu = null;
        this.host.nativeElement.focus({preventScroll: true});
        const w = this.toWorld(ev.clientX, ev.clientY);
        this.gesture = ev.shiftKey
            ? {kind: 'marquee', sx: ev.clientX, sy: ev.clientY, x0: w.x, y0: w.y, moved: false, add: true}
            : {kind: 'pan', sx: ev.clientX, sy: ev.clientY, tx: this.tx, ty: this.ty, moved: false};
        this.capture(ev);
    }

    onNodeDown(ev: PointerEvent, n: BoardNode): void {
        if (ev.button !== 0) return;
        ev.stopPropagation();
        this.menu = null;
        this.host.nativeElement.focus({preventScroll: true});
        this.pick(n.key, ev);
        // Moving a box moves every selected box; cards in groups stay with their box.
        const keys = [...this.selected].filter(k => !k.startsWith('m|') && this.nodeMap.has(k));
        if (!keys.includes(n.key)) keys.push(n.key);
        const start = new Map(keys.map(k => { const x = this.nodeMap.get(k)!; return [k, {x: x.x, y: x.y}]; }));
        this.gesture = {kind: 'nodes', sx: ev.clientX, sy: ev.clientY, start, primary: n.key, moved: false};
        this.capture(ev);
        this.cdr.markForCheck();
    }

    onMemberDown(ev: PointerEvent, n: BoardNode, m: BoardMember): void {
        if (ev.button !== 0) return;
        ev.stopPropagation();
        this.menu = null;
        this.host.nativeElement.focus({preventScroll: true});
        const key = memberKey(n.key, m.id);
        this.pick(key, ev);
        this.gesture = {kind: 'member', sx: ev.clientX, sy: ev.clientY, item: this.resolve(key)!, moved: false, copy: ev.altKey};
        this.capture(ev);
        this.cdr.markForCheck();
    }

    private capture(ev: PointerEvent): void {
        const el = ev.currentTarget as HTMLElement;
        try { el.setPointerCapture(ev.pointerId); } catch { /* not capturable */ }
        this.zone.runOutsideAngular(() => {
            const move = (e: PointerEvent) => this.onMove(e);
            const up = (e: PointerEvent) => {
                el.removeEventListener('pointermove', move);
                el.removeEventListener('pointerup', up);
                el.removeEventListener('pointercancel', up);
                this.zone.run(() => this.onUp(e));
            };
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
        });
    }

    private onMove(ev: PointerEvent): void {
        const g = this.gesture;
        if (!g) return;
        const dx = ev.clientX - g.sx, dy = ev.clientY - g.sy;
        if (!g.moved && Math.hypot(dx, dy) < 4) return;
        g.moved = true;
        this.lastWorld = this.toWorld(ev.clientX, ev.clientY);
        if (g.kind === 'pan') { this.tx = g.tx + dx; this.ty = g.ty + dy; }
        else if (g.kind === 'marquee') {
            const w = this.lastWorld;
            this.marquee = {x: Math.min(g.x0, w.x), y: Math.min(g.y0, w.y), w: Math.abs(w.x - g.x0), h: Math.abs(w.y - g.y0)};
        } else if (g.kind === 'nodes') {
            if (this.readOnly) return;
            for (const [k, p] of g.start) {
                const n = this.nodeMap.get(k);
                if (n) { n.x = Math.round(p.x + dx / this.z); n.y = Math.round(p.y + dy / this.z); }
            }
            this.rebuildPaths();
            this.dropKey = this.grantTargetKey(ev, g.primary);
        } else if (g.kind === 'member') {
            if (this.readOnly) return;
            g.copy = ev.altKey;
            this.ghost = {x: this.lastWorld.x + 8, y: this.lastWorld.y + 8, label: g.item.name || '', copy: g.copy};
            const t = this.targetAt(ev, new Set());
            this.dropKey = t && t.type !== 'empty' ? (t.type === 'member' ? memberKey(t.node, t.id) : t.node) : '';
        }
        this.schedule();
    }

    private onUp(ev: PointerEvent): void {
        const g = this.gesture;
        this.gesture = null;
        this.ghost = null;
        const dropKey = this.dropKey;
        this.dropKey = '';
        if (!g) return;
        if (g.kind === 'pan' && !g.moved) this.selected.clear();
        if (g.kind === 'marquee' && this.marquee) {
            const m = this.marquee;
            for (const n of this.board.nodes) if (n.x < m.x + m.w && n.x + n.w > m.x && n.y < m.y + m.h && n.y + n.h > m.y) this.selected.add(n.key);
            this.marquee = null;
        }
        if (g.kind === 'nodes' && g.moved && !this.readOnly) {
            const item = this.resolve(g.primary);
            const target = dropKey ? this.targetAt(ev, new Set(g.start.keys())) : null;
            const joins = item?.type === 'free' && target && target.type !== 'empty' && target.type !== 'free' && target.kind === item.kind;
            if (item && target && joins) {
                // A loose card dropped on a group of its kind joins that group (it gains the attribute).
                for (const [k, p] of g.start) { const n = this.nodeMap.get(k); if (n) { n.x = p.x; n.y = p.y; } }
                this.rebuildPaths();
                this.memberDrop.emit({item, target, copy: false});
            } else if (item && target && target.type !== 'empty' && item.kind === 'identity' && target.kind === 'service') {
                // Dropped onto a service: that's "give access", so the box goes back where it was.
                for (const [k, p] of g.start) { const n = this.nodeMap.get(k); if (n) { n.x = p.x; n.y = p.y; } }
                this.rebuildPaths();
                this.nodeDrop.emit({item, target});
            } else {
                this.moved.emit([...g.start.keys()].map(k => { const n = this.nodeMap.get(k)!; return {key: k, x: n.x, y: n.y}; }));
            }
        }
        if (g.kind === 'member' && g.moved && !this.readOnly) {
            const target = this.targetAt(ev, new Set());
            if (target && !(target.type === 'group' && target.node === g.item.node)) {
                this.memberDrop.emit({item: g.item, target, copy: g.copy || ev.altKey});
            }
        }
        this.cdr.markForCheck();
    }

    /** What is under the pointer, ignoring the boxes being dragged. */
    private targetAt(ev: PointerEvent | MouseEvent, ignore: Set<string>): DropTarget | null {
        const els = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[];
        for (const el of els) {
            const d = el.closest('[data-drop]') as HTMLElement | null;
            if (!d || !this.host.nativeElement.contains(d)) continue;
            const node = d.dataset['node']!, n = this.nodeMap.get(node);
            if (!n || ignore.has(node)) continue;
            const id = d.dataset['member'];
            if (id && n.type === 'group') return {type: 'member', node, kind: n.kind!, id, attr: n.attr!};
            if (n.type === 'group') return {type: 'group', node, kind: n.kind!, attr: n.attr!};
            if (n.type === 'free') return {type: 'free', node, kind: n.kind!, id: n.entity!.id};
        }
        return els.some(el => el === this.viewportRef.nativeElement || el.classList?.contains('ab-world'))
            ? {type: 'empty', at: this.toWorld(ev.clientX, ev.clientY)} : null;
    }

    /**
     * While dragging a box: what dropping it would act on. An identity box over a service gives
     * access; a loose card over a group of its own kind joins that group.
     */
    private grantTargetKey(ev: PointerEvent, primary: string): string {
        const src = this.nodeMap.get(primary);
        if (!src || src.type === 'hub') return '';
        const t = this.targetAt(ev, new Set([primary]));
        if (!t || t.type === 'empty') return '';
        const grant = src.kind === 'identity' && t.kind === 'service';
        const join = src.type === 'free' && t.type !== 'free' && t.kind === src.kind;
        if (!grant && !join) return '';
        return join ? t.node : t.type === 'member' ? memberKey(t.node, t.id) : t.node;
    }

    // ------------------------------------------------------------------ context menu
    onContext(ev: MouseEvent, key: string | null): void {
        ev.preventDefault();
        ev.stopPropagation();
        if (key && !this.selected.has(key)) this.selected = new Set([key]);
        if (!key) this.selected.clear();
        const r = this.host.nativeElement.getBoundingClientRect();
        this.menu = {x: ev.clientX - r.left, y: ev.clientY - r.top, at: this.toWorld(ev.clientX, ev.clientY), items: this.selection()};
        this.cdr.markForCheck();
    }
    closeMenu(): void { this.menu = null; this.cdr.markForCheck(); }

    menuHas(t: SelItem['type'] | 'entity' | 'identity'): boolean {
        const items = this.menu?.items || [];
        if (t === 'entity') return items.some(i => i.type === 'member' || i.type === 'free');
        if (t === 'identity') return items.some(i => (i.type === 'member' || i.type === 'free' || i.type === 'group') && i.kind === 'identity');
        return items.some(i => i.type === t);
    }
    get menuSingleEntity(): SelItem | null {
        const items = this.menu?.items || [];
        return items.length === 1 && (items[0].type === 'member' || items[0].type === 'free') ? items[0] : null;
    }

    run(cmd: 'copy' | 'cut' | 'delete' | 'give' | 'advise' | 'open' | 'select' | 'paste' | 'arrange' | 'newGroup' | 'fit' | 'expand'): void {
        const m = this.menu;
        this.menu = null;
        const items = m?.items || this.selection();
        if (cmd === 'fit') this.fit();
        else if (cmd === 'paste') this.command.emit({cmd, items, at: m?.at || this.lastWorld});
        else if (cmd === 'arrange') this.command.emit({cmd});
        else if (cmd === 'newGroup') this.command.emit({cmd, at: m?.at || this.lastWorld});
        else if (cmd === 'expand') { const g = items.find(i => i.type === 'group'); if (g) this.command.emit({cmd, node: g.node}); }
        else this.command.emit({cmd, items});
        this.cdr.markForCheck();
    }

    // ------------------------------------------------------------------ keyboard
    @HostListener('keydown', ['$event'])
    onKey(ev: KeyboardEvent): void {
        const t = ev.target as HTMLElement;
        if (t.closest('input, select, textarea')) return;
        const mod = ev.metaKey || ev.ctrlKey;
        const key = ev.key.toLowerCase();
        if (mod && key === 'c') { ev.preventDefault(); this.run('copy'); }
        else if (mod && key === 'x') { ev.preventDefault(); this.run('cut'); }
        else if (mod && key === 'v') { ev.preventDefault(); this.run('paste'); }
        else if (mod && key === 'z') { ev.preventDefault(); this.command.emit({cmd: 'undo'}); }
        else if (mod && key === 'a') { ev.preventDefault(); this.selectAll(); }
        else if (key === 'delete' || key === 'backspace') { ev.preventDefault(); this.run('delete'); }
        else if (key === '+' || key === '=') { ev.preventDefault(); this.zoomBy(1.2); }
        else if (key === '-' || key === '_') { ev.preventDefault(); this.zoomBy(1 / 1.2); }
        else if (key === '0' && !mod) { ev.preventDefault(); this.fit(); }
        else if (key === 'escape') { this.selected.clear(); this.menu = null; this.cdr.markForCheck(); }
        else if (key === 'enter') { const s = this.selection(); if (s.length === 1 && (s[0].type === 'member' || s[0].type === 'free')) this.command.emit({cmd: 'advise', items: s}); }
        else if (key.startsWith('arrow') && !this.readOnly) {
            const keys = [...this.selected].filter(k => !k.startsWith('m|') && this.nodeMap.has(k));
            if (!keys.length) return;
            ev.preventDefault();
            const step = ev.shiftKey ? 50 : 10;
            const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
            const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
            for (const k of keys) { const n = this.nodeMap.get(k)!; n.x += dx; n.y += dy; }
            this.rebuildPaths();
            this.moved.emit(keys.map(k => { const n = this.nodeMap.get(k)!; return {key: k, x: n.x, y: n.y}; }));
        }
    }

    focusMember(n: BoardNode, m: BoardMember): void {
        if (this.gesture) return;
        this.selected = new Set([memberKey(n.key, m.id)]);
        this.cdr.markForCheck();
    }
    focusNode(n: BoardNode): void {
        if (this.gesture || this.selected.has(n.key)) return;
        this.selected = new Set([n.key]);
        this.cdr.markForCheck();
    }
}
