import { Directive, TemplateRef } from '@angular/core';

@Directive({
    selector: 'ng-template[libFilterSelectOption]',
    standalone: false,
})
export class FilterSelectOptionTemplateDirective {
    constructor(public templateRef: TemplateRef<any>) {}
}

@Directive({
    selector: 'ng-template[libFilterSelectTrigger]',
    standalone: false,
})
export class FilterSelectTriggerTemplateDirective {
    constructor(public templateRef: TemplateRef<any>) {}
}

