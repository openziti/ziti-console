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

import {Component, ElementRef, HostListener, OnInit, ViewChild, inject} from '@angular/core';
import {
    API_BINDINGS,
    CLIENT_AUTH_POLICIES,
    ControllerConfig,
    DeployMode,
    EVENT_SUBSCRIPTIONS,
    LOG_LEVELS,
    ValidationIssue,
    defaultConfig,
    fromYaml,
    toYaml,
    validate,
} from './config-builder.model';
import {
    ConfigKind,
    RouterConfig,
    TUNNEL_MODES,
    TunnelMode,
    defaultRouterConfig,
    detectKind,
    parseConfigText,
    routerFromDocument,
    routerToYaml,
    validateRouter,
} from './router-config.model';

const HELP_SEEN_KEY = 'configBuilderHelpSeen';
const PREVIEW_WIDTH_KEY = 'configBuilderPreviewWidth';
const DEFAULT_PREVIEW_WIDTH = 520;
const MIN_PREVIEW_WIDTH = 320;

/** Fields whose form input carries a `bad('<field>')` binding and an error tag on its label. Keep in sync with the template. */
const TAGGED_FIELDS = new Set<string>([
    'trustDomain', 'identity.cert', 'identity.serverCert', 'identity.key', 'identity.ca', 'db',
    'cluster.dataDir', 'cluster.snapshotInterval', 'cluster.snapshotThreshold', 'cluster.electionTimeout',
    'cluster.heartbeatTimeout', 'ctrl.listener', 'ctrl.advertiseAddress', 'ctrl.connectTimeoutMs',
    'ctrl.maxQueuedConnects', 'network.cycleSeconds', 'network.routeTimeoutSeconds', 'network.createCircuitRetries',
    'network.pendingLinkTimeoutSeconds', 'network.minRouterCost', 'network.routerConnectChurnLimit',
    'network.rerouteFraction', 'network.rerouteCap', 'edge.apiAddress', 'edge.sessionTimeout', 'edge.totpHostname',
    'edge.signingCert', 'edge.signingKey', 'edge.identityEnrollmentDuration', 'edge.routerEnrollmentDuration',
    'edge.accessTokenDuration', 'edge.refreshTokenDuration', 'edge.authRateLimiterMax', 'healthCheckInterval',
    'ctrl.endpointsFile', 'link.bind', 'link.advertise', 'link.outQueueSize', 'edge.address', 'edge.advertise',
    'edge.connectTimeoutMs', 'edge.getSessionTimeout', 'tunnel.resolver', 'tunnel.dnsSvcIpRange', 'tunnel.lanIf',
    'csr.country', 'forwarder.xgressDialQueueLength', 'forwarder.xgressDialWorkerCount',
    'forwarder.linkDialQueueLength', 'forwarder.linkDialWorkerCount', 'metrics.reportInterval',
    'metrics.messageQueueSize', 'health.ctrlPingInterval', 'health.ctrlPingTimeout', 'health.ctrlPingInitialDelay',
    'health.minLinks',
]);

