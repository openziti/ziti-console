import {Component} from '@angular/core';

@Component({
    selector: 'lib-form-tabs',
    template: '<div class="ftabs" role="tablist"><ng-content></ng-content></div>',
    styleUrls: ['./form-tabs.component.scss'],
    standalone: false
})
export class FormTabsComponent {}
