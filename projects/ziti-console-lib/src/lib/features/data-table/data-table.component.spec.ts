import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataTableComponent } from './data-table.component';

describe('DataTableComponent', () => {
  let component: DataTableComponent;
  let fixture: ComponentFixture<DataTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DataTableComponent]
    });
    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
