import {Component, Inject, Input} from '@angular/core';
import {ActivatedRoute, ActivatedRouteSnapshot, Router, UrlSegmentGroup} from '@angular/router';
import {ConfirmComponent} from "../confirm/confirm.component";
import {MatDialog} from "@angular/material/dialog";
import {LoginServiceClass, ZAC_LOGIN_SERVICE} from "../../services/login-service.class";
import {QuickAddComponent} from "../quick-add/quick-add.component";

@Component({
  selector: 'lib-header-bar',
  templateUrl: './header-bar.component.html',
  styleUrls: ['./header-bar.component.scss'],
  standalone: false
})
export class HeaderBarComponent {

  @Input() headerTitle = '';

  alertsOpen = false;
  supportOpen = false;
  profileOpen = false;
  profilePhoto = '';
  username = '';

  dialogRef: any = {};
  constructor(
    private router: Router,
    private dialogForm: MatDialog,
    @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
    private route: ActivatedRoute,
  ) {
  }

  openQuickAdd() {
    const data = {};
    this.dialogRef = this.dialogForm.open(QuickAddComponent, {
      data: data,
    });
    this.dialogRef.afterClosed().subscribe((result: any) => {
      const type = result?.type;
      switch (type) {
        case 'identity':
          break;
        default:
          break;
      }
    });
  }

  openAlerts() {}

  openSupport() {
    const currentSnapshot = this.route.snapshot;
    const routeParamId = currentSnapshot.params['id'];

    const primaryPathSegment = this.getPrimaryPathSegmentReliably();

    let url = '';
    switch (primaryPathSegment) {
      default:
        break;
    }
    //window.open(url, '_blank');
  }

  getPrimaryPathSegmentReliably(): string {
    // 1. Get the current URL as a UrlTree
    const urlTree = this.router.parseUrl(this.router.url);

    // 2. Access the primary segment group (always exists)
    const primaryGroup: UrlSegmentGroup = urlTree.root.children['primary'];

    if (!primaryGroup || primaryGroup.segments.length === 0) {
      return 'root'; // Handles the base URL case ('/')
    }

    // 3. Extract the path of the first segment
    return '/' + primaryGroup.segments[0].path;
  }

  openProfileMenu() {
    this.profileOpen = true;
  }

  closeProfileMenu() {
    this.profileOpen = false;
  }

  confirmLogout() {
    const data = {
      appendId: 'Logout',
      title: 'Logging out',
      message: `Are you sure you want to logout?`,
      confirmLabel: 'Yes',
      cancelLabel: 'Oops, no get me out of here',
      imageUrl: '/assets/svgs/Icon_Log_Logout.svg',
      showCancelLink: true
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: data,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.confirmed) {
        this.loginService.logout();
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
