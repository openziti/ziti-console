import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-preview-list',
  templateUrl: './preview-list.component.html',
  styleUrls: ['./preview-list.component.scss']
})
export class PreviewListComponent {
  @Input() hideOption: string;
  @Input() public label = '';
  @Input() public clickable = false;
  @Input() isLoading = false;
  @Input() allNames = [];
  @Output() itemSelected = new EventEmitter<string>();
  public names = [];
  filterFor = '';

  ngOnInit() {
    this.names = [];
    this.names.push(...this.allNames);
    this.names = this.names.filter((item) => item !== this.hideOption);
    this.sort();
  }

  ngOnChanges() {
    this.names = [];
    this.names.push(...this.allNames);
    this.names = this.names.filter((item) => item !== this.hideOption);
    this.sort();
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
