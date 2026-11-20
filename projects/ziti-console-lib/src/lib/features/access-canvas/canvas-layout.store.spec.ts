import {AcLayout} from './access-canvas.logic';
import {BrowserLayoutStore, LAYOUT_FILE_KIND, layoutFile, layoutStorageKey, parseLayout} from './canvas-layout.store';

/** A Storage stand-in, so the tests don't touch the real localStorage. */
function memoryStorage(): Storage {
    const m = new Map<string, string>();
    return {
        get length() { return m.size; },
        clear: () => m.clear(),
        getItem: (k: string) => m.has(k) ? m.get(k)! : null,
        key: (i: number) => [...m.keys()][i] ?? null,
        removeItem: (k: string) => { m.delete(k); },
        setItem: (k: string, v: string) => { m.set(k, String(v)); },
    };
}

describe('canvas-layout.store', () => {
    it('keeps one layout per controller', () => {
        expect(layoutStorageKey('https://Ziti.Example.com:1280/')).toBe(layoutStorageKey('https://ziti.example.com:1280'));
        expect(layoutStorageKey('https://a.example.com')).not.toBe(layoutStorageKey('https://b.example.com'));
        const storage = memoryStorage();
        const a = new BrowserLayoutStore(layoutStorageKey('https://a.example.com'), storage);
        const b = new BrowserLayoutStore(layoutStorageKey('https://b.example.com'), storage);
        a.save({v: 1, nodes: {'g:identity:sales': {x: 10, y: 20}}, groups: ['identity:sales']});
        expect(a.load()).toEqual({v: 1, nodes: {'g:identity:sales': {x: 10, y: 20}}, groups: ['identity:sales']});
        expect(b.load()).toBeNull();
    });

    it('forgets the layout when it goes back to automatic', () => {
        const storage = memoryStorage();
        const s = new BrowserLayoutStore('k', storage);
        s.save({v: 1, nodes: {a: {x: 1, y: 2}}, groups: []});
        s.save({v: 1, nodes: {}, groups: []});
        expect(storage.getItem('k')).toBeNull();
    });

    it('survives storage that is missing, full or holds junk', () => {
        expect(new BrowserLayoutStore('k', null).load()).toBeNull();
        const junk = memoryStorage();
        junk.setItem('k', '{not json');
        expect(new BrowserLayoutStore('k', junk).load()).toBeNull();
        const full = {...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); }} as Storage;
        expect(() => new BrowserLayoutStore('k', full).save({v: 1, nodes: {a: {x: 1, y: 1}}, groups: []})).not.toThrow();
    });

    it('round-trips an exported file and rejects other JSON', () => {
        const layout: AcLayout = {v: 1, nodes: {a: {x: 1.4, y: 2.6}}, groups: ['service:web']};
        const file = JSON.parse(JSON.stringify(layoutFile(layout, 'https://ziti.example.com')));
        expect(file.kind).toBe(LAYOUT_FILE_KIND);
        expect(parseLayout(file)).toEqual({v: 1, nodes: {a: {x: 1, y: 3}}, groups: ['service:web']});
        expect(parseLayout({kind: 'something-else', nodes: {}})).toBeNull();
        expect(parseLayout({nodes: []})).toBeNull();
        expect(parseLayout('text')).toBeNull();
        // Bad positions and groups are dropped, not trusted.
        expect(parseLayout({nodes: {a: {x: 'x', y: 1}, b: {x: 3, y: 4}}, groups: ['ok', 7]}))
            .toEqual({v: 1, nodes: {b: {x: 3, y: 4}}, groups: ['ok']});
    });
});
