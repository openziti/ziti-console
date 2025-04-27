import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegularPageHeaderComponent } from './regular-page-header.component';

describe('RegularPageHeaderComponent', () => {
  let component: RegularPageHeaderComponent;
  let fixture: ComponentFixture<RegularPageHeaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RegularPageHeaderComponent]
    });
    fixture = TestBed.createComponent(RegularPageHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
