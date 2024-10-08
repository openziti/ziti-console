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
import {JwtSignerFormService} from "./jwt-signer-form.service";
import {SchemaService} from "../../../services/schema.service";
import {ProjectableForm} from "../projectable-form.class";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";

import {cloneDeep, defer, delay, forOwn, keys, invert, isEmpty, isNil, unset} from 'lodash';
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {JwtSigner} from "../../../models/jwt-signer";
import {Location} from "@angular/common";
import {ValidationService} from "../../../services/validation.service";

@Component({
    selector: 'lib-configuration',
    templateUrl: './jwt-signer-form.component.html',
    styleUrls: ['./jwt-signer-form.component.scss']
})
export class JwtSignerFormComponent extends ProjectableForm implements OnInit, OnDestroy {

    @Input() override formData: any = {};
    @Input() override errors: any = {};
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    formView = 'simple';
    options: any[] = [];
    isEditing = !isEmpty(this.formData.id);
    formDataInvalid = false;
    editMode = false;
    items: any = [];
    settings: any = {};
    fileSelectOpening = false;
    override entityType = 'external-jwt-signers';
    override entityClass = JwtSigner;

    @ViewChild('fileSelect') filterInput: ElementRef;

    constructor(
        public svc: JwtSignerFormService,
        private schemaSvc: SchemaService,
        growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
        protected override router: Router,
        protected override route: ActivatedRoute,
        location: Location,
        private validationService: ValidationService
    ) {
        super(growlerService, extService, zitiService, router, route, location);
    }

    override ngOnInit(): void {
        super.ngOnInit();
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
        this.formData = {};
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
        if (isEmpty(this.formData.issuer)) {
            this.errors.issuer = true;
            labels.push('Issuer');
        }
        if (isEmpty(this.formData.certPem) && isEmpty(this.formData.jwksEndpoint)) {
            this.errors.certPem = true;
            this.errors.jwksEndpoint = true;
            labels.push('Cert PEM or JWKS Endpoint');
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
        if (!isEmpty(this.formData.certPem) && !isEmpty(this.formData.jwksEndpoint)) {
            this.errors.certPem = true;
            this.errors.jwksEndpoint = true;
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `Cert PEM or JWKS Endpoint`,
                `Only one of Cert PEM or JWKS Endpoint are allowed. Remove one and try again.`,
            ));
        }
        if (!isEmpty(this.formData.certPem?.trim()) && !this.validationService.isValidPEM(this.formData.certPem?.trim())) {
            this.errors.certPem = true;
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `Cert PEM Invalid`,
                `The value you have entered for the Cert PEM field is invalid. Please check your input and try again.`,
            ));
        }

        if (!isEmpty(this.formData.jwksEndpoint) && !this.validationService.isValidURI(this.formData.jwksEndpoint)) {
            this.errors.certPem = true;
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `JWKS Endpoint Invalid`,
                `The value you have entered for the JWKS Endpoint field is invalid. Please check your input and try again.`,
            ));
        }

        growlers.forEach((growlerData) => {
            this.growlerService.show(growlerData);
        });
        return isEmpty(this.errors);
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/external-jwt-signers' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData.name || '',
            audience: this.formData.audience || '',
            issuer: this.formData.issuer || '',
            certPem: this.formData.certPem || '',
            claimsProperty: this.formData.claimsProperty || '',
            enabled: this.formData.enabled,
            useExternalId: this.formData.useExternalId,
            externalAuthUrl: this.formData.externalAuthUrl || '',
            kid: this.formData.kid || '',
            tags: this.formData.tags || {}
        };
        if (!isEmpty(this.formData.jwksEndpoint)) {
            data.jwksEndpoint = this.formData.jwksEndpoint;
        }
        if (!isEmpty(this.formData.id)) {
            data.id = this.formData.id;
        }
        if (this.formData.id) {
            data.id = this.formData.id;
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

    toggleEnabled() {
        this.formData.enabled = !this.formData.enabled;
    }

    toggleUseExternalId() {
        this.formData.useExternalId = !this.formData.useExternalId;
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
        const command = `ziti edge ${this.formData.id ? 'update' : 'create'} ext-jwt-signer ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' ${this.formData.id ? '--issuer' : ''} '${this.formData.issuer}' --audience '${this.formData.audience}' --cert-pem '${this.formData.certPem}' --claims-property '${this.formData.claimsProperty}' --external-auth-url '${this.formData.externalAuthUrl}' --kid '${this.formData.kid}'`;

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
}
