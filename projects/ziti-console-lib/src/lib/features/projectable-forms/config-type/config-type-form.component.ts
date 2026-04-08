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
import {ConfigTypeFormService} from "./config-type-form.service";
import {Subscription} from "rxjs";
import {SchemaService} from "../../../services/schema.service";
import {ProjectableForm} from "../projectable-form.class";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ConfigEditorComponent} from "../../config-editor/config-editor.component";

import {cloneDeep, defer, isEmpty, unset} from 'lodash';
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {ConfigType} from "../../../models/config-type";
import {Location} from "@angular/common";
import {ValidationService} from "../../../services/validation.service";

@Component({
    selector: 'lib-config-type-form',
    templateUrl: './config-type-form.component.html',
    styleUrls: ['./config-type-form.component.scss'],
    standalone: false
})
export class ConfigTypeFormComponent extends ProjectableForm implements OnInit, OnDestroy {

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

    override entityType = 'config-types';
    override entityClass = ConfigType;

    @ViewChild("configEditor", {read: ConfigEditorComponent}) configEditor!: ConfigEditorComponent;
    constructor(
        public svc: ConfigTypeFormService,
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

    override entityUpdated() {
        if (!isEmpty(this.formData) && isEmpty(this.formData?.schema)) {
            this.formData.schema = {};
        }
        this.selectedConfigTypeId = this.formData.configTypeId;
        this.initData = cloneDeep(this.formData);
        this.isEditing = !isEmpty(this.formData.id);
    }

    ngOnDestroy(): void {
        this.clearForm();
    }

    get configTypeEmpty() {
        return isEmpty(this.formData.configTypeId);
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
        const command = `ziti edge ${this.formData.id ? 'update' : 'create'} config-type ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' --schema '${JSON.stringify(this.formData.schema)}' --tags-json '${JSON.stringify(this.formData.tags)}'`;

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
        const configId = await this.svc.save(this.formData).then((result) => {
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
        if (isEmpty(this.formData.name)) {
            this.errors['name'] = true;
            labels.push('Name');
        }
        if (!this.validationService.isValidJSON(this.formData.schema)) {
            this.errors['schema'] = true;
            labels.push('Schema');
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
        return this.settings.selectedEdgeController + '/edge/management/v1/config-types' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData?.name || '',
            schema: this.formData?.schema || {},
            tags: this.formData?.tags
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

    get saveDisabled() {
        const reservedConfigTypes = ['host.v1', 'host.v2', 'intercept.v1', 'ziti-tunneler-client.v1', 'ziti-tunneler-server.v1'];
        return reservedConfigTypes.includes(this.formData.name);
    }

    get saveButtonTooltip() {
        if (this.saveDisabled) {
            return 'Can not edit this system config type';
        }
        return '';
    }
}
