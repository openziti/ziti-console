import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
    selector: 'lib-multi-action-button',
    templateUrl: './multi-action-button.component.html',
    styleUrls: ['./multi-action-button.component.scss'],
    standalone: false
})
export class MultiActionButtonComponent {

  @Input() actions: any[];
  @Output() actionRequested: EventEmitter<any> = new EventEmitter<any>();

  showMoreActions = false;

  showMoreActionsMenu() {
    this.showMoreActions = true;
  }

  closeMoreActionsMenu() {
    this.showMoreActions = false;
  }

  actionClicked(action) {
    this.actionRequested.emit(action);
  }
}
