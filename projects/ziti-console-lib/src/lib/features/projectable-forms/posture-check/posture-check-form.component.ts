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
    Component,
    EventEmitter, Inject,
    Input,
    OnDestroy,
    OnInit, Output,
    ViewChild,
} from '@angular/core';
import {PostureCheckFormService} from "./posture-check-form.service";
import {SchemaService} from "../../../services/schema.service";
import {ProjectableForm} from "../projectable-form.class";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";

import {cloneDeep, defer, isEmpty, unset, forEach} from 'lodash';
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";
import {ValidationService} from "../../../services/validation.service";
import {PostureCheck} from "../../../models/posture-check";

@Component({
    selector: 'lib-posture-check',
    templateUrl: './posture-check-form.component.html',
    styleUrls: ['./posture-check-form.component.scss']
})
export class PostureCheckFormComponent extends ProjectableForm implements OnInit, OnDestroy {

    @Input() override formData: any = {};
    @Input() override errors: any = {};
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    options: any[] = [];
    isEditing = !isEmpty(this.formData.id);
    formView = 'simple';
    formDataInvalid = false;
    editMode = false;
    items: any = [];
    selectedSchema: any = '';
    associatedServices = [];
    associatedServiceNames = [];
    servicesLoading = false;
    settings: any = {};
    selectedConfigTypeId = '';
    pcRoleAttributes = [];
    postureCheckTypes = [];
    androidOSEnabled = false;
    linuxOSEnabled = false;
    windowsOSEnabled = false;
    macOSEnabled = false;

    osTypes = [
        {name: 'Android', type: 'Android'},
        {name: 'iOS', type: 'iOS'},
        {name: 'Linux', type: 'Linux'},
        {name: 'macOS', type: 'macOS'},
        {name: 'Windows', type: 'Windows'},
        {name: 'Windows Server', type: 'WindowsServer'},
    ];

    osCheckData = {
        Android: {type: "Android", versions: [], enabled: false},
        iOS: {type: "iOS", versions: [], enabled: false},
        Linux: {type: "Linux", versions: [], enabled: false},
        macOS: {type: "macOS", versions: [], enabled: false},
        Windows: {type: "Windows", versions: [], enabled: false},
        WindowsServer: {type: "WindowsServer", versions: [], enabled: false},
    };

    override entityType = 'posture-checks';
    override entityClass = PostureCheck;

    constructor(
        public svc: PostureCheckFormService,
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
        this.getPostureCheckTypes();
        this.getIdentityRoleAttributes();
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.settingsService.settingsChange.subscribe((results:any) => {
            this.settings = results;
        });
    }

    override entityUpdated() {
        if (this.formData.typeId === 'OS' && this.formData.operatingSystems) {
            this.formData.operatingSystems.forEach((osData) => {
                this.osCheckData[osData.type] = osData;
                this.osCheckData[osData.type].enabled = true;
                this.osCheckData[osData.type].versions = this.osCheckData[osData.type].versions || [];
            });
        }
        if (this.formData.typeId === 'MAC') {
            this.formData.macAddresses = this.formData.macAddresses.map(address => {
                return address.match( /.{1,2}/g).join(':').toUpperCase();
            });
        }
        this.initData = cloneDeep(this.formData);
        this.isEditing = !isEmpty(this.formData.id);
    }

    ngOnDestroy(): void {
        this.clearForm();
    }

    getIdentityRoleAttributes() {
        this.getRoleAttributes('posture-check-role-attributes').then((attributes) => {
            this.pcRoleAttributes = attributes;
        });
    }

    getPostureCheckTypes() {
        return this.zitiService.get('posture-check-types', this.zitiService.DEFAULT_PAGING, []).then((result) => {
            const pcTypes = result?.data || [];
            pcTypes.push({id: 'MFA', name: 'Multi Factor'});
            this.postureCheckTypes = pcTypes.filter((pcType) => {
                return pcType.id !== 'PROCESS_MULTI';
            });
        }).catch((resp) => {
            const errorMessage = this.zitiService.getErrorMessage(resp);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error Getting Posture Check Types`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        });
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
        const command = `ziti edge ${this.formData.id ? 'update' : 'create'} posture-check ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' --schema '${JSON.stringify(this.formData.schema)}' --tags-json '${JSON.stringify(this.formData.tags)}'`;

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
        this.errors = {};
        if (!this.validate()) {
            this.isLoading = false;
            return;
        }
        const data = this.apiData;
        data.id = this.formData.id;
        const configId = await this.svc.save(data).then((result) => {
            if (!isEmpty(result?.id)) {
                this.formData = result;
                this.initData = cloneDeep(this.formData);
            }
            return result?.id;
        }).finally(() => {
            this.isLoading = false;
        });
        if (configId) {
            this.initData = this.formData;
            this._dataChange = false;
            if (this.isModal) {
                this.closeModal(true, true);
            } else {
                this.returnToListPage();
            }
        };
    }

    validate() {
        this.errors = {};
        const labels = [];
        if (isEmpty(this.apiData.name)) {
            this.errors['name'] = true;
            labels.push('Name');
        }
        if (this.apiData.typeId === 'MAC' && isEmpty(this.apiData.macAddresses)) {
            this.errors['macAddresses'] = true;
            labels.push('Mac Addresses');
        }
        if (!isEmpty(this.errors)) {
            let errorLabels = '';
            labels.forEach((label, index) => {
                errorLabels += `<li>${label}</li>`;
            });
            errorLabels = `<ul>${errorLabels}</ul>`;
            const growler = new GrowlerModel(
                'error',
                'Invalid',
                `Invalid Form Data`,
                `Please correct the highlighted fields: ${errorLabels}`,
            );
            this.growlerService.show(growler);
        }
        return isEmpty(this.errors);
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/posture-checks' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData?.name || '',
            typeId: this.formData?.typeId || {},
            tags: this.formData?.tags
        };
        switch (this.formData.typeId) {
            case 'MAC':
                data.macAddresses = this.formData.macAddresses;
                break;
            case 'OS':
                const operatingSystems = [];
                forEach(this.osCheckData, (os, key) => {
                    if (os.enabled) {
                        operatingSystems.push({type: os.type, versions: os.versions});
                    }
                });
                data.operatingSystems = operatingSystems;
                break;
            case 'DOMAIN':
                data.domains = this.formData.domains;
                break;
            case 'MFA':
                data.promptOnWake = this.formData.promptOnWake;
                data.promptOnUnlock = this.formData.promptOnUnlock;
                data.timeoutSeconds = this.formData.timeoutSeconds;
                break;
            case 'PROCESS_MULTI':
                data.process = this.formData.process;
                break;
        }
        this._apiData = data;
        return this._apiData;
    }

    _apiData: any = {};
    set apiData(data) {
        this._apiData = data;
    }

    toggleOS(os) {
        this.osCheckData[os].enabled = !this.osCheckData[os].enabled;
        this.osCheckData[os].versions = [];
    }

    toggleMFAPrompt(type) {
        switch (type) {
            case 'wake':
                this.formData.promptOnWake = !this.formData.promptOnWake;
                break;
            case 'unlock':
                this.formData.promptOnUnlock = !this.formData.promptOnUnlock;
                break;
        }
    }

    dataChanged(event) {
        this._apiData = cloneDeep(this.apiData);
    }

    preventEnterProp(event) {
        event.stopPropagation();
    }

    pcTypeChanged(event) {

    }

    macAddressesChange(event) {

    }
}
