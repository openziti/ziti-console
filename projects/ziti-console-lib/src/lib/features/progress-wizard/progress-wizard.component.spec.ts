import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirewallConfigurationModalComponent } from './firewall-configuration-modal.component';

describe('FirewallConfigurationModal', () => {
  let component: FirewallConfigurationModalComponent;
  let fixture: ComponentFixture<FirewallConfigurationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirewallConfigurationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FirewallConfigurationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
