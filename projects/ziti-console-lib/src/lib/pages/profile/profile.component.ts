import {Component, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {isEmpty} from 'lodash';

@Component({
  selector: 'lib-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  pageTitle = 'Profile';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private growlerService: GrowlerService,
  ) {}

  resetPassword() {
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
    if (isEmpty(this.newPassword) || isEmpty(this.newPassword) || isEmpty(this.confirmPassword)) {
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
