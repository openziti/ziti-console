import { Injectable, EventEmitter } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConfirmComponent } from '../../../features/confirm/confirm.component';
import { GrowlerService } from '../../../features/messaging/growler.service';
import { GrowlerModel } from '../../../features/messaging/growler.model';
import { GeolocationService } from './geolocation.service';
import L from 'leaflet';

/**
 * Service responsible for managing map markers (identities and routers)
 * Handles marker creation, updates, selection, and user interactions
 */
@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {
  // Marker collections
  identityMarkers: any[] = [];
  routerMarkers: any[] = [];

  // Marker-to-ID mappings
  markerToIdentityId = new Map<any, string>();
  markerToRouterId = new Map<any, string>();

  // Track currently draggable marker
  currentDraggableMarker: any = null;

  // Track selected marker
  selectedMarker: any = null;

  // Track markers that are part of active circuits (for scaling)
  circuitMarkerIds = new Set<string>();

  // Events for communication with component
  markerClicked = new EventEmitter<{ item: any; type: string; location: { lat: number; lng: number } }>();
  geolocationRemoved = new EventEmitter<{ item: any; type: string; marker: any }>();
  geolocationUpdated = new EventEmitter<{ item: any; lat: number; lng: number; type: string }>();

  // Context menu cleanup function
  private contextMenuCleanup: (() => void) | null = null;
  private dialogRef: MatDialogRef<any> | null = null;

  constructor(
    private geolocationService: GeolocationService,
    private growlerService: GrowlerService,
    private dialogForm: MatDialog
  ) {}

  /**
   * Creates a Leaflet marker icon with dynamic styling
   * @param type - 'identity' or 'routers'
   * @param isSelected - Whether the marker is selected
   * @param scale - Scale factor for the icon (default 0.85)
   * @returns Leaflet icon object
   */
  createMarkerIcon(type: string, isSelected: boolean, scale: number = 0.85): any {
    // Use window.location.origin to ensure URLs use the correct protocol (http/https)
    const baseUrl = window.location.origin;
    let iconUrl: string;

    if (isSelected) {
      iconUrl = type === 'identity'
        ? `${baseUrl}/assets/svgs/identity-marker-selected.svg`
        : `${baseUrl}/assets/svgs/router-marker-selected.svg`;
    } else {
      iconUrl = type === 'identity'
        ? `${baseUrl}/assets/svgs/identity-marker.svg`
        : `${baseUrl}/assets/svgs/router-marker.svg`;
    }

    // Calculate scaled dimensions
    const iconSize: [number, number] = [40 * scale, 60 * scale];
    const iconAnchor: [number, number] = [20 * scale, 54 * scale];
    const popupAnchor: [number, number] = [0, -50 * scale];
    const tooltipAnchor: [number, number] = [16 * scale, -28 * scale];
    const shadowSize: [number, number] = [62 * scale, 62 * scale];

    return L.icon({
      iconUrl,
      iconRetinaUrl: iconUrl,
      shadowUrl: `${baseUrl}/assets/scripts/components/leaflet/images/marker-shadow.png`,
      iconSize,
      iconAnchor,
      popupAnchor,
      tooltipAnchor,
      shadowSize
    });
  }

  /**
   * Adds markers to the map for a collection of entities
   * @param data - Array of entities (identities or routers)
   * @param type - 'identity' or 'routers'
   * @param clusterGroup - Leaflet cluster group to add markers to
   * @param map - Leaflet map instance (fallback if no cluster group)
   * @param routerLocations - Map to store router locations
   * @param identityLocations - Map to store identity locations
   * @returns Array of created markers
   */
  addMarkers(
    data: any[],
    type: string,
    clusterGroup: any,
    map: any,
    routerLocations: Map<string, any>,
    identityLocations: Map<string, any>
  ): any[] {
    // Create icon at 85% scale for default state
    const icon = this.createMarkerIcon(type, false, 0.85);

    const markers = [];

    for (const item of data) {
      // Parse geolocation using service
      const coordinates = this.geolocationService.parseGeolocation(item.tags?.geolocation);

      if (!coordinates) {
        // No valid geolocation - skip marker creation
        continue;
      }

      const { lat, lng } = coordinates;

      // Store router and identity locations for circuit drawing
      if (type === 'routers') {
        routerLocations.set(item.id, { lat, lng, name: item.name });
      } else if (type === 'identity') {
        identityLocations.set(item.id, { lat, lng, name: item.name });
      }

      const marker = L.marker([lat, lng], {
        icon,
        draggable: false  // Start as not draggable
      });

      // Store item and type on the marker for later retrieval
      (marker as any)._itemData = item;
      (marker as any)._itemType = type;

      // Store original location for change tracking (before any modifications)
      this.geolocationService.trackOriginalLocation(item);

      // Add click handler to open side panel
      marker.on('click', (e: any) => {
        // Don't disable dragging when clicking the marker itself
        e.originalEvent.stopPropagation();

        // Get the current location from the marker's position (in case it was dragged)
        const currentLatLng = marker.getLatLng();

        this.markerClicked.emit({
          item: item,
          type: type,
          location: { lat: currentLatLng.lat, lng: currentLatLng.lng }
        });
      });

      // Add context menu on right-click - bind directly to marker
      marker.on('contextmenu', (event: any) => {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
        this.showMarkerContextMenu(event, marker, item, type, routerLocations, identityLocations);
        return false;
      });

      // Add drag end handler to update geolocation
      marker.on('dragend', (event: any) => {
        const newLatLng = event.target.getLatLng();
        this.geolocationUpdated.emit({
          item,
          lat: newLatLng.lat,
          lng: newLatLng.lng,
          type
        });

        // Re-apply the draggable styling in case it was removed during updates
        setTimeout(() => {
          const markerElement = marker.getElement();
          if (markerElement && this.currentDraggableMarker === marker) {
            const cssClass = type === 'identity' ? 'marker-draggable-active-identity' : 'marker-draggable-active-router';
            markerElement.classList.add(cssClass);
          }
        }, 100);

        // Emit click event to open side panel with updated location
        this.markerClicked.emit({
          item: item,
          type: type,
          location: { lat: newLatLng.lat, lng: newLatLng.lng }
        });
      });

      // Store marker-to-ID mapping
      if (type === 'identity') {
        this.markerToIdentityId.set(marker, item.id);
      } else if (type === 'routers') {
        this.markerToRouterId.set(marker, item.id);
      }

      // Add marker to appropriate cluster group if available, otherwise add to map
      if (clusterGroup) {
        clusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
      }

      markers.push(marker);
    }

    // Store markers in appropriate array
    if (type === 'identity') {
      this.identityMarkers = [...this.identityMarkers, ...markers];
    } else {
      this.routerMarkers = [...this.routerMarkers, ...markers];
    }

    return markers;
  }

  /**
   * Finds a marker by item ID and type
   * @param itemId - Entity ID
   * @param itemType - 'identity' or 'routers'
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   * @returns Marker object or null
   */
  findMarkerByItemId(itemId: string, itemType: string, identityClusterGroup: any, routerClusterGroup: any): any {
    // Check identity cluster group
    if (itemType === 'identity' && identityClusterGroup) {
      const markers = identityClusterGroup.getLayers();
      for (const marker of markers) {
        if ((marker as any)._itemData?.id === itemId) {
          return marker;
        }
      }
    }

    // Check router cluster group
    if (itemType === 'routers' && routerClusterGroup) {
      const markers = routerClusterGroup.getLayers();
      for (const marker of markers) {
        if ((marker as any)._itemData?.id === itemId) {
          return marker;
        }
      }
    }

    return null;
  }

  /**
   * Updates marker icon based on selection state and circuit membership
   * @param marker - Marker to update
   * @param isSelected - Whether the marker is selected
   */
  updateMarkerIcon(marker: any, isSelected: boolean): void {
    if (!marker) return;

    const itemType = (marker as any)._itemType;
    const itemId = (marker as any)._itemData?.id;

    // Use 100% scale (1.0) for selected markers or markers in active circuits
    // Use 85% scale (0.85) for other markers
    const isPartOfCircuit = itemId && this.circuitMarkerIds.has(itemId);
    const scale = (isSelected || isPartOfCircuit) ? 1.0 : 0.85;
    const newIcon = this.createMarkerIcon(itemType, isSelected, scale);

    marker.setIcon(newIcon);
  }

  /**
   * Applies opacity to all markers except the selected one
   * @param selectedMarker - The marker to keep at full opacity
   * @param opacity - Opacity value for non-selected markers (default 0.7)
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   */
  applyMarkerOpacity(selectedMarker: any, opacity: number = 0.7, identityClusterGroup: any, routerClusterGroup: any): void {
    // Apply opacity to identity markers
    if (identityClusterGroup) {
      const identityMarkers = identityClusterGroup.getLayers();
      identityMarkers.forEach((marker: any) => {
        if (marker !== selectedMarker) {
          const element = marker.getElement();
          if (element) {
            element.style.opacity = opacity.toString();
          }
        }
      });
    }

    // Apply opacity to router markers
    if (routerClusterGroup) {
      const routerMarkers = routerClusterGroup.getLayers();
      routerMarkers.forEach((marker: any) => {
        if (marker !== selectedMarker) {
          const element = marker.getElement();
          if (element) {
            element.style.opacity = opacity.toString();
          }
        }
      });
    }
  }

  /**
   * Resets opacity for all markers to full visibility
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   */
  resetMarkerOpacity(identityClusterGroup: any, routerClusterGroup: any): void {
    // Reset identity markers
    if (identityClusterGroup) {
      const identityMarkers = identityClusterGroup.getLayers();
      identityMarkers.forEach((marker: any) => {
        const element = marker.getElement();
        if (element) {
          element.style.opacity = '1';
        }
      });
    }

    // Reset router markers
    if (routerClusterGroup) {
      const routerMarkers = routerClusterGroup.getLayers();
      routerMarkers.forEach((marker: any) => {
        const element = marker.getElement();
        if (element) {
          element.style.opacity = '1';
        }
      });
    }
  }

  /**
   * Scales markers that are part of active circuits
   * @param scaleUp - Whether to scale up (true) or down (false)
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   */
  scaleCircuitMarkers(scaleUp: boolean, identityClusterGroup: any, routerClusterGroup: any): void {
    this.circuitMarkerIds.forEach(entityId => {
      // Find marker in identity cluster group
      if (identityClusterGroup) {
        const identityMarkers = identityClusterGroup.getLayers();
        for (const marker of identityMarkers) {
          if ((marker as any)._itemData?.id === entityId) {
            this.updateMarkerIcon(marker, false);
            break;
          }
        }
      }

      // Find marker in router cluster group
      if (routerClusterGroup) {
        const routerMarkers = routerClusterGroup.getLayers();
        for (const marker of routerMarkers) {
          if ((marker as any)._itemData?.id === entityId) {
            this.updateMarkerIcon(marker, false);
            break;
          }
        }
      }
    });
  }

  /**
   * Clears selected marker state and resets opacity
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   */
  clearSelectedMarker(identityClusterGroup: any, routerClusterGroup: any): void {
    if (this.selectedMarker) {
      this.updateMarkerIcon(this.selectedMarker, false);
      this.resetMarkerOpacity(identityClusterGroup, routerClusterGroup);
      this.selectedMarker = null;
    }
  }

  /**
   * Sets a marker as selected and applies visual effects
   * @param marker - Marker to select
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   */
  setSelectedMarker(marker: any, identityClusterGroup: any, routerClusterGroup: any): void {
    this.selectedMarker = marker;
    this.updateMarkerIcon(marker, true);
    this.applyMarkerOpacity(marker, 0.7, identityClusterGroup, routerClusterGroup);
  }

  /**
   * Removes a marker from the map and collections
   * @param marker - Marker to remove
   * @param type - 'identity' or 'routers'
   * @param identityClusterGroup - Identity cluster group
   * @param routerClusterGroup - Router cluster group
   * @param routerLocations - Router locations map
   * @param identityLocations - Identity locations map
   * @param itemId - Entity ID
   */
  removeMarker(
    marker: any,
    type: string,
    identityClusterGroup: any,
    routerClusterGroup: any,
    routerLocations: Map<string, any>,
    identityLocations: Map<string, any>,
    itemId: string
  ): void {
    // Remove the marker from the map
    if (type === 'identity') {
      identityClusterGroup.removeLayer(marker);
      this.identityMarkers = this.identityMarkers.filter((m: any) => m !== marker);
      identityLocations.delete(itemId);
    } else if (type === 'routers') {
      routerClusterGroup.removeLayer(marker);
      this.routerMarkers = this.routerMarkers.filter((m: any) => m !== marker);
      routerLocations.delete(itemId);
    }

    // If this was the draggable marker, clear it
    if (this.currentDraggableMarker === marker) {
      this.currentDraggableMarker = null;
    }
  }

  /**
   * Shows context menu for a marker with drag/drop and remove options
   * @param event - Leaflet event object
   * @param marker - Marker to show menu for
   * @param item - Entity data
   * @param type - 'identity' or 'routers'
   * @param routerLocations - Router locations map
   * @param identityLocations - Identity locations map
   */
  private showMarkerContextMenu(
    event: any,
    marker: any,
    item: any,
    type: string,
    routerLocations: Map<string, any>,
    identityLocations: Map<string, any>
  ): void {
    // Clean up previous context menu and its listeners
    if (this.contextMenuCleanup) {
      this.contextMenuCleanup();
      this.contextMenuCleanup = null;
    }

    const existingMenu = document.getElementById('marker-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'marker-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.originalEvent.clientX}px`;
    menu.style.top = `${event.originalEvent.clientY}px`;
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    menu.style.zIndex = '99999';
    menu.style.minWidth = '150px';
    menu.style.padding = '0.25rem 0';

    // Create "Enable Drag/Drop" menu item
    const menuItem = document.createElement('div');
    menuItem.textContent = 'Enable Drag/Drop';
    menuItem.style.padding = '0.5rem 1rem';
    menuItem.style.cursor = 'pointer';
    menuItem.style.color = '#333';
    menuItem.style.transition = 'background-color 0.2s ease';

    // Add hover effect
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f0f0f0';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    // Add click handler for drag/drop
    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();

      // Disable any previously draggable marker
      if (this.currentDraggableMarker && this.currentDraggableMarker !== marker) {
        this.currentDraggableMarker.dragging.disable();
        // Remove visual styling from previous marker
        const prevElement = this.currentDraggableMarker.getElement();
        if (prevElement) {
          prevElement.classList.remove('marker-draggable-active-identity');
          prevElement.classList.remove('marker-draggable-active-router');
        }
      }

      // Enable dragging on this marker
      marker.dragging.enable();
      this.currentDraggableMarker = marker;

      // Add visual styling to indicate drag mode (type-specific)
      const markerElement = marker.getElement();
      if (markerElement) {
        const cssClass = type === 'identity' ? 'marker-draggable-active-identity' : 'marker-draggable-active-router';
        markerElement.classList.add(cssClass);
      }

      // Clean up and remove menu
      if (this.contextMenuCleanup) {
        this.contextMenuCleanup();
        this.contextMenuCleanup = null;
      }
      menu.remove();
    });

    menu.appendChild(menuItem);

    // Create "Remove Geolocation" menu item
    const removeMenuItem = document.createElement('div');
    removeMenuItem.textContent = 'Remove Geolocation';
    removeMenuItem.style.padding = '0.5rem 1rem';
    removeMenuItem.style.cursor = 'pointer';
    removeMenuItem.style.color = '#d32f2f';
    removeMenuItem.style.transition = 'background-color 0.2s ease';
    removeMenuItem.style.borderTop = '1px solid #e0e0e0';

    // Add hover effect
    removeMenuItem.addEventListener('mouseenter', () => {
      removeMenuItem.style.backgroundColor = '#ffebee';
    });
    removeMenuItem.addEventListener('mouseleave', () => {
      removeMenuItem.style.backgroundColor = 'transparent';
    });

    // Add click handler for remove
    removeMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();

      // Clean up and close the context menu first
      if (this.contextMenuCleanup) {
        this.contextMenuCleanup();
        this.contextMenuCleanup = null;
      }
      menu.remove();

      // Show confirm dialog
      const confirmData = {
        appendId: 'RemoveGeolocation',
        title: 'Remove Geolocation',
        message: `Are you sure you want to remove the geolocation tag from <strong>${item.name}</strong>?<br><br>This will remove the marker from the map and the entity will appear in the unlocated entities list.`,
        confirmLabel: 'Yes, Remove',
        cancelLabel: 'Cancel',
        showCancelLink: true,
        imageUrl: '../../assets/svgs/Growl_Warning.svg',
      };

      this.dialogRef = this.dialogForm.open(ConfirmComponent, {
        data: confirmData,
        autoFocus: false,
      });

      this.dialogRef.afterClosed().subscribe({
        next: (result: any) => {
          if (!result?.confirmed) {
            return;
          }

          // Emit event to component to handle marker removal and location updates
          this.geolocationRemoved.emit({ item, type, marker });
        }
      });
    });

    menu.appendChild(removeMenuItem);

    // Add menu to document
    document.body.appendChild(menu);

    // Create cleanup function to remove menu and listeners
    const handleClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', handleClickOutside);
        this.contextMenuCleanup = null;
      }
    };

    // Add listener with slight delay to prevent immediate triggering
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    this.contextMenuCleanup = () => {
      menu.remove();
      document.removeEventListener('click', handleClickOutside);
    };
  }

  /**
   * Disables dragging on the current draggable marker
   */
  disableCurrentDraggableMarker(): void {
    if (this.currentDraggableMarker) {
      this.currentDraggableMarker.dragging.disable();

      // Remove visual styling
      const markerElement = this.currentDraggableMarker.getElement();
      if (markerElement) {
        markerElement.classList.remove('marker-draggable-active-identity');
        markerElement.classList.remove('marker-draggable-active-router');
      }

      this.currentDraggableMarker = null;
    }
  }

  /**
   * Clears all markers and resets state
   */
  clearAllMarkers(): void {
    this.identityMarkers = [];
    this.routerMarkers = [];
    this.markerToIdentityId.clear();
    this.markerToRouterId.clear();
    this.currentDraggableMarker = null;
    this.selectedMarker = null;
    this.circuitMarkerIds.clear();
  }
}
