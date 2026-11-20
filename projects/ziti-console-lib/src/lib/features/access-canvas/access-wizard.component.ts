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

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AcIdentity, AcModel} from './access-canvas.logic';
import {
    SERVICE_TEMPLATES, ServiceTemplate, USER_GROUPS, WizardCheck, WizardInput, WizardPlan,
    blankInput, plan, slugify, suggest, templateById, validate,
} from './access-wizard.logic';

type Step = 0 | 1 | 2 | 3;
const STEP_FIELDS: Record<Step, string[]> = {
    0: ['system', 'serviceName', 'interceptHost', 'interceptPort'],
    1: ['hostId', 'hostName', 'hostsAttr', 'hostAddress', 'hostPort'],
    2: ['usersAttr', 'newUserName', 'userIds'],
    3: [],
};

/** Four steps: the service, the identity that hosts it, who may use it, and a review. */
@Component({
    selector: 'lib-access-wizard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './access-wizard.component.html',
})
export class AccessWizardComponent implements OnInit {
    @Input({required: true}) model!: AcModel;
    @Input() newId: () => string = (() => { let n = 0; return () => `new-w${++n}`; })();
    @Output() queued = new EventEmitter<WizardPlan>();
    @Output() closed = new EventEmitter<void>();

    readonly steps = ['Service', 'Server', 'Users', 'Review'];
    readonly templates = SERVICE_TEMPLATES;
    readonly templateGroups = [...new Set(SERVICE_TEMPLATES.map(t => t.group))];
    step: Step = 0;
    w: WizardInput = blankInput();
    /** Fields the admin typed into, so later suggestions don't overwrite them. */
    private edited = new Set<string>();
    showErrors = false;
    result: WizardPlan | null = null;

    ngOnInit(): void { this.w = blankInput('ssh', ''); }

    // ------------------------------------------------------------------ choices
    templatesIn(group: string): ServiceTemplate[] { return this.templates.filter(t => t.group === group); }
    get template(): ServiceTemplate { return templateById(this.w.templateId); }

    get userGroups(): { attr: string; label: string; count: number }[] {
        const count = (a: string) => this.model.identities.filter(i => i.attrs.includes(a)).length;
        const known = USER_GROUPS.map(g => ({...g, count: count(g.attr)}));
        const existing = [...new Set(this.model.identities.filter(i => !i.isAdmin).flatMap(i => i.attrs))]
            .filter(a => !USER_GROUPS.some(g => g.attr === a)).sort()
            .map(a => ({attr: a, label: '#' + a, count: count(a)}));
        // Suggested for this kind of service first, then groups already in use, then the rest.
        const rank = (g: { attr: string; count: number }) => {
            const i = this.template.users.indexOf(g.attr);
            return i >= 0 ? i : g.count ? 10 : 20;
        };
        return [...known, ...existing].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
    }
    isSuggested(attr: string): boolean { return this.template.users.includes(attr); }

    /** Identities that could host or use it: not admins, routers are already excluded by the loader. */
    get people(): AcIdentity[] { return this.model.identities.filter(i => !i.isAdmin).sort((a, b) => a.name.localeCompare(b.name)); }

    // ------------------------------------------------------------------ input
    pickTemplate(id: string): void {
        this.w.templateId = id;
        this.resuggest();
    }
    onSystem(): void { this.resuggest(); }
    touch(field: string): void { this.edited.add(field); }

    /** Fill every field the admin hasn't edited from the system name and service type. */
    private resuggest(): void {
        const s = suggest(this.w.templateId, this.w.system);
        for (const [k, v] of Object.entries(s)) {
            if (!this.edited.has(k)) (this.w as any)[k] = v;
        }
        if (!this.edited.has('hostsAttr')) this.w.hostsAttr = `${this.w.serviceName}-hosts`;
    }
    onServiceName(): void {
        this.touch('serviceName');
        if (!this.edited.has('hostsAttr')) this.w.hostsAttr = `${this.w.serviceName}-hosts`;
    }
    setHostMode(mode: 'new' | 'existing'): void {
        this.w.hostMode = mode;
        if (mode === 'existing' && !this.w.hostId) {
            // Prefer an identity named after the system, e.g. loft-50 for loft-50-ssh.
            const sys = slugify(this.w.system);
            this.w.hostId = this.people.find(i => i.name === sys)?.id || '';
        }
    }
    setUserMode(mode: 'new' | 'existing'): void { this.w.userMode = mode; }
    toggleUser(id: string): void {
        const s = new Set(this.w.userIds);
        s.has(id) ? s.delete(id) : s.add(id);
        this.w.userIds = [...s];
    }
    usersInGroup(): AcIdentity[] { return this.people.filter(i => i.attrs.includes(this.w.usersAttr)); }
    get usersInGroupNames(): string { return this.usersInGroup().map(i => i.name).join(', '); }
    clean(field: 'hostsAttr' | 'usersAttr' | 'newUserName' | 'hostName' | 'serviceName'): void {
        (this.w as any)[field] = slugify((this.w as any)[field]);
    }

    // ------------------------------------------------------------------ steps
    get checks(): WizardCheck[] { return validate(this.model, this.w); }
    errorFor(field: string): string {
        if (!this.showErrors) return '';
        return this.checks.find(c => c.field === field)?.message || '';
    }
    stepErrors(step: Step): WizardCheck[] { return this.checks.filter(c => STEP_FIELDS[step].includes(c.field)); }

    next(): void {
        if (this.stepErrors(this.step).length) { this.showErrors = true; return; }
        this.showErrors = false;
        if (this.step < 3) this.step = (this.step + 1) as Step;
        if (this.step === 3) this.result = plan(this.model, this.w, this.newId);
    }
    back(): void { if (this.step > 0) { this.step = (this.step - 1) as Step; this.showErrors = false; } }
    goTo(step: number): void {
        // Only back to finished steps, or forward when everything before is valid.
        for (let s = 0; s < step; s++) if (this.stepErrors(s as Step).length) { this.step = s as Step; this.showErrors = true; return; }
        this.step = step as Step;
        if (this.step === 3) this.result = plan(this.model, this.w, this.newId);
    }
    finish(): void {
        if (this.checks.length) { this.showErrors = true; return; }
        this.queued.emit(plan(this.model, this.w, this.newId));
    }
}
