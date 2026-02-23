import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ResetEnrollmentComponent } from './reset-enrollment.component';
import { DateTimePickerComponent } from '../date-time-picker/date-time-picker.component';
import { ResetEnrollmentService } from './reset-enrollment.service';
import { ZITI_DATA_SERVICE } from '../../services/ziti-data.service';

describe('ResetEnrollmentComponent', () => {
  let component: ResetEnrollmentComponent;
  let fixture: ComponentFixture<ResetEnrollmentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ResetEnrollmentComponent],
      imports: [FormsModule, OverlayModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, DateTimePickerComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { identity: {}, type: 'reset' } },
        { provide: MatDialogRef, useValue: { addPanelClass: () => {}, close: () => {} } },
        { provide: ZITI_DATA_SERVICE, useValue: {} },
        {
          provide: ResetEnrollmentService,
          useValue: {
            resetEnrollment: () => Promise.resolve(true),
            reissueEnrollment: () => Promise.resolve(true),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ResetEnrollmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
