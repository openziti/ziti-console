import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForwardingConfigComponent } from './forwarding-config.component';

describe('ForwardingConfigComponent', () => {
  let component: ForwardingConfigComponent;
  let fixture: ComponentFixture<ForwardingConfigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ForwardingConfigComponent]
    });
    fixture = TestBed.createComponent(ForwardingConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
