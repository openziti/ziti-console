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
    Component, ElementRef,
    EventEmitter, Inject,
    Input,
    OnDestroy,
    OnInit, Output,
    ViewChild,
} from '@angular/core';
import {AuthPolicyFormService} from "./auth-policy-form.service";
import {SchemaService} from "../../../services/schema.service";
import {KEY_CODES, ProjectableForm} from "../projectable-form.class";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";

import {cloneDeep, defer, delay, forOwn, keys, invert, isEmpty, isNil, unset, sortedUniq, debounce} from 'lodash';
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";
import {ValidationService} from "../../../services/validation.service";
import {AuthPolicy} from "../../../models/auth-policy";

@Component({
    selector: 'lib-configuration',
    templateUrl: './auth-policy-form.component.html',
    styleUrls: ['./auth-policy-form.component.scss'],
    standalone: false
})
export class AuthPolicyFormComponent extends ProjectableForm implements OnInit, OnDestroy {

    @Input() override errors: any = {};
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    allowedJwtSignerAttributes = [];

    formView = 'simple';
    options: any[] = [];
    isEditing = !isEmpty(this.formData.id);
    formDataInvalid = false;
    editMode = false;
    items: any = [];
    settings: any = {};
    fileSelectOpening = false;
    override entityType = 'auth-policies';
    override entityClass = AuthPolicy;

    jwtSignersFilterChangedDebounced = debounce(this.jwtSignerFilterChanged.bind(this), 200);

    @ViewChild('fileSelect') filterInput: ElementRef;

    constructor(
        public svc: AuthPolicyFormService,
        private schemaSvc: SchemaService,
        growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
        protected override router: Router,
        protected override route: ActivatedRoute,
        location: Location,
        private validationService: ValidationService
    ) {
        super(growlerService, extService, zitiService, router, route, location, settingsService);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.svc.getJwtSigners();
        this.svc.getJwtSignerNamedAttributes().then(() => {
            this.initSelectedAttributes();
        });
        this.settingsService.settingsChange.subscribe((results:any) => {
            this.settings = results;
        });
    }

    protected override entityUpdated() {
        super.entityUpdated();
    }

    ngOnDestroy(): void {
        this.clearForm();
    }

    headerActionRequested(event) {
        switch(event.name) {
            case 'save':
                this.save(event);
                break;
            case 'close':
                this.returnToListPage();
                break;
            case 'toggle-view':
                this.formView = event.data;
                break;
        }
    }

    override clear() {
        this.formData.configTypeId = '';
        this.clearForm();
    }

    clearForm() {
        this.items.forEach((item: any) => {
            if (item?.component) item.component.destroy();
        });
        this.errors = {};
        this.items = [];
        this.formData = new AuthPolicy();
        if (this.subscription) this.subscription.unsubscribe();
    }

    allowedJwtSignersChanged(event) {
        this.formData.primary.extJwt.allowedSigners = this.getSelectedAttributes(this.allowedJwtSignerAttributes, this.svc.jwtSignerNamedAttributesMap);
    }

    getSelectedAttributes(namedAttributes, namedAttributeMap) {
        const prependedNamedAttributes = namedAttributes.map((attr) => {
            return namedAttributeMap[attr];
        });
        return [...prependedNamedAttributes];
    }

    initSelectedAttributes() {
        const jwtSignerNamedAttributesMap = invert(this.svc.jwtSignerNamedAttributesMap);
        this.formData.primary?.extJwt?.allowedSigners?.forEach(attr => {
            this.allowedJwtSignerAttributes.push(jwtSignerNamedAttributesMap[attr]);
        });
    }

    async save(event?: any) {
        if(!this.validate()) {
            return;
        }
        const tagVals = this.getTagValues();
        if (!isEmpty(tagVals)) {
            forOwn(tagVals, (value, key) => {
                this.formData.tags[key] = value;
            });
        }
        const apiData = this.apiData;
        apiData.id = this.formData.id;
        this.isLoading = true;
        this.svc.save(apiData).then((result) => {
            if (this.isModal) {
                this.closeModal(true, true);
                return;
            }
            this.initData = this.formData;
            this._dataChange = false;
            this.returnToListPage();
        }).finally(() => {
            this.isLoading = false;
        });
    }

