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

import {AcLayout} from './access-canvas.logic';

/**
 * Where the canvas layout (card positions and empty groups) is kept. Layout is presentation
 * only and never changes access, so it isn't sent to the controller.
 */
export interface LayoutStore {
    load(): AcLayout | null;
    save(layout: AcLayout): void;
}

/** Marks an exported layout file, so an unrelated JSON file isn't imported by mistake. */
export const LAYOUT_FILE_KIND = 'ziti-access-canvas-layout';

const KEY_PREFIX = 'ziti.access-canvas.layout.';

/** One layout per controller, since the console can sign in to different controllers. */
export function layoutStorageKey(controller: string): string {
    return KEY_PREFIX + (controller || 'default').trim().replace(/\/+$/, '').toLowerCase();
}

/** A layout from untrusted JSON (storage or an imported file), or null when it isn't one. */
export function parseLayout(data: unknown): AcLayout | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as any;
    if (d.kind !== undefined && d.kind !== LAYOUT_FILE_KIND) return null;
    if (!d.nodes || typeof d.nodes !== 'object' || Array.isArray(d.nodes)) return null;
    const nodes: AcLayout['nodes'] = {};
    for (const [k, v] of Object.entries(d.nodes)) {
        const p = v as any;
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) nodes[k] = {x: Math.round(p.x), y: Math.round(p.y)};
    }
    const groups = Array.isArray(d.groups) ? d.groups.filter((g: unknown) => typeof g === 'string') : [];
    return {v: 1, nodes, groups};
}

/** The contents of an exported layout file. */
export function layoutFile(layout: AcLayout, controller: string): object {
    return {kind: LAYOUT_FILE_KIND, v: 1, controller, exportedAt: new Date().toISOString(), nodes: layout.nodes, groups: layout.groups || []};
}

/** Keeps the layout in the browser's localStorage. It can be unavailable (private windows, blocked storage): then nothing is kept. */
export class BrowserLayoutStore implements LayoutStore {
    constructor(private key: string, private storage: Storage | null = BrowserLayoutStore.local()) {}

    private static local(): Storage | null {
        try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
    }

    load(): AcLayout | null {
        try {
            const raw = this.storage?.getItem(this.key);
            return raw ? parseLayout(JSON.parse(raw)) : null;
        } catch {
            return null;
        }
    }

    save(layout: AcLayout): void {
        try {
            if (!Object.keys(layout.nodes).length && !(layout.groups || []).length) this.storage?.removeItem(this.key);
            else this.storage?.setItem(this.key, JSON.stringify({v: 1, nodes: layout.nodes, groups: layout.groups || []}));
        } catch (err) {
            console.warn('[access-canvas] could not keep the layout in this browser', err);
        }
    }
}
