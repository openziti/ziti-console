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
import {VerifyCertificateService} from "./verify-certificate.service";
import {SchemaService} from "../../../../services/schema.service";
import {KEY_CODES, ProjectableForm} from "../../projectable-form.class";
import {GrowlerService} from "../../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../../extendable/extensions-noop.service";

import {cloneDeep, defer, delay, forOwn, keys, invert, isEmpty, isNil, unset, sortedUniq, debounce} from 'lodash';
import {GrowlerModel} from "../../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";
import {ValidationService} from "../../../../services/validation.service";
import {CertificateAuthority} from "../../../../models/certificate-authority";

@Component({
    selector: 'lib-certificate-authority',
    templateUrl: './verify-certificate.component.html',
    styleUrls: ['./verify-certificate.component.scss']
})
export class VerifyCertificateComponent extends ProjectableForm implements OnInit, OnDestroy {

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
    override entityType = 'cas';
    override entityClass = CertificateAuthority;

    locations = ['COMMON_NAME', 'SAN_URI', 'SAN_EMAIL'];
    matchers = ['ALL', 'PREFIX', 'SUFFIX', 'SCHEME'];
    parsers = ['NONE', 'SPLIT'];

    certificate = '';
    certErrorMessage = '';

    @ViewChild('fileSelect') filterInput: ElementRef;

    constructor(
        public svc: VerifyCertificateService,
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
        this.formData = new CertificateAuthority();
        if (this.subscription) this.subscription.unsubscribe();
    }

    override copyToClipboard(val) {
        navigator.clipboard.writeText(val);
        const growlerData = new GrowlerModel(
            'info',
            'Information',
            `Token Copied`,
            `Token copied to clipboard`,
        );
        this.growlerService.show(growlerData);
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
        this.svc.save(apiData, this.certificate).then((result) => {
            if (this.isModal) {
                this.closeModal(true, true);
                return;
            }
            this.initData = this.formData;
            this._dataChange = false;
            this.returnToListPage();
        }).catch((errorMessage) => {
            this.errors.certPem = true;
            this.certErrorMessage = errorMessage;
        }).finally(() => {
            this.isLoading = false;
        });
    }

    validate() {
        this.errors = {};
        const labels = [];
        const growlers = [];
        if (isEmpty(this.certificate)) {
            this.errors.certPem = true;
            this.certErrorMessage = 'Please enter or upload a valid certificate';
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `Missing Certificate`,
                this.certErrorMessage,
            ));
        }
        return isEmpty(this.errors);
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/verify-certificate' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {};
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
                        `Cert Invalid`,
                        `The file selected for the Certificate field is invalid. Please check your input and try again.`,
                    );
                    this.growlerService.show(growlerData);
                    this.certificate = 'Invalid cert. Please select or enter a valid certificate.';
                } else {
                    unset(this.errors, 'certPem');
                    this.certificate = textFromSelectedFile;
                }
            };
            fileReader.readAsText(file, "UTF-8");
        }
    }

}
