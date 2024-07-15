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
import {Component, DoCheck, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild} from "@angular/core";

import {defer, isEqual, unset, debounce} from "lodash";
import {GrowlerModel} from "../messaging/growler.model";
import {GrowlerService} from "../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../extendable/extensions-noop.service";

// @ts-ignore
const {context, tags, resources, service, app} = window;

@Component({
    template: '',
    styleUrls: ['./projectable-form.class.scss']
})
export abstract class ProjectableForm extends ExtendableComponent implements DoCheck {
    @Input() abstract formData: any;
    @Output() abstract close: EventEmitter<any>;
    @Output() dataChange: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild('nameFieldInput') nameFieldInput: ElementRef;

    abstract clear(): void;
    abstract save(): void;

    public errors: any = {};
    protected entityType = 'identity';

    moreActions: any[] = [];
    tagElements: any = [];
    tagData: any = [];
    hideTags = false;
    initData: any = {};
    _dataChange = false;
    apiOptions = [{id: 'cli', label: 'Copy as CLI'}, {id: 'curl', label: 'Copy as CURL'}];

    checkDataChangeDebounced = debounce(this.checkDataChange, 100, {maxWait: 100});

    protected constructor(
        protected growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) protected extService: ExtensionService
    ) {
        super();
    }

    override ngAfterViewInit() {
        super.ngAfterViewInit();
        this.errors = {};
        this.nameFieldInput.nativeElement.focus();
        if (this.extService?.moreActions) {
            this.moreActions = [...this.moreActions, ...this.extService.moreActions];
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

    closeModal(refresh = true, ignoreChanges = false, data?, event?): void {
        if (!ignoreChanges && this._dataChange) {
            const confirmed = confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
            if (!confirmed) {
                return;
            }
        }
        this.close.emit({refresh: refresh});
        if (event) {
            event.stopPropagation();
        }
    }

    ngDoCheck() {
        this.checkDataChangeDebounced();
    }

    protected checkDataChange() {
        const dataChange = !isEqual(this.initData, this.formData);
        if (dataChange !== this._dataChange) {
            this.dataChange.emit(dataChange);
        }
        this._dataChange = dataChange;
        app.isDirty = false;
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
}
