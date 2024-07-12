import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiActionButtonComponent } from './multi-action-button.component';

describe('SaveButtonComponent', () => {
  let component: MultiActionButtonComponent;
  let fixture: ComponentFixture<MultiActionButtonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MultiActionButtonComponent]
    });
    fixture = TestBed.createComponent(MultiActionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