/** Popover text for each section's "?" button: what the section does, then what to watch for. */
const SECTION_HELP: Record<string, { what: string; tip: string }> = {
    identity: {
        what: 'The certificate and key this controller presents, and the CA bundle it uses to verify routers and clients.',
        tip: 'The CA bundle must contain every CA that signed a router or client cert. In HA the server cert also needs a ' +
            'spiffe://<trust domain>/controller/<id> URI SAN.',
    },
    storage: {
        what: 'Where the controller keeps network state. Standalone uses one bolt database file. High availability ' +
            'replicates state across a Raft cluster of controllers.',
        tip: 'Pick this first. Switching modes swaps db for cluster in the file. HA needs an advertise address ' +
            'on the Control Channel.',
    },
    ctrl: {
        what: 'The listener routers dial to reach the controller, and how the controller advertises itself.',
        tip: 'Bind to 0.0.0.0 to accept routers on any interface. The advertise address must be reachable by routers ' +
            'and, in HA, by the other controllers.',
    },
    network: {
        what: 'How the controller builds circuits: route timeouts, retries, reroute behavior and router cost limits.',
        tip: 'The defaults suit most networks. Change them only to fix a specific problem.',
    },
    edge: {
        what: 'Identities, services and policies: the Edge API, enrollment, session tokens and the signing certificate.',
        tip: 'Turn Edge off for a fabric-only controller. The Edge API address is what SDKs and ZAC connect to.',
    },
    web: {
        what: 'The HTTPS listeners that serve the controller APIs. Each listener has bind points and a set of APIs.',
        tip: 'The "ZAC (SPA)" API serves this console. A bind point has an interface to listen on and an address to ' +
            'advertise.',
    },
    events: {
        what: 'Write controller events, such as circuits, routers and metrics, to a file as they happen.',
        tip: 'Subscribe only to what you need. High-volume events can grow a log file quickly.',
    },
    'r-identity': {
        what: 'The certificate and key this router presents, and the CA bundle it uses to verify the controller.',
        tip: 'Enrollment with a JWT creates these files. Point here at the files it produced.',
    },
    'r-ctrl': {
        what: 'The controller endpoints this router dials. Format: tls:host:port.',
        tip: 'List every controller in an HA cluster. The endpoints file lets the router remember controllers it ' +
            'learned about across restarts.',
    },
    'r-link': {
        what: 'How this router connects to other routers. A dialer connects out. A listener accepts connections in.',
        tip: 'Other routers dial the advertise address, so it must be reachable from them. A router behind NAT ' +
            'can dial but not listen.',
    },
    'r-edge': {
        what: 'The edge listener accepts SDK apps and tunnelers. The tunneler intercepts or hosts services on this host.',
        tip: 'Edge advertise is the host:port clients dial. Tunnel mode tproxy intercepts traffic and needs root or ' +
            'CAP_NET_ADMIN. Host mode dials servers. Proxy mode listens on local ports.',
    },
    'r-csr': {
        what: 'The subject and subject alternative names (SANs) the router puts in the certificate request for its ' +
            'edge listener.',
        tip: 'Clients verify the router by DNS name or IP, so list every name and address clients use to reach it.',
    },
    'r-advanced': {
        what: 'Tuning for the forwarder queues and workers, metrics reporting, and health checks.',
        tip: 'Leave a field blank to use the router default. Blank fields are left out of the file.',
    },
};

interface Section {
    id: string;
    label: string;
    blurb: string;
    icon: string;
    /** Heading shown in the rail above the first section of each group; sections of a group stay adjacent. */
    group: string;
}

@Component({
    selector: 'lib-config-builder',
    templateUrl: './config-builder.component.html',
    styleUrls: ['./config-builder.component.scss'],
    standalone: false
})
export class ConfigBuilderComponent implements OnInit {
    pageTitle = 'Config Builder';
    kind: ConfigKind = 'controller';
    cfg: ControllerConfig = defaultConfig();
    rcfg: RouterConfig = defaultRouterConfig();
    verbose = false;
    active = 'identity';
    yaml = '';
    highlighted = '';
    issues: ValidationIssue[] = [];
    showHelp = false;
    /** Id of the section whose help popover is open; it closes on its own when another section is selected. */
    sectionHelpFor = '';
    previewWidth = DEFAULT_PREVIEW_WIDTH;
    /** Until the user drags the splitter the form is capped and the preview takes all the remaining width. */
    previewAuto = true;
    resizing = false;

    fileName = '';
    fileHandle: any = null;
    dirty = false;
    dragOver = false;
    notice = '';
    loadError = '';
    loadWarnings: string[] = [];
    @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
    private readonly host = inject(ElementRef);

    readonly bindings = API_BINDINGS;
    readonly subscriptions = EVENT_SUBSCRIPTIONS;
    readonly logLevels = LOG_LEVELS;

    readonly tunnelModes = TUNNEL_MODES;
    readonly clientAuthPolicies = CLIENT_AUTH_POLICIES;

    readonly routerSections: Section[] = [
        {id: 'r-identity', label: 'Identity & PKI', blurb: 'Who this router is and which certs it trusts.', icon: 'icon-lock', group: 'Core'},
        {id: 'r-ctrl', label: 'Controllers', blurb: 'Where this router dials in.', icon: 'icon-controllers', group: 'Core'},
        {id: 'r-link', label: 'Links', blurb: 'How routers connect to each other.', icon: 'icon-networks', group: 'Fabric'},
        {id: 'r-edge', label: 'Edge & Tunnel', blurb: 'What SDKs and tunnelers connect to.', icon: 'icon-identity', group: 'Edge'},
        {id: 'r-csr', label: 'Certificate Request', blurb: 'Subject and SANs for edge certs.', icon: 'icon-lock', group: 'Edge'},
        {id: 'r-advanced', label: 'Advanced', blurb: 'Forwarder, metrics and health checks.', icon: 'icon-AdvancedOptions', group: 'Tuning'},
    ];