    validate() {
        this.errors = {};
        const labels = [];
        const growlers = [];
        if (isEmpty(this.formData.name)) {
            this.errors.name = true;
            labels.push('Name');
        }
        if (!isEmpty(this.errors)) {
            let missingFields = labels.join(', ');
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `Missing Form Data`,
                `Please enter a value for the highlighted fields: ${missingFields}`,
            ));
        }
        if (!isEmpty(growlers)) {
            growlers.forEach((growlerData) => {
                this.growlerService.show(growlerData);
            });
            return isEmpty(this.errors);
        }

        growlers.forEach((growlerData) => {
            this.growlerService.show(growlerData);
        });
        return isEmpty(this.errors);
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/auth-policies' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData.name || '',
            primary: this.formData.primary || {},
            secondary: this.formData.secondary || {},
            tags: this.formData.tags || {}
        };
        this._apiData = data;
        return this._apiData;
    }

    _apiData: any = {};
    set apiData(data) {
        this._apiData = data;
    }

    dataChanged(event) {
        this._apiData = cloneDeep(this.apiData);
    }

    toggleCertAllowed() {
        this.formData.primary.cert.allowed = !this.formData.primary.cert.allowed;
        if (!this.formData.primary.cert.allowed) {
            this.formData.primary.cert.allowExpiredCerts = false;
        }
    }

    toggleExtJwtAllowed() {
        this.formData.primary.extJwt.allowed = !this.formData.primary.extJwt.allowed;
    }

    toggleUpdbAllowed() {
        this.formData.primary.updb.allowed = !this.formData.primary.updb.allowed;
    }

    toggleAllowExpiredCerts() {
        this.formData.primary.cert.allowExpiredCerts = !this.formData.primary.cert.allowExpiredCerts;
    }

    toggleUpdbMixed() {
        this.formData.primary.updb.requireMixedCase = !this.formData.primary.updb.requireMixedCase;
    }

    toggleUpdbNumeric() {
        this.formData.primary.updb.requireNumericChar = !this.formData.primary.updb.requireNumericChar;
    }

    toggleUpdbSpecial() {
        this.formData.primary.updb.requireSpecialChar = !this.formData.primary.updb.requireSpecialChar;
    }

    toggleRequireTotp() {
        this.formData.secondary.requireTotp = !this.formData.secondary.requireTotp;
    }

    openFileSelect(event: any) {
        this.filterInput.nativeElement.click();
        this.fileSelectOpening = true;
        delay(() => {
            this.fileSelectOpening = false;
        }, 1000);
    }

    selectPemFile(event: any) {
        const file: File = event?.target?.files[0];

        if (file) {
            const fileReader = new FileReader();
            fileReader.onload = (fileLoadedEvent) => {
                const textFromSelectedFile: any = fileLoadedEvent.target?.result;
                if (!this.validationService.isValidPEM(textFromSelectedFile?.trim())) {
                    this.errors.certPem = true;
                    const growlerData = new GrowlerModel(
                        'error',
                        'Invalid',
                        `Cert PEM Invalid`,
                        `The file selected for the Cert PEM field is invalid. Please check your input and try again.`,
                    );
                    this.growlerService.show(growlerData);
                    this.formData.certPem = 'Invalid PEM. Please select or enter a valid PEM certificate.';
                } else {
                    unset(this.errors, 'certPem');
                    this.formData.certPem = textFromSelectedFile;
                }
            };
            fileReader.readAsText(file, "UTF-8");
        }
    }

    apiActionRequested(action) {
        switch (action.id) {
            case 'cli':
                this.copyCLICommand();
                break;
            case 'curl':
                this.copyCURLCommand();
                break;
        }
    }

    copyCLICommand() {
        const command = `ziti edge ${this.formData.id ? 'update' : 'create'} auth-policy ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' --primary-cert-allowed '${this.formData.primary.cert.allowed}' --primary-cert-expired-allowed '${this.formData.primary.cert.allowExpiredCerts}' --primary-ext-jwt-allowed '${this.formData.primary.extJwt.allowed}' --primary-ext-jwt-allowed-signers ${this.formData.primary.extJwt.allowedSigners.join(',') || ''} --primary-updb-allowed '${this.formData.primary.updb.allowed}' --primary-updb-lockout-min ${this.formData.primary.updb.lockoutDurationMinutes} --primary-updb-max-attempts ${this.formData.primary.updb.maxAttempts} --primary-updb-min-length ${this.formData.primary.updb.minPasswordLength} --primary-updb-req-mixed-case '${this.formData.primary.updb.requireMixedCase}' --primary-updb-req-numbers '${this.formData.primary.updb.requireNumberChar}' --primary-updb-req-special '${this.formData.primary.updb.requireSpecialChar}' --secondary-req-ext-jwt-signer '${this.formData.secondary.requireExtJwtSigner}' --secondary-req-totp '${this.formData.secondary.requireTotp}' --tags-json '${JSON.stringify(this.formData.tags)}'`;

        navigator.clipboard.writeText(command);
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `Text Copied`,
            `CLI command copied to clipboard`,
        );
        this.growlerService.show(growlerData);
    }

    copyCURLCommand() {
        const command = `curl '${this.apiCallURL}' \\
    ${this.formData.id ? '--request PATCH \\' : '\\'}
    -H 'accept: application/json' \\
    -H 'content-type: application/json' \\
    -H 'zt-session: ${this.settings.session.id}' \\
    --data-raw '${JSON.stringify(this.apiData)}'`;

        navigator.clipboard.writeText(command);
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `Text Copied`,
            `CURL command copied to clipboard`,
        );
        this.growlerService.show(growlerData);
    }

    scopesOnKeyup(event: any) {
        const key = event.key?.toLowerCase();
        if (key === " " || key === 'enter') {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target as HTMLElement;
            element.blur();
            element.focus();
        }
    }

    jwtSignerFilterChanged(event) {
        if (event?.keyCode === KEY_CODES.LEFT_ARROW || event?.keyCode === KEY_CODES.RIGHT_ARROW || event?.keyCode === KEY_CODES.UP_ARROW || event?.keyCode === KEY_CODES.DOWN_ARROW) {
            return;
        }
        let filters = [];
        if (event?.target?.value) {
            filters.push({
                columnId: 'name',
                value: event.target.value,
                label: event.target.value,
                filterName: 'Name',
                type: 'TEXTINPUT',
            });
        }
        this.svc.getJwtSigners(filters,1);
    }

    secondaryJwtSignerChanged(event) {
        this.svc.filteredJwtSigners = this.svc.jwtSigners.filter((jwtSigner) => {
            return jwtSigner.id === this.formData.secondary.requireExtJwtSigner;
        });
    }

    clearJwtSignerFilter(event) {
        const filters = [];
        this.svc.getJwtSigners(filters,1);
    }
}
