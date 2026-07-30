import {Component, Inject, OnDestroy} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {SETTINGS_SERVICE} from '../../services/settings.service';
import {SettingsServiceClass} from '../../services/settings-service.class';
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {Subscription} from 'rxjs';
import {isEmpty} from 'lodash';

@Component({
    selector: 'lib-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    standalone: false
})
export class ProfileComponent implements OnDestroy {
  pageTitle = 'Profile';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordChangeDisabled = false;
  passwordChangeMessage = '';
  private settingsSubscription?: Subscription;

  constructor(
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
      private growlerService: GrowlerService,
  ) {
      this.updatePasswordChangeState();
      this.settingsSubscription = this.settingsService.settingsChange.subscribe(() => {
          this.updatePasswordChangeState();
      });
  }

  ngOnDestroy(): void {
      this.settingsSubscription?.unsubscribe();
  }

  private updatePasswordChangeState(): void {
      const authMode = this.settingsService?.settings?.session?.authMode;
      this.passwordChangeDisabled = authMode === 'oidc';
      this.passwordChangeMessage = this.passwordChangeDisabled
          ? 'Your password is managed by your identity provider and cannot be changed here.'
          : '';
  }

  resetPassword() {
    if (this.passwordChangeDisabled) {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          'Password Change Not Allowed',
          'Your password is managed by your identity provider and cannot be changed here.',
      );
      this.growlerService.show(growlerData);
      return;
    }
    if (!this.validate()) {
      return;
    }
    this.zitiService.resetPassword(this.currentPassword, this.newPassword, this.confirmPassword).then(() => {
      const growlerData = new GrowlerModel(
          'success',
          'Success',
          `Password Reset`,
          `Successfully reset user password`,
      );
      this.growlerService.show(growlerData);
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    }).catch((error) => {
      const message = this.zitiService.getErrorMessage(error);
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Password Reset Failed`,
          `Failed to reset password: ${message}`,
      );
      this.growlerService.show(growlerData);
    })
  }

  validate() {
    if (isEmpty(this.currentPassword) || isEmpty(this.newPassword) || isEmpty(this.confirmPassword)) {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Password Missing`,
          `You have missing fields in your submission. Check your input and try again.`,
      );
      this.growlerService.show(growlerData);
      return false;
    }
    if (this.newPassword !== this.confirmPassword) {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Password Mismatch`,
          `The values entered for Password and Confirm password do not match.`,
      );
      this.growlerService.show(growlerData);
      return false;
    }
    return true;
  }
}