    get sections(): Section[] {
        return this.kind === 'router' ? this.routerSections : this.controllerSections;
    }

    get kindLabel(): string {
        return this.kind === 'router' ? 'Router' : 'Controller';
    }

    get defaultFileName(): string {
        return this.kind === 'router' ? 'router.yml' : 'ctrl.yml';
    }

    readonly controllerSections: Section[] = [
        {id: 'identity', label: 'Identity & PKI', blurb: 'Who this controller is and which certs it trusts.', icon: 'icon-lock', group: 'Core'},
        {id: 'storage', label: 'Storage & HA', blurb: 'A single bolt file, or a Raft cluster.', icon: 'icon-ha', group: 'Core'},
        {id: 'ctrl', label: 'Control Channel', blurb: 'Where routers dial in.', icon: 'icon-controllers', group: 'Fabric'},
        {id: 'network', label: 'Network', blurb: 'Routing, timeouts and smart reroute.', icon: 'icon-networks', group: 'Fabric'},
        {id: 'edge', label: 'Edge', blurb: 'API, enrollment, tokens, rate limits.', icon: 'icon-identity', group: 'Edge API'},
        {id: 'web', label: 'Web Listeners', blurb: 'Bind points and the APIs they serve.', icon: 'icon-Icon_Globe', group: 'Edge API'},
        {id: 'events', label: 'Events', blurb: 'Stream controller events to files.', icon: 'icon-Events', group: 'Operations'},
    ];

    ngOnInit(): void {
        this.refresh(false);
        const saved = Number(localStorage.getItem(PREVIEW_WIDTH_KEY));
        if (saved) {
            this.previewAuto = false;
            this.setPreviewWidth(saved);
        }
        // first visit: show the "this is only an editor" note once
        if (localStorage.getItem(HELP_SEEN_KEY) !== 'yes') {
            this.showHelp = true;
        }
    }

    // ---- preview resize ----

    private resizeStartX = 0;
    private resizeStartWidth = 0;

    startResize(event: PointerEvent) {
        this.leaveAutoWidth();
        this.resizing = true;
        this.resizeStartX = event.clientX;
        this.resizeStartWidth = this.previewWidth;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        event.preventDefault();
    }

    onResize(event: PointerEvent) {
        if (!this.resizing) {
            return;
        }
        // the preview sits on the right, so dragging left makes it wider
        this.setPreviewWidth(this.resizeStartWidth - (event.clientX - this.resizeStartX));
    }

    endResize(event: PointerEvent) {
        if (!this.resizing) {
            return;
        }
        this.resizing = false;
        (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
        localStorage.setItem(PREVIEW_WIDTH_KEY, String(this.previewWidth));
    }

    onSplitterKey(event: KeyboardEvent) {
        const step = event.shiftKey ? 80 : 24;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            this.leaveAutoWidth();
        }
        if (event.key === 'ArrowLeft') {
            this.setPreviewWidth(this.previewWidth + step);
        } else if (event.key === 'ArrowRight') {
            this.setPreviewWidth(this.previewWidth - step);
        } else {
            return;
        }
        event.preventDefault();
        localStorage.setItem(PREVIEW_WIDTH_KEY, String(this.previewWidth));
    }

    resetPreviewWidth() {
        this.previewAuto = true;
        this.previewWidth = DEFAULT_PREVIEW_WIDTH;
        localStorage.removeItem(PREVIEW_WIDTH_KEY);
    }

    /** The first manual resize pins the preview at the width it has now, so it does not jump. */
    private leaveAutoWidth() {
        if (!this.previewAuto) {
            return;
        }
        const el: HTMLElement | null = this.host.nativeElement.querySelector('.cb-preview');
        this.previewAuto = false;
        this.setPreviewWidth(el ? el.getBoundingClientRect().width : DEFAULT_PREVIEW_WIDTH);
    }

    private setPreviewWidth(px: number) {
        // keep room for the section rail and a usable form
        const max = Math.max(MIN_PREVIEW_WIDTH, window.innerWidth - 760);
        this.previewWidth = Math.round(Math.min(max, Math.max(MIN_PREVIEW_WIDTH, px)));
    }

