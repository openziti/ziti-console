import {ExtendableComponent} from "../extendable/extendable.component";
import {Component, EventEmitter, Input, Output} from "@angular/core";

import {defer, unset} from "lodash";

// @ts-ignore
const {context, tags, resources, service} = window;

@Component({
    template: '',
    styleUrls: ['./projectable-form.class.scss']
})
export abstract class ProjectableForm extends ExtendableComponent {
    @Input() abstract formData: any;
    @Output() abstract close: EventEmitter<any>;
    abstract errors: { name: string, msg: string }[];

    abstract clear(): void;
    abstract save(): void;

    protected entityType = 'identity';
    tagElements: any = [];
    tagData: any = [];
    hideTags = false;

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
}
