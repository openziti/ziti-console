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

import {AfterViewInit, Component, ContentChild, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {ExtendableComponent} from "../../extendable/extendable.component";
import {ProjectableForm} from "../../projectable-forms/projectable-form.class";

export type CallbackResults = { passed: boolean, errors?: any }
export type ValidatorCallback = (data: any, payload?:any) => Promise<CallbackResults>;

@Component({
    selector: 'lib-list-page-form',
    template: `
        <div *ngIf="_show" class="fullModal" [ngClass]="formClass">
            <div class="buttonBall close icon-close" (click)="closeThisForm()">
                <div class="buttonLabel">ESC</div>
            </div>
            <div class="innerblock">
                <ng-container #beforetitleext></ng-container>
                <div class="title">{{title}}</div>
                <ng-container #aftertitleext></ng-container>
                <ng-container #beforesubtitleext></ng-container>
                <div class="subtitle">{{subTitle}}</div>
                <ng-container #aftersubtitleext></ng-container>
                <ng-content></ng-content>
                <ng-container #beforebuttonsext></ng-container>
                <div class="buttons" *ngIf="showButtons">
                    <div class="linkButton closer" (click)="closeThisForm()">Oops, No get me out of here</div>
                    <div id="SaveButton" class="button" (click)="updateItem()">Save</div>
                </div>
                <ng-container #afterbuttonsext></ng-container>
            </div>
        </div>
    `,
    styleUrls: ['./list-page-form.component.scss']
})
export class ListPageFormComponent extends ExtendableComponent implements AfterViewInit {

    @ContentChild('projectable') public contentChild!: ProjectableForm;
    @Input() title = 'Form Title';
    @Input() subTitle = 'Form Subtitle';
    @Input() buttonLabel = 'Create';
    @Input() showButtons = true;
    @Input() formClass: any | undefined;
    @Input() validator: ValidatorCallback | undefined;
    @Output() close = new EventEmitter<void>();
    @Output() afterOpen = new EventEmitter<void>();
    @Output() update = new EventEmitter<any>();
    @Output() showChange = new EventEmitter<boolean>()

    constructor() {
        super();
    }

    @Input() set data(d: any) {
        if (this.contentChild)
            this.contentChild.formData = d;
    }

    _show = false;

    @Input() set show(val: boolean) {
        if (val && !this._show) this.openThisForm();
    }

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
        this.closeThisForm();
    }

    override ngAfterViewInit() {
        super.ngAfterViewInit();
    }

    closeThisForm() {
        this.close.emit();
        this.contentChild?.clear();
        this._show = false;
        this.showChange.emit(false);
    }

    openThisForm() {
        this._show = true;
        this.afterOpen.emit();
    }

    updateItem() {
        if (this.validator) {
            this.validator(this.contentChild.formData)
                .then((results: CallbackResults) => {
                    if (results.passed) this.updateAndClose();
                    else this.contentChild.errors = results.errors;
                })
        } else this.updateAndClose();
    }

    updateAndClose() {
        this.update.emit(this.contentChild.formData);
        this.closeThisForm();
    }
}
