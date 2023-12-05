import {Component, EventEmitter, Input, Output, OnInit, OnChanges, DoCheck} from '@angular/core';

@Component({
  selector: 'lib-preview-list',
  templateUrl: './preview-list.component.html',
  styleUrls: ['./preview-list.component.scss']
})
export class PreviewListComponent implements OnInit, OnChanges, DoCheck {
  @Input() hideOption: string;
  @Input() public label = '';
  @Input() public clickable = false;
  @Input() isLoading = false;
  @Input() allNames = [];
  @Output() itemSelected = new EventEmitter<string>();
  public names = [];
  filterFor = '';
  initLength = 0;

  ngOnInit() {
    this.names = [];
    this.names.push(...this.allNames);
    this.names = this.names.filter((item) => item !== this.hideOption);
    this.sort();
    this.initLength = this.allNames?.length || 0;
  }

  ngDoCheck() {
    if (this.initLength !== this.allNames.length) {
      this.ngOnChanges();
    }
  }

  ngOnChanges(changes?: any) {
    this.names = [];
    this.names.push(...this.allNames);
    this.names = this.names.filter((item) => item !== this.hideOption);
    this.sort();
    this.initLength = this.allNames.length || 0;
  }

  onKeydownEvent() {
    this.names = [];
    for (let i = 0; i < this.allNames.length; i++) {
      if (this.allNames[i].indexOf(this.filterFor) >= 0) {
        this.names.push(this.allNames[i]);
      }
    }
    this.sort();
  }

  sort() {
    this.names.sort((item1, item2) => item1.localeCompare(item2));
  }

  selected(name: string) {
    if (this.clickable) this.itemSelected.emit(name);
  }
}
