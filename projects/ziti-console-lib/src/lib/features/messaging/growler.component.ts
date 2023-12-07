import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {GrowlerModel} from "./growler.model";
import {GrowlerService} from "./growler.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'lib-growler',
  template: `
    <div *ngIf="show" [ngClass]="{ open: show }" class="growler {{ level }}" id="Growler">
      <div class="title">{{ title }}</div>
      <div class="subtitle">{{ subtitle }}</div>
      <div [innerHTML]="content" class="content"></div>
      <div class="icon"></div>
    </div>`,
  styleUrls: ['./growler.component.scss']
})
export class GrowlerComponent  implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() level = '';
  @Input() content = '';
  @Input() show = false;

  private growlerServiceSub: Subscription;

  constructor(private growlerService: GrowlerService) {

  }

  ngOnInit(): void {
    this.growlerServiceSub = this.growlerService.data$.subscribe((data) => {
      this.showGrowler(data);
    });
  }

  ngOnDestroy(): void {
    if(this.growlerServiceSub) this.growlerServiceSub.unsubscribe();
  }

  private showGrowler(data: GrowlerModel) {
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.level = data.level;
    this.content = data.content;
    this.show = true;
    setTimeout(() => {
      this.show = false;
    }, 5000);

  }
}
