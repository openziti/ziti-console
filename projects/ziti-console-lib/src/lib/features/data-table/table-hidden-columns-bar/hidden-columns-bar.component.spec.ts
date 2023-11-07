import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HiddenColumnsBarComponent } from './hidden-columns-bar.component';

describe('FilterBarComponent', () => {
  let component: HiddenColumnsBarComponent;
  let fixture: ComponentFixture<HiddenColumnsBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HiddenColumnsBarComponent]
    });
    fixture = TestBed.createComponent(HiddenColumnsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
