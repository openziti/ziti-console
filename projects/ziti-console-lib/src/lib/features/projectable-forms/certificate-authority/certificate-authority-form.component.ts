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
import {CertificateAuthorityFormService} from "./certificate-authority-form.service";
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
import {CertificateAuthority} from "../../../models/certificate-authority";

@Component({
    selector: 'lib-certificate-authority',
    templateUrl: './certificate-authority-form.component.html',
    styleUrls: ['./certificate-authority-form.component.scss']
})
export class CertificateAuthorityFormComponent extends ProjectableForm implements OnInit, OnDestroy {

    @Input() override formData: any = new CertificateAuthority();
    @Input() override errors: any = {};
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    _externalIdClaim = false;

    formView = 'simple';
    options: any[] = [];
    isEditing = !isEmpty(this.formData.id);
    formDataInvalid = false;
    editMode = false;
    items: any = [];
    settings: any = {};
    fileSelectOpening = false;
    identityRoleAttributes = [];
    badges: any[] = [];
    override entityType = 'cas';
    override entityClass = CertificateAuthority;

    locations = ['COMMON_NAME', 'SAN_URI', 'SAN_EMAIL'];
    matchers = ['ALL', 'PREFIX', 'SUFFIX', 'SCHEME'];
    parsers = ['NONE', 'SPLIT'];

    @ViewChild('fileSelect') filterInput: ElementRef;

    constructor(
        public svc: CertificateAuthorityFormService,
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
        this.svc.getIdentityRoleAttributes().then((results) => {
            this.identityRoleAttributes = results?.data || [];
        });
        this.settingsService.settingsChange.subscribe((results:any) => {
            this.settings = results;
        });
    }

    protected override entityUpdated() {
        if (this.formData.id && this.formData.isVerified || true) {
            this.badges.push({label: 'Verified', class: 'verified', circle: 'verified'});
        } else {
            this.badges.push({label: 'Unverified', class: 'unreg'});
        }
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

    externalIdClaimChanged() {
        if (this.externalIdClaim && !this.formData.externalIdClaim) {
            this.formData.externalIdClaim = {
                location: '',
                matcher: '',
                parser: '',
                index: 0,
                matcherCriteria: '',
                parserCriteria: ''
            }
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
        this.formData = new CertificateAuthority();
        if (this.subscription) this.subscription.unsubscribe();
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
        if (this.externalIdClaim) {
            if (isEmpty(this.claimLocation)) {
                this.errors.claimLocation = true;
                labels.push('Location');
            }
            if (isEmpty(this.parser)) {
                this.errors.parser = true;
                labels.push('Parser');
            }
            if (isEmpty(this.matcher)) {
                this.errors.matcher = true;
                labels.push('Matcher');
            }
            if (isEmpty(this.parserCriteria)) {
                this.errors.parserCriteria = true;
                labels.push('Parser Criteria');
            }
            if (isEmpty(this.matcherCriteria)) {
                this.errors.matcherCriteria = true;
                labels.push('Matcher Criteria');
            }
            if (isNaN(this.index) || this.index < 0) {
                this.errors.index = true;
                labels.push('Index');
            }
        }
        if (!this.validationService.isValidPEM(this.formData.certPem)) {
            this.errors.certPem = true;
            labels.push('Cert PEM');
        }
        if (!isEmpty(this.errors)) {
            let errorLabels = '';
            labels.forEach((label, index) => {
                errorLabels += `<li>${label}</li>`;
            });
            errorLabels = `<ul>${errorLabels}</ul>`;
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `Missing Form Data`,
                `Please enter a value for the highlighted fields: ${errorLabels}`,
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
        return this.settings.selectedEdgeController + '/edge/management/v1/cas' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData.name || '',
            isAutoCaEnrollmentEnabled: this.formData.isAutoCaEnrollmentEnabled,
            isOttCaEnrollmentEnabled: this.formData.isOttCaEnrollmentEnabled,
            identityRoles: this.formData.identityRoles || [],
            identityNameFormat: this.formData.identityNameFormat,
            isAuthEnabled: this.formData.isAuthEnabled,
            certPem: this.formData.certPem,

            tags: this.formData.tags || {}
        };
        if (this.externalIdClaim) {
            data.externalIdClaim =  this.formData.externalIdClaim;
        }
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

    get externalIdClaim() {
        if (this.formData.externalIdClaim) {
            this._externalIdClaim = true;
        }
        return this._externalIdClaim;
    }

    set externalIdClaim(val) {
        if (!val) {
            this.formData.externalIdClaim = undefined;
        }
        this._externalIdClaim = val;
    }

    toggleSwitch(prop) {
        if (prop === 'externalIdClaim') {
            this.externalIdClaim = !this.externalIdClaim;
        }
        this.formData[prop] = !this.formData[prop];
    }

    openFileSelect(event: any) {
        this.filterInput.nativeElement.click();
        this.fileSelectOpening = true;
        delay(() => {
            this.fileSelectOpening = false;
        }, 1000);
    }

    selectPemFile(event: any) {
        console.log(event);
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
        let command = `ziti edge ${this.formData.id ? 'update' : 'create'} ca ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' ${this.formData.id ? '' : this.formData.certPem} --identity-name-format '${this.formData.identityNameFormat}' --auth '${this.formData.isAuthEnabled}' --auth '${this.formData.isAuthEnabled}' --autoca '${this.formData.isAutoCaEnrollmentEnabled}' --ottca '${this.formData.isOttCaEnrollmentEnabled}'`;
        if (this.externalIdClaim) {
            command += ` --location '${this.formData.externalIdClaim.location}' --matcher '${this.formData.externalIdClaim.matcher}' --parser '${this.formData.externalIdClaim.parser}' --index '${this.formData.externalIdClaim.index}' --matcher-criteria '${this.formData.externalIdClaim.matcherCriteria}' --parser-criteria '${this.formData.externalIdClaim.parserCriteria}'`
        }

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

    verifyCertificate(event) {
        event.stopPropagation();
        event.preventDefault();
        this.router?.navigateByUrl(`${this.basePath}/${this.formData.id}/verify`);
    }

    get claimLocation() {
        return this.formData.externalIdClaim?.location;
    }

    set claimLocation(loc) {
        if (!this.formData.externalIdClaim) {
            return;
        }
        this.formData.externalIdClaim.location = loc;
    }

    get matcher() {
        return this.formData.externalIdClaim?.matcher;
    }

    set matcher(matcher) {
        if (!this.formData.externalIdClaim) {
            return;
        }
        this.formData.externalIdClaim.matcher = matcher;
    }

    get parser() {
        return this.formData.externalIdClaim?.parser;
    }

    set parser(parser) {
        if (!this.formData.externalIdClaim) {
            return;
        }
        this.formData.externalIdClaim.parser = parser;
    }

    get index() {
        return this.formData.externalIdClaim?.index;
    }

    set index(index) {
        if (!this.formData.externalIdClaim) {
            return;
        }
        this.formData.externalIdClaim.index = index;
    }

    get matcherCriteria() {
        return this.formData.externalIdClaim?.matcherCriteria;
    }

    set matcherCriteria(matcherCriteria) {
        if (!this.formData.externalIdClaim) {
            return;
        }
        this.formData.externalIdClaim.matcherCriteria = matcherCriteria;
    }

    get parserCriteria() {
        return this.formData.externalIdClaim?.parserCriteria;
    }

    set parserCriteria(parserCriteria) {
        if (!this.formData.externalIdClaim) {
            return;
        }
        this.formData.externalIdClaim.parserCriteria = parserCriteria;
    }
}
