import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lib-link-panel',
  templateUrl: './link-panel.component.html',
  styleUrls: ['./link-panel.component.scss']
})
export class LinkPanelComponent {
  @Input() linkData: any = null;
  @Output() routerClicked = new EventEmitter<any>();

  /**
   * Parse connection type
   */
  parseConnectionType(type: string): string {
    if (!type) return 'Unknown';
    // Format connection type for display
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Parse connection endpoint (e.g., "tls:10.0.0.1:443")
   */
  parseEndpoint(endpoint: string): { protocol: string, address: string, port: string } {
    if (!endpoint) {
      return { protocol: 'N/A', address: 'N/A', port: 'N/A' };
    }

    const parts = endpoint.split(':');
    if (parts.length === 3) {
      return {
        protocol: parts[0],
        address: parts[1],
        port: parts[2]
      };
    } else if (parts.length === 2) {
      return {
        protocol: parts[0],
        address: parts[1],
        port: 'N/A'
      };
    }

    return { protocol: endpoint, address: 'N/A', port: 'N/A' };
  }

  /**
   * Handle router click
   */
  onRouterClick(router: any): void {
    this.routerClicked.emit(router);
  }
}
