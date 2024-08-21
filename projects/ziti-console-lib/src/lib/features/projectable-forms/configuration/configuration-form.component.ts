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
import {ConfigurationService} from "./configuration.service";
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
import {Config} from "../../../models/config";
import {Location} from "@angular/common";

@Component({
    selector: 'lib-configuration',
    templateUrl: './configuration-form.component.html',
    styleUrls: ['./configuration-form.component.scss']
})
export class ConfigurationFormComponent extends ProjectableForm implements OnInit, OnDestroy {

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

    override entityType = 'configs';
    override entityClass = Config;

    @ViewChild("configEditor", {read: ConfigEditorComponent}) configEditor!: ConfigEditorComponent;
    constructor(
        public svc: ConfigurationService,
        private schemaSvc: SchemaService,
        growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
        protected override router: Router,
        protected override route: ActivatedRoute,
        location: Location
    ) {
        super(growlerService, extService, zitiService, router, route, location);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.settingsService.settingsChange.subscribe((results:any) => {
            this.settings = results;
        });
    }

    override entityUpdated() {
        if (isEmpty(this.formData?.data)) {
            this.formData.data = {};
        }
        if (isEmpty(this.formData?.configTypeId)) {
            this.formData.configTypeId = '';
        }
        this.selectedConfigTypeId = this.formData.configTypeId;
        this.initData = cloneDeep(this.formData);
        this.svc.configJsonView = false;
        //this.getAssociatedServices();
        this.svc.getConfigTypes()
            .then(configTypes => {
                this.options = configTypes.sort();
                this.getSchema();
            });
        this.isEditing = !isEmpty(this.formData.id);
        if (this.configTypeEmpty) {
            this.formData.configTypeId = '';
        }
    }

    getAssociatedServices() {
        this.svc.getAssociatedServices(this.formData.id).then((result) => {
            this.associatedServices = result.associatedServices;
            this.associatedServiceNames = result.associatedServiceNames;
        });
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
        this.isLoading = true;
        try {
            this.configEditor.getConfigDataFromForm();
        } catch (err){
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error Getting Config Data`,
                'Error getting configuration data from from.',
            );
            this.growlerService.show(growlerData);
            throw err;
        }
        if (!this.validate()) {
            this.isLoading = false;
            return;
        }
        const configId = await this.svc.save(this.formData).then((result) => {
            if (!isEmpty(result?.id)) {
                this.formData = result;
                this.initData = this.formData;
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
        this.configEditor.validateConfig();
        if (isEmpty(this.formData.name)) {
            this.errors['name'] = true;
        }
        if (isEmpty(this.formData.configTypeId)) {
            this.errors['configTypeId'] = true;
        }
        if (!isEmpty(this.errors)) {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error Validating Config`,
                'The entered configuration is invalid. Please update missing/invalid fields and try again.',
            );
            this.growlerService.show(growlerData);
        }
        return isEmpty(this.errors);
    }
    get saveButtonTooltip() {
        if (this.formDataInvalid) {
            return 'Config data is invalid. Please update and try again.'
        } else {
            return 'Complete and attach config definition, or remove before saving';
        }
    }

    getSchema() {
        if (this.selectedConfigTypeId !== this.formData.configTypeId) {
            this.selectedConfigTypeId = this.formData.configTypeId;
            this.formData.data = {};
        }
        this.svc.getSchema(this.formData.configTypeId).then((result) => {
            this.selectedSchema = result;
        });
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/configs' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData?.name || '',
            configTypeId: this.formData?.configTypeId || '',
            data: this.formData?.data || {},
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
}
