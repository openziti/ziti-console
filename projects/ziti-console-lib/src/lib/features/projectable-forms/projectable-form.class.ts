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

import {ExtendableComponent} from "../extendable/extendable.component";
import {
    Component,
    DoCheck,
    ElementRef,
    EventEmitter,
    Inject,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild
} from "@angular/core";

import {defer, isEqual, unset, debounce, cloneDeep, forEach, isArray, isEmpty, isObject, isNil, map, omitBy, slice} from "lodash";
import {GrowlerModel} from "../messaging/growler.model";
import {GrowlerService} from "../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../extendable/extensions-noop.service";
import {Identity} from "../../models/identity";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {ActivatedRoute, NavigationEnd, Router} from "@angular/router";
import {Subscription} from "rxjs";
import {Location} from "@angular/common";

// @ts-ignore
const {context, tags, resources, service, app} = window;

export class Entity {
    name: ''
}

@Component({
    template: '',
    styleUrls: ['./projectable-form.class.scss']
})
export abstract class ProjectableForm extends ExtendableComponent implements DoCheck, OnInit {
    @Input() isModal = false;
    @Input() entityId: String;
    @Input() abstract formData: any;
    @Output() abstract close: EventEmitter<any>;
    @Output() dataChange: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild('nameFieldInput') nameFieldInput: ElementRef;

    abstract clear(): void;
    abstract save(): void;

    public errors: any = {};
    protected entityType = 'identities';
    protected entityClass: any = Entity;
    protected isLoading = false;
    moreActions: any[] = [];
    tagElements: any = [];
    tagData: any = [];
    hideTags = false;
    initData: any = {};
    _dataChange = false;
    apiOptions = [{id: 'cli', label: 'Copy as CLI'}, {id: 'curl', label: 'Copy as CURL'}];
    basePath = '';
    previousRoute;
    showMore = false;

    checkDataChangeDebounced = debounce(this.checkDataChange, 100, {maxWait: 100});

    subscription: Subscription = new Subscription();

