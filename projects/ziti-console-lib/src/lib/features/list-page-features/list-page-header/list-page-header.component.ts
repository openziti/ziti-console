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
