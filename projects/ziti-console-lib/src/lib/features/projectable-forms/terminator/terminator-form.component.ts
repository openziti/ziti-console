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
import {TerminatorFormService} from "./terminator-form.service";
import {Subscription} from "rxjs";
import {SchemaService} from "../../../services/schema.service";
import {ProjectableForm} from "../projectable-form.class";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ConfigEditorComponent} from "../../config-editor/config-editor.component";

import {cloneDeep, defer, forOwn, invert, isEmpty, isNil, unset} from 'lodash';
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Terminator} from "../../../models/terminator";
import {Location} from "@angular/common";

@Component({
    selector: 'lib-configuration',
    templateUrl: './terminator-form.component.html',
    styleUrls: ['./terminator-form.component.scss'],
    standalone: false
})
export class TerminatorFormComponent extends ProjectableForm implements OnInit, OnDestroy {

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
    selectedIdentityNamedAttribute;
    selectedServiceNamedAttribute;
    selectedRouterNamedAttribute;
    selectedIdentityId;
    selectedServiceId;
    selectedRouterId;
    override entityType = 'terminators';
    override entityClass = Terminator;

    constructor(
        public svc: TerminatorFormService,
        private schemaSvc: SchemaService,
        growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
        protected override router: Router,
        protected override route: ActivatedRoute,
        location: Location
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
        const promises = [];
        promises.push(this.svc.getServiceNamedAttributes());
        promises.push(this.svc.getIdentityNamedAttributes());
        promises.push(this.svc.getRouterNamedAttributes());
        Promise.all(promises).then(() => {
            this.initSelectedAttributes();
        });
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
        return isEmpty(this.errors);
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/terminators' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            service: this.selectedServiceId || '',
            router: this.selectedRouterId || '',
            identity: this.selectedIdentityId || '',
            binding: this.formData.binding || '',
            address: this.formData.address || '',
            identitySecret: this.formData.identitySecret || '',
            precedence: this.formData.precedence || '',
            cost: this.formData.cost || 0
        };
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

    initSelectedAttributes() {
        const serviceIdAttributesMap = invert(this.svc.serviceNamedAttributesMap);
        const identityIdAttributesMap = invert(this.svc.identityNamedAttributesMap);
        const routerIdAttributesMap = invert(this.svc.routerNamedAttributesMap);
        this.selectedServiceNamedAttribute = serviceIdAttributesMap[this.formData?.service.id];
        this.selectedIdentityNamedAttribute = identityIdAttributesMap[this.formData?.identity];
        this.selectedRouterNamedAttribute = routerIdAttributesMap[this.formData?.router.id];
        this.selectedServiceId = this.formData?.service.id;
        this.selectedIdentityId = this.formData?.identity;
        this.selectedRouterId = this.formData?.router.id;
        this.svc.selectedServiceNamedAttributes = [];
        if (this.selectedServiceNamedAttribute) {
            this.svc.selectedServiceNamedAttributes.push(this.selectedServiceNamedAttribute);
        }
        this.svc.selectedIdentityNamedAttributes = [];
        if (this.selectedIdentityNamedAttribute) {
            this.svc.selectedIdentityNamedAttributes.push(this.selectedIdentityNamedAttribute);
        }
        this.svc.selectedRouterNamedAttributes = [];
        if (this.selectedRouterNamedAttribute) {
            this.svc.selectedRouterNamedAttributes.push(this.selectedRouterNamedAttribute);
        }
    }

    serviceAttributeChanged(event?) {
        let selectedNamedAttributes = [];
        if (isEmpty(event)) {
            this.selectedServiceId = '';
        } else {
            this.selectedServiceId = this.svc.serviceNamedAttributesMap[event];
            selectedNamedAttributes = [event];
        }
        this.selectedServiceNamedAttribute = event;
        defer(() => {
            this.svc.selectedServiceNamedAttributes = selectedNamedAttributes;
        });
    }

    identityAttributeChanged(event?) {
        let selectedNamedAttributes = [];
        if (isEmpty(event)) {
            this.selectedIdentityId = '';
        } else {
            this.selectedIdentityId = this.svc.identityNamedAttributesMap[event];
            selectedNamedAttributes = [event];
        }
        this.selectedIdentityNamedAttribute = event;
        defer(() => {
            this.svc.selectedIdentityNamedAttributes = selectedNamedAttributes;
        });
    }

    routerAttributeChanged(event?) {
        let selectedNamedAttributes = [];
        if (isEmpty(event)) {
            this.selectedRouterId = '';
        } else {
            this.selectedRouterId = this.svc.routerNamedAttributesMap[event];
            selectedNamedAttributes = [event];
        }
        this.selectedRouterNamedAttribute = event;
        defer(() => {
            this.svc.selectedRouterNamedAttributes = selectedNamedAttributes;
        });
    }
}
