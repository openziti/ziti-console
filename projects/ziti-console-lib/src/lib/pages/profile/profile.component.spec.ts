import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {RouterTestingModule} from '@angular/router/testing';
import {Subject} from 'rxjs';
import {ProfileComponent} from './profile.component';
import {SETTINGS_SERVICE} from '../../services/settings.service';
import {ZITI_DATA_SERVICE} from '../../services/ziti-data.service';
import {GrowlerService} from '../../features/messaging/growler.service';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;

  let settingsService: { settings: any; settingsChange: Subject<any> };

  const zitiService = {
    resetPassword: jasmine.createSpy('resetPassword').and.resolveTo({}),
    getErrorMessage: jasmine.createSpy('getErrorMessage').and.returnValue('test error')
  };

  const growlerService = {
    show: jasmine.createSpy('show')
  };

  beforeEach(async () => {
    settingsService = {
      settings: { session: {} },
      settingsChange: new Subject<any>()
    };

    await TestBed.configureTestingModule({
      declarations: [ProfileComponent],
      imports: [FormsModule, RouterTestingModule],
      providers: [
        { provide: SETTINGS_SERVICE, useValue: settingsService },
        { provide: ZITI_DATA_SERVICE, useValue: zitiService },
        { provide: GrowlerService, useValue: growlerService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('shows the password form for locally authenticated users', () => {
    settingsService.settings = { session: { authMode: 'legacy' } };
    settingsService.settingsChange.next(settingsService.settings);
    fixture.detectChanges();

    const passwordInputs = fixture.nativeElement.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Current Password');
  });

  it('hides the password form and shows an explanation for OIDC users', () => {
    settingsService.settings = { session: { authMode: 'oidc' } };
    settingsService.settingsChange.next(settingsService.settings);
    fixture.detectChanges();

    const passwordInputs = fixture.nativeElement.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('managed by your identity provider');
  });

  it('blocks password reset for OIDC users', () => {
    settingsService.settings = { session: { authMode: 'oidc' } };
    settingsService.settingsChange.next(settingsService.settings);
    fixture.detectChanges();

    component.resetPassword();

    expect(growlerService.show).toHaveBeenCalled();
    expect(zitiService.resetPassword).not.toHaveBeenCalled();
  });
});
