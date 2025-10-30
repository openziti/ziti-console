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

import {Component, Input} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'lib-regular-page-header',
  templateUrl: './regular-page-header.component.html',
  styleUrls: ['./regular-page-header.component.scss']
})
export class RegularPageHeaderComponent {
    @Input() title: string = '';
    @Input() tabs!: any[];

    constructor(private router: Router) {}

    tabSelected(tab) {
        return this.router.isActive(tab.url, {
            paths: 'exact',
            queryParams: 'ignored',
            fragment: 'ignored',
            matrixParams: 'ignored'
        });
    }
}