    toggleHelp() {
        this.showHelp = !this.showHelp;
        if (!this.showHelp) {
            localStorage.setItem(HELP_SEEN_KEY, 'yes');
        }
    }

    get sectionHelpOpen(): boolean {
        return this.sectionHelpFor === this.active;
    }

    get sectionHelp(): { what: string; tip: string } | undefined {
        return SECTION_HELP[this.active];
    }

    toggleSectionHelp() {
        this.sectionHelpFor = this.sectionHelpOpen ? '' : this.active;
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.showHelp) {
            this.toggleHelp();
        }
        this.sectionHelpFor = '';
    }

    get activeSection(): Section {
        return this.sections.find(s => s.id === this.active) ?? this.sections[0];
    }

    get errorCount(): number {
        return this.issues.filter(i => i.level === 'error').length;
    }

    get warnCount(): number {
        return this.issues.filter(i => i.level === 'warn').length;
    }

    issuesFor(section: string): ValidationIssue[] {
        return this.issues.filter(i => i.section === section);
    }

    /** Issues with no field tag in the form. Those list in the banner; field issues show on their label instead. */
    bannerIssues(section: string): ValidationIssue[] {
        return this.issues.filter(i => i.section === section && !(i.field && TAGGED_FIELDS.has(i.field)));
    }

    /** The label tag for `field`: a short message for the label and the full text for its tooltip. */
    tagFor(field: string): { short: string; full: string } | null {
        const issue = this.issues.find(i => i.field === field);
        if (!issue) {
            return null;
        }
        // drop a leading identifier ("routerConnectChurnLimit is not ...") since the label already names the field
        const short = issue.message.replace(/^[A-Za-z][\w.]*\s+(?=is |must |needs |has |contains )/, '');
        return {short, full: issue.message};
    }

    /** True when a validation error targets the model path `field` (relative to `cfg`). */
    bad(field: string): boolean {
        return this.issues.some(i => i.field === field && i.level === 'error');
    }

    badge(section: string): 'error' | 'warn' | 'ok' {
        const list = this.issuesFor(section);
        if (list.some(i => i.level === 'error')) {
            return 'error';
        }
        return list.length ? 'warn' : 'ok';
    }

    /** Jump to the first section (in rail order) with an error, or a warning when there are no errors. */
    goToFirstIssue() {
        const level = this.errorCount ? 'error' : 'warn';
        const target = this.sections.find(s => this.issues.some(i => i.section === s.id && i.level === level));
        if (!target) {
            return;
        }
        this.select(target.id);
        // wait for the section to render, then focus the offending field or show the message list
        setTimeout(() => {
            const root: HTMLElement = this.host.nativeElement;
            const field = root.querySelector<HTMLElement>('.form-field-input.error');
            const el = field ?? root.querySelector<HTMLElement>('.cb-issues');
            el?.scrollIntoView({block: 'center', behavior: 'smooth'});
            if (field) {
                field.focus({preventScroll: true});
            }
        });
    }

    select(id: string) {
        this.active = id;
    }

    next(delta: number) {
        const i = this.sections.findIndex(s => s.id === this.active) + delta;
        if (i >= 0 && i < this.sections.length) {
            this.active = this.sections[i].id;
        }
    }

    setMode(mode: DeployMode) {
        this.cfg.mode = mode;
        // HA requires an advertise address; seed one from the listener so switching modes does not start in error
        if (mode === 'ha' && !this.cfg.ctrl.advertiseAddress) {
            this.cfg.ctrl.advertiseAddress = this.cfg.ctrl.listener.replace('0.0.0.0', 'localhost');
        }
        this.refresh();
    }

    toggle(obj: any, key: string) {
        obj[key] = !obj[key];
        this.refresh();
    }

    toggleSub(logger: { subscriptions: string[] }, sub: string) {
        const i = logger.subscriptions.indexOf(sub);
        if (i >= 0) {
            logger.subscriptions.splice(i, 1);
        } else {
            logger.subscriptions.push(sub);
        }
        this.refresh();
    }

    addListener() {
        const n = this.cfg.web.length + 1;
        this.cfg.web.push({
            name: `listener-${n}`,
            bindPoints: [{interface: '0.0.0.0:' + (1280 + n - 1), address: 'localhost:' + (1280 + n - 1)}],
            apis: {'health-checks': true},
            spaPath: 'zac',
            spaLocation: '/opt/openziti/share/console',
        });
        this.refresh();
    }

    removeListener(i: number) {
        this.cfg.web.splice(i, 1);
        this.refresh();
    }

    addBindPoint(w: { bindPoints: any[] }) {
        w.bindPoints.push({interface: '0.0.0.0:443', address: 'localhost:443'});
        this.refresh();
    }

    addIdentityBindPoint(w: { bindPoints: any[] }) {
        w.bindPoints.push({
            interface: '',
            address: '',
            identity: {source: 'file', value: '', service: '', clientAuth: '', bindUsingEdgeIdentity: false},
        });
        this.refresh();
    }

    removeBindPoint(w: { bindPoints: any[] }, i: number) {
        w.bindPoints.splice(i, 1);
        this.refresh();
    }

    addLogger() {
        this.cfg.events.push({
            name: `logger-${this.cfg.events.length + 1}`,
            subscriptions: ['circuit', 'router'],
            format: 'json',
            path: './logs/events.json',
        });
        this.refresh();
    }

    removeLogger(i: number) {
        this.cfg.events.splice(i, 1);
        this.refresh();
    }

    /** Switch between controller and router. Starts a fresh config of that kind. */
    setKind(kind: ConfigKind) {
        if (kind === this.kind) {
            return;
        }
        if (this.dirty && !window.confirm('Discard unsaved changes and start a new config?')) {
            return;
        }
        this.reset(kind);
    }

    addCtrlEndpoint() {
        this.rcfg.ctrl.endpoints.push('tls:ctrl2.example.com:6262');
        this.refresh();
    }

    removeCtrlEndpoint(i: number) {
        this.rcfg.ctrl.endpoints.splice(i, 1);
        this.refresh();
    }

    addSan(list: string[], value: string) {
        list.push(value);
        this.refresh();
    }

    removeSan(list: string[], i: number) {
        list.splice(i, 1);
        this.refresh();
    }

    setTunnelMode(mode: TunnelMode) {
        this.rcfg.tunnel.mode = mode;
        this.refresh();
    }

    /** Blank number inputs arrive as null/'' ; keep optional numbers null so they are omitted. */
    optNum(obj: any, key: string, value: any) {
        obj[key] = value === '' || value === null || value === undefined ? null : Number(value);
        this.refresh();
    }

    reset(kind: ConfigKind = this.kind) {
        this.kind = kind;
        this.active = this.sections[0].id;
        this.cfg = defaultConfig();
        this.rcfg = defaultRouterConfig();
        this.fileName = '';
        this.fileHandle = null;
        this.loadWarnings = [];
        this.notice = '';
        this.refresh(false);
    }

    // ---- file in / out ----

    get canPickFiles(): boolean {
        return typeof (window as any).showOpenFilePicker === 'function';
    }

    async openFile() {
        if (!this.canPickFiles) {
            this.fileInput?.nativeElement.click();
            return;
        }
        try {
            const [handle] = await (window as any).showOpenFilePicker({
                types: [{description: 'YAML', accept: {'text/yaml': ['.yml', '.yaml']}}],
            });
            const file: File = await handle.getFile();
            this.ingest(await file.text(), file.name, handle);
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                this.loadError = String(e?.message ?? e);
            }
        }
    }

    async onFileInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.ingest(await file.text(), file.name, null);
        }
        input.value = '';
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.dragOver = true;
    }

    async onDrop(event: DragEvent) {
        event.preventDefault();
        this.dragOver = false;
        const item: any = event.dataTransfer?.items?.[0];
        // getAsFileSystemHandle yields a writable handle in Chromium; fall back to a plain File elsewhere
        const handle = item?.getAsFileSystemHandle ? await item.getAsFileSystemHandle() : null;
        const file: File | null = handle?.kind === 'file' ? await handle.getFile() : event.dataTransfer?.files?.[0] ?? null;
        if (file) {
            this.ingest(await file.text(), file.name, handle?.kind === 'file' ? handle : null);
        }
    }

    private ingest(text: string, name: string, handle: any) {
        this.loadError = '';
        try {
            const doc = parseConfigText(text);
            const detected = detectKind(doc);
            // an undecidable file keeps the kind the user is already working in
            const kind: ConfigKind = detected === 'unknown' ? this.kind : detected;
            let warnings: string[];
            if (kind === 'router') {
                const r = routerFromDocument(doc);
                this.rcfg = r.cfg;
                warnings = r.warnings;
            } else {
                const r = fromYaml(text);
                this.cfg = r.cfg;
                warnings = r.warnings;
            }
            if (detected === 'unknown') {
                warnings = [`could not tell if this is a controller or router config; opened as ${kind}`, ...warnings];
            }
            this.kind = kind;
            this.fileName = name;
            this.fileHandle = handle;
            this.loadWarnings = warnings;
            this.active = this.sections[0].id;
            this.notice = `Loaded ${name}`;
            this.refresh(false);
        } catch (e: any) {
            this.loadError = `Could not read ${name}: ${e?.message ?? e}`;
        }
    }

    /** Write back to the opened file when the browser granted a handle; otherwise ask where to save. */
    async save() {
        if (!this.fileHandle) {
            return this.saveAs();
        }
        try {
            const h = this.fileHandle;
            if ((await h.queryPermission?.({mode: 'readwrite'})) !== 'granted') {
                if ((await h.requestPermission?.({mode: 'readwrite'})) !== 'granted') {
                    this.loadError = 'Write permission was denied';
                    return;
                }
            }
            const w = await h.createWritable();
            await w.write(this.yaml);
            await w.close();
            this.dirty = false;
            this.notice = `Saved ${this.fileName}`;
        } catch (e: any) {
            this.loadError = `Save failed: ${e?.message ?? e}`;
        }
    }

    async saveAs() {
        if (typeof (window as any).showSaveFilePicker !== 'function') {
            this.download();
            this.dirty = false;
            return;
        }
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: this.fileName || this.defaultFileName,
                types: [{description: 'YAML', accept: {'text/yaml': ['.yml', '.yaml']}}],
            });
            this.fileHandle = handle;
            this.fileName = handle.name;
            await this.save();
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                this.loadError = String(e?.message ?? e);
            }
        }
    }

    refresh(markDirty = true) {
        if (markDirty) {
            this.dirty = true;
            this.notice = '';
        } else {
            this.dirty = false;
        }
        if (this.kind === 'router') {
            this.issues = validateRouter(this.rcfg);
            this.yaml = routerToYaml(this.rcfg);
        } else {
            this.issues = validate(this.cfg);
            this.yaml = toYaml(this.cfg, this.verbose);
        }
        this.highlighted = this.highlight(this.yaml);
    }

    download() {
        const blob = new Blob([this.yaml], {type: 'text/yaml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName || this.defaultFileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    trackByIndex(i: number) {
        return i;
    }

    private escape(s: string): string {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /** Tiny YAML colorizer. Input is escaped first, so the resulting markup is safe to bind. */
    private highlight(yaml: string): string {
        return yaml.split('\n').map((line, i) => {
            const num = `<span class="cb-tok-ln">${i + 1}</span>`;
            const safe = this.escape(line);
            if (/^\s*#/.test(line)) {
                return `${num}<span class="cb-tok-c">${safe}</span>`;
            }
            const m = /^(\s*(?:-\s+)?)([A-Za-z0-9_.\-]+)(:)(\s.*)?$/.exec(safe);
            if (m) {
                const val = (m[4] || '').replace(/^(\s+)(.*)$/, (_x, sp, v) => sp + this.colorValue(v));
                return `${num}${m[1]}<span class="cb-tok-k">${m[2]}</span>${m[3]}${val}`;
            }
            const item = /^(\s*-\s+)(.*)$/.exec(safe);
            if (item) {
                return `${num}${item[1]}${this.colorValue(item[2])}`;
            }
            return `${num}${safe}`;
        }).join('\n');
    }

    private colorValue(v: string): string {
        if (/^&quot;|^"/.test(v) || /^".*"$/.test(v)) {
            return `<span class="cb-tok-s">${v}</span>`;
        }
        if (/^(true|false)$/.test(v)) {
            return `<span class="cb-tok-b">${v}</span>`;
        }
        if (/^-?\d+(\.\d+)?$/.test(v)) {
            return `<span class="cb-tok-n">${v}</span>`;
        }
        if (/\$\{[^}]+\}/.test(v)) {
            return `<span class="cb-tok-e">${v}</span>`;
        }
        return `<span class="cb-tok-s">${v}</span>`;
    }
}
