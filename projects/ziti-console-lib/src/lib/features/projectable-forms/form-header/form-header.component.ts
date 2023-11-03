import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-form-header',
  templateUrl: './form-header.component.html',
  styleUrls: ['./form-header.component.scss']
})
export class FormHeaderComponent {
  @Input() data: any = {};
  @Input() title = '';
  @Input() moreActions: any = [];
  @Input() formView = 'simple';

  @Output() formViewChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() actionRequested: EventEmitter<any> = new EventEmitter<any>();


  showActionsDropDown = false;

  constructor() {}

  requestAction(action, data?: any) {
    if (action === 'toggle-view') {
      if (data === 'simple') {
        this.formView = 'raw';
      } else {
        this.formView = 'simple';
      }
      data = this.formView;
      this.formViewChange.emit();
    }
    this.actionRequested.emit({name: action, data: data})
    this.showActionsDropDown = false;
  }

  showMoreActions() {
    this.showActionsDropDown = true;
  }

  closeActionsMoreActions() {
    this.showActionsDropDown = false;
  }
}
