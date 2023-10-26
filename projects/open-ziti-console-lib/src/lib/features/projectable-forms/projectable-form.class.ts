import {ExtendableComponent} from "../extendable/extendable.component";
import {Component, EventEmitter, Input, Output} from "@angular/core";

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
}
