import {Component, EventEmitter, Input, Output, ViewChild, ViewContainerRef} from '@angular/core';

@Component({
  selector: 'lib-object',
  template: `
    <div id="schema_{{parentage?parentage+'_':''}}{{_idName}}" class="wrapper" [ngStyle]="{'background-color': bcolor}">
      <div class="object-header-container">
        <div class="object-header-title">
          <label class="object-label" for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
          <div class="expand-toggle" [ngClass]="{open: open}" (click)="toggleOpen()"></div>
        </div>
        <div class="added-items-list" [hidden]="!open || !showAdd">
          <div class="object-list-items-container">
            <span class="none-added-label" *ngIf="!addedItems || addedItems.length <= 0">NONE ADDED...</span>
            <div (click)="itemClicked(item, i)" *ngFor="let item of addedItems; index as i" class="object-list-item clickable">
              <div class="icon-clear" (click)="removeItemClicked(item, i)"></div>
              <span class="preview-name" matTooltip="" matTooltipPosition="below">{{ _fieldName + '_item_' + i  }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="object-main-content" [hidden]="!open">
        <ng-container #wrappercontents></ng-container>
        <div *ngIf="showAdd" class="save-button button" (click)="addClicked()">Add</div>
      </div>
    </div>
  `,
  styleUrls: ['./object.component.scss']
})
export class ObjectComponent {
  @ViewChild("wrappercontents", {read: ViewContainerRef, static: true}) public wrapperContents!: ViewContainerRef;
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }
  @Input() itemData: any;
  @Input() parentage: string[] = [];
  @Input() bcolor = '#33aaff'
  @Input() labelColor = '#000000';
  @Input() showAdd = false;
  @Input() addedItems = [];
  @Input() open = false;
  @Output() itemAdded: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() itemSelected: EventEmitter<any> = new EventEmitter<any>();
  @Output() itemRemoved: EventEmitter<any> = new EventEmitter<any>();

  constructor() {
  }
  addClicked() {
    this.itemAdded.emit(true);
  }

  itemClicked(item, index) {
    this.itemSelected.emit(item);
  }

  toggleOpen() {
    this.open = !this.open;
  }

  removeItemClicked(item, index) {
    this.addedItems = this.addedItems.filter((addedItem, itemIndex) => {
      return index !== itemIndex;
    });
    this.itemRemoved.emit(item);
  }
}
