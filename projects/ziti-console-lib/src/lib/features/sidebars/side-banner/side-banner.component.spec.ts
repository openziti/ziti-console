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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideBannerComponent } from './side-banner.component';

describe('SideBannerComponent', () => {
  let component: SideBannerComponent;
  let fixture: ComponentFixture<SideBannerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SideBannerComponent]
    });
    fixture = TestBed.createComponent(SideBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
