/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ConsoleEventsService} from "../../services/console-events.service";

@Component({
    selector: 'lib-side-modal',
    templateUrl: './side-modal.component.html',
    styleUrls: ['./side-modal.component.scss'],
    standalone: false
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
