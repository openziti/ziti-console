import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetEnrollmentComponent } from './reset-enrollment.component';

describe('ResetEnrollmentComponent', () => {
  let component: ResetEnrollmentComponent;
  let fixture: ComponentFixture<ResetEnrollmentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ResetEnrollmentComponent]
    });
    fixture = TestBed.createComponent(ResetEnrollmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
