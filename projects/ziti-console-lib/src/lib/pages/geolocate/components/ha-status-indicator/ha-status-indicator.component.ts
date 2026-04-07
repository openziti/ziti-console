import { Component, OnInit, OnDestroy } from '@angular/core';
import { HAControllerService, HAClusterStatus, HAController } from '../../../../services/ha-controller.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'lib-ha-status-indicator',
  standalone: false,
  templateUrl: './ha-status-indicator.component.html',
  styleUrls: ['./ha-status-indicator.component.scss']
})
export class HaStatusIndicatorComponent implements OnInit, OnDestroy {
  clusterStatus: HAClusterStatus | null = null;
  isExpanded = false;
  private subscription: Subscription | null = null;

  constructor(private haControllerService: HAControllerService) {}

  ngOnInit(): void {
    // Subscribe to cluster status updates
    this.subscription = this.haControllerService.clusterStatus$.subscribe(
      (status) => {
        this.clusterStatus = status;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  getControllerStatusClass(controller: HAController): string {
    return controller.isOnline ? 'controller-online' : 'controller-offline';
  }

  getControllerIcon(controller: HAController): string {
    return controller.isOnline ? 'check_circle' : 'error';
  }

  formatResponseTime(controller: HAController): string {
    if (controller.lastResponseTime === null || controller.lastResponseTime < 0) {
      return 'N/A';
    }
    return `${controller.lastResponseTime}ms`;
  }

  formatLastCheck(controller: HAController): string {
    if (!controller.lastHealthCheck) {
      return 'Never';
    }
    const now = new Date().getTime();
    const lastCheck = new Date(controller.lastHealthCheck).getTime();
    const seconds = Math.floor((now - lastCheck) / 1000);

    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  }

  get statusSummary(): string {
    if (!this.clusterStatus || !this.clusterStatus.enabled) {
      return 'HA Disabled';
    }
    return `${this.clusterStatus.onlineCount}/${this.clusterStatus.totalCount} Online`;
  }

  get statusIcon(): string {
    if (!this.clusterStatus || !this.clusterStatus.enabled) {
      return 'cloud_off';
    }
    if (this.clusterStatus.onlineCount === 0) {
      return 'cloud_off';
    }
    if (this.clusterStatus.onlineCount < this.clusterStatus.totalCount) {
      return 'cloud_queue';
    }
    return 'cloud_done';
  }

  get statusClass(): string {
    if (!this.clusterStatus || !this.clusterStatus.enabled) {
      return 'status-disabled';
    }
    if (this.clusterStatus.onlineCount === 0) {
      return 'status-error';
    }
    if (this.clusterStatus.onlineCount < this.clusterStatus.totalCount) {
      return 'status-warning';
    }
    return 'status-success';
  }
}
