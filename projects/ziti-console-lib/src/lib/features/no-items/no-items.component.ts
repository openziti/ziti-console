import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';

@Component({
  selector: 'lib-no-items',
  templateUrl: './no-items.component.html',
  styleUrls: ['./no-items.component.scss'],
})
export class NoItemsComponent implements OnChanges {
  @Input() image = 'No_Gateways';
  @Input() typeName = '';
  @Input() isEmpty = false;
  @Input() hasAdd = true;
  @Input() hiddenResults = false;
  @Input() isLoading = false;
  background;
  @Output() clickEmit = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<any>();

  constructor() {
  }

  ngOnChanges() {
    this.background = {
      'background-image': 'url(/assets/svgs/' + this.image + '.svg)',
    };
  }

  iconClick() {
    this.clickEmit.emit();
  }
}
