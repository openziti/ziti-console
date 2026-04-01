import {Inject, Injectable} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from '../../../services/ziti-data.service';
import { GrowlerService } from '../../../features/messaging/growler.service';
import { GrowlerModel } from '../../../features/messaging/growler.model';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  // Track original locations for change detection
  private originalLocations = new Map<string, string>();

  constructor(
    @Inject(ZITI_DATA_SERVICE) private zitiDataService: ZitiDataService,
    private growlerService: GrowlerService
  ) {}

  /**
   * Update geolocation tag locally (in-memory only, not saved to backend)
   */
  updateGeolocationLocal(item: any, lat: number, lng: number): void {
    const geolocationString = `${lat},${lng}`;

    // Prepare the updated tags
    const updatedTags = {
      ...item.tags,
      geolocation: geolocationString
    };

    // Update the item locally (no backend save)
    item.tags = updatedTags;
  }

  /**
   * Save geolocation changes to backend
   */
  async saveGeolocation(item: any, type: string, routerTypes?: Map<string, string>): Promise<void> {
    if (!item || !item.id) {
      throw new Error('Invalid item - missing id');
    }

    try {
      // Prepare the update payload with just the tags
      const updatePayload = {
        tags: item.tags
      };

      // Call the appropriate backend service
      if (type === 'routers') {
        // Determine router type (edge-router or transit-router)
        const routerType = routerTypes?.get(item.id) || item._routerType || 'edge-router';

        if (routerType === 'transit-router') {
          await this.zitiDataService.patch('transit-routers', updatePayload, item.id);
        } else {
          await this.zitiDataService.patch('edge-routers', updatePayload, item.id);
        }
      } else if (type === 'identity') {
        await this.zitiDataService.patch('identities', updatePayload, item.id);
      } else {
        throw new Error(`Unknown entity type: ${type}`);
      }

      // Update the original location to the new saved value
      if (item.tags?.geolocation) {
        this.originalLocations.set(item.id, item.tags.geolocation);
      }

      const successGrowler = new GrowlerModel(
        'success',
        'Location Saved',
        `Location for ${item.name} has been saved successfully`
      );
      this.growlerService.show(successGrowler);

    } catch (error) {
      const errorMessage = this.zitiDataService.getErrorMessage(error);
      const errorGrowler = new GrowlerModel(
        'error',
        'Save Failed',
        `Failed to save location: ${errorMessage}`
      );
      this.growlerService.show(errorGrowler);
      throw error;
    }
  }

  /**
   * Remove geolocation tag from entity
   */
  async removeGeolocation(item: any, type: string, routerTypes?: Map<string, string>): Promise<void> {
    if (!item || !item.id) {
      throw new Error('Invalid item - missing id');
    }

    // Remove geolocation tag and add temporary tag to work around API bug
    // (API has issues when removing the last tag from a resource)
    if (item.tags) {
      delete item.tags.geolocation;
      item.tags.temp = 'empty';
    } else {
      item.tags = { temp: 'empty' };
    }

    // Remove from original locations tracking
    this.originalLocations.delete(item.id);

    // Save the changes to persist the removal
    await this.saveGeolocation(item, type, routerTypes);
  }

  /**
   * Check if an entity has unsaved location changes
   */
  hasUnsavedChanges(item: any): boolean {
    if (!item || !item.id) return false;

    const originalLocation = this.originalLocations.get(item.id);
    const currentLocation = item.tags?.geolocation;

    // No original location means it's a new geolocation
    if (!originalLocation && currentLocation) {
      return true;
    }

    // Compare original vs current
    return originalLocation !== currentLocation;
  }

  /**
   * Track original location for an entity
   */
  trackOriginalLocation(item: any): void {
    if (item && item.id && item.tags?.geolocation) {
      if (!this.originalLocations.has(item.id)) {
        this.originalLocations.set(item.id, item.tags.geolocation);
      }
    }
  }

  /**
   * Parse geolocation tag into lat/lng coordinates
   */
  parseGeolocation(geolocationTag: string): { lat: number; lng: number } | null {
    if (!geolocationTag) return null;

    const [latStr, lngStr] = geolocationTag.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    return { lat, lng };
  }

  /**
   * Clear all tracked original locations
   */
  clearTrackedLocations(): void {
    this.originalLocations.clear();
  }
}
