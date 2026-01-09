import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPageHeaderComponent } from './-header.component';

describe('ListPageHeaderComponent', () => {
  let component: ListPageHeaderComponent;
  let fixture: ComponentFixture<ListPageHeaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListPageHeaderComponent]
    });
    fixture = TestBed.createComponent(ListPageHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
