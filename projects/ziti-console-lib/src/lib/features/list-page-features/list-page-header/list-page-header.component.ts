import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-list-page-header',
  templateUrl: './list-page-header.component.html',
  styleUrls: ['./list-page-header.component.scss']
})
export class ListPageHeaderComponent {
    @Input() title: string = '';
    @Input() tabs!: any[];
    @Input() showAdd = true;
    @Input() hideAction = false;
    @Output() actionClicked = new EventEmitter<string>();

    clickAction(value: string) {
        this.actionClicked.emit(value);
    }
}