    protected constructor(
        protected growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) protected extService: ExtensionService,
        @Inject(ZITI_DATA_SERVICE) protected zitiService: ZitiDataService,
        protected router?: Router,
        protected route?: ActivatedRoute,
        protected location?: Location
    ) {
        super();
        this.previousRoute = this.router.getCurrentNavigation().previousNavigation?.finalUrl?.toString();
        this.subscription.add(
            this.route?.params?.subscribe(params => {
                const id = params['id'];
                if (!isEmpty(id)) {
                    this.entityId = id;
                }
            })
        );
        this.subscription.add(
            router.events.subscribe((event: any) => {
                if (event => event instanceof NavigationEnd) {
                    if (!event?.snapshot?.routeConfig?.path) {
                        return;
                    }
                    const pathSegments = event.snapshot.routeConfig.path.split('/');
                    this.basePath = pathSegments[0];
                }
            })
        );
    }

    override ngAfterViewInit() {
        super.ngAfterViewInit();
        this.errors = {};
        this.nameFieldInput.nativeElement.focus();
        if (this.extService?.moreActions) {
            this.moreActions = [...this.moreActions, ...this.extService.moreActions];
        }
    }

    ngOnInit() {
        if (this.entityId) {
            if (this.entityId === 'create') {
                this.formData = new this.entityClass();
                this.initData = cloneDeep(this.formData);
                this.entityUpdated();
                return;
            }
            this.isLoading = true;
            this.zitiService.getSubdata(this.entityType, this.entityId, '').then((entity: any) => {
                this.formData = entity?.data;
                this.initData = cloneDeep(this.formData);
                this.entityUpdated();
            }).finally(() => {
                this.isLoading = false;
            });
        }
    }

    showMoreChanged(showMore) {
        if (!showMore || this.hideTags) {
            return;
        }
        this.resetTags()
    }

    loadTags() {
        this.hideTags = localStorage.getItem("hideTags")=="yes";
        if (this.hideTags) {
            return;
        }
        service.call("tags", {}, this.tagsLoaded.bind(this));
    }

    tagsLoaded(results) {
        tags.data = results;
        context.set(tags.name, tags.data);
        tags.tagData = [];
        tags.data.forEach((tag) => {
            let html;
            if (tag.objects=="all" || tag.objects.indexOf(this.entityType)>=0) {
                tags.tagData[tags.tagData.length] = tag;
                html = this.getTagContent(tag);
                const tagEl = {
                    label: tag.label,
                    content: html
                }
                this.tagElements.push(tagEl)
            }
        });
    }

    resetTags() {
        unset(tags, 'map');
        if (this.hideTags) {
            return;
        }
        defer(() => {
            tags.reset(this.formData);
            tags.events();
        })
    }

    getTagContent(tag) {
        let html = '';
        if (tag.value=="string") {
            html += '<input id="Tag_'+tag.id+'" type="text" data-tag="'+tag.id+'" maxlength="500" placeholder="'+tag.description+'" />';
        } else if (tag.value=="boolean") {
            html += '<input id="Tag_'+tag.id+'" type="checkbox" data-tag="'+tag.id+'" />';
        } else if (tag.value=="map") {
            html += '<div id="Tag_'+tag.id+'_Map" data-map="'+tag.id+'" class="map"></div>';
            html += '<input id="Tag_'+tag.id+'" type="text" data-tag="'+tag.id+'" maxlength="500" placeholder="'+tag.description+'" />';
        } else if (tag.value=="avatar") {
            html += '<div class="formRow">';
            html += '<div id="Tag_'+tag.id+'" data-id="'+tag.id+'" data-resource="avatar" class="resource icon profile" title="'+tag.description+'" style="background-image: url('+tag.default+')"></div><div id="Tag_Resources_'+tag.id+'" class="resources" data-id="'+tag.id+'" data-resources="avatar"></div>';
            html += '<input id="Tag_'+tag.id+'_Hider" data-tag="'+tag.id+'" type="hidden"/>';
            resources.get(tag.id);
            context.addListener("resources-"+tag.id, tags.loaded);
        } else if (tag.value=="icon") {
            html += '<div class="formRow">';
            html += '<div id="Tag_'+tag.id+'" data-id="'+tag.id+'" data-resource="icon" class="resource icon" title="'+tag.description+'" style="background-image: url('+tag.default+')"></div><div id="Tag_Resources_'+tag.id+'" class="resources" data-id="'+tag.id+'" data-resources="icon"></div>';
            html += '<input id="Tag_'+tag.id+'_Hider" data-tag="'+tag.id+'" type="hidden"/>';
            resources.get(tag.id);
            context.addListener("resources-"+tag.id, tags.loaded);
        } else if (tag.value=="array") {
            html += '<div id="Tag_'+tag.id+'_Selected"></div>';
            html += '<input id="Tag_'+tag.id+'" type="text" data-tag="'+tag.id+'" data-array="'+tag.id+'" maxlength="500" placeholder="'+tag.description+'" />';
        }
        return html;
    }

    getTagValues() {
        return tags.val();
    }

    closeForm(refresh = true, ignoreChanges = false, data?, event?) {
        if (!ignoreChanges && this._dataChange) {
            const confirmed = confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
            if (!confirmed) {
                return;
            }
        }
        if (this.isModal) {
            this.closeModal(refresh, ignoreChanges);
        } else {
            this.returnToListPage();
        }
    }

    closeModal(refresh = true, ignoreChanges = false, data?, event?): void {
        this.close.emit({refresh: refresh});
        if (event) {
            event.stopPropagation();
        }
    }

    returnToListPage() {
        if (this.location && this.previousRoute) {
            this.location.back();
        } else {
            this.router?.navigateByUrl(`${this.basePath}`);
        }
    }

    ngDoCheck() {
        this.checkDataChangeDebounced();
    }

    protected checkDataChange() {
        let initData = cloneDeep(this.initData);
        initData = this.omitEmptyData(initData);
        let formData = cloneDeep(this.formData);
        formData = this.omitEmptyData(formData);
        const dataChange = !isEqual(initData, formData);
        if (dataChange !== this._dataChange) {
            this.dataChange.emit(dataChange);
        }
        this._dataChange = dataChange;
        app.isDirty = false;
    }

    omitEmptyData(object) {
        forEach(object, (val, key) => {
            if(this.omitDataIteratee(val)) {
                unset(object, key);
            } else if(isObject(val)) {
                this.omitEmptyData(val);
            }
        });
        return object;
    }

    omitDataIteratee(val) {
        return isNil(val) || (isArray(val) && isEmpty(val));
    }

    copyToClipboard(val) {
        navigator.clipboard.writeText(val);
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `Text Copied`,
            `API call URL copied to clipboard`,
        );
        this.growlerService.show(growlerData);
    }

    getRolesCLIVariable(selectedRoles) {
        let rolesVar = '';
        selectedRoles.forEach((role, index)=> {
            if (index > 0) {
                rolesVar += ',';
            }
            rolesVar += role;
        });
        return rolesVar;
    }

    getRolesCURLVariable(selectedRoles) {
        let rolesVar = '';
        selectedRoles.forEach((role, index)=> {
            if (index > 0) {
                rolesVar += ', ';
            }
            rolesVar += `"${role}"`;
        });
        rolesVar = `[${rolesVar}]`;
        return rolesVar;
    }

    canDeactivate() {
        if (this._dataChange) {
            return confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
        }
        return true;
    }

    protected entityUpdated() {
        //no-op
    }

    getRoleAttributes(type: string) {
        return this.zitiService.get(type, {}, []).then((results) => {
            return results.data;
        });
    }
}
