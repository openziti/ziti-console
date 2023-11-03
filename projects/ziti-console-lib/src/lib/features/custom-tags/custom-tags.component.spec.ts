import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTagsComponent } from './custom-tags.component';

describe('CustomTagsComponent', () => {
  let component: CustomTagsComponent;
  let fixture: ComponentFixture<CustomTagsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomTagsComponent]
    });
    fixture = TestBed.createComponent(CustomTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
