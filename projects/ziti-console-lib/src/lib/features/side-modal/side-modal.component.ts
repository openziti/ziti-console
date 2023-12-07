import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ConsoleEventsService} from "../../services/console-events.service";

@Component({
  selector: 'lib-side-modal',
  templateUrl: './side-modal.component.html',
  styleUrls: ['./side-modal.component.scss']
})
export class SideModalComponent implements OnInit {

  @Input() showClose = false;
  @Input() open = false;
  @Output() openChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(private consoleEvents: ConsoleEventsService) {}

  ngOnInit(): void {}

  close() {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
